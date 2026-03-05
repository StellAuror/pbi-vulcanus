/* ============================================================
   DAX CONTEXT VISUALIZER — App logic
   Depends on: PQEngine (shared/engine.js), DATASETS (shared/datasets.js)

   Interactive (no animation). User clicks column headers to
   select a filter modifier (REMOVEFILTERS, ALL, ALLSELECTED,
   KEEPFILTERS, or equation). The formula and result table
   update instantly.  Per-row measure values are recalculated
   according to the active modifiers.
   ============================================================ */
(function () {
"use strict";

/* ===========================================================
   1. SVG ICONS
   =========================================================== */
var EYE_SLASH_SVG = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8' +
  'a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8' +
  'a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

var RF_ICON_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/>' +
  '<line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

var FILTER_SVG = '<svg viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>';

/* ===========================================================
   2. MODIFIER DEFINITIONS
   =========================================================== */
var MODIFIER_DEFS = [
  { type: "REMOVEFILTERS", label: "REMOVEFILTERS", needsValue: false, cssVar: "--mod-removefilters" },
  { type: "ALL",           label: "ALL",           needsValue: false, cssVar: "--mod-all" },
  { type: "ALLSELECTED",   label: "ALLSELECTED",   needsValue: false, cssVar: "--mod-allselected" },
  { type: "KEEPFILTERS",   label: "KEEPFILTERS",   needsValue: true,  cssVar: "--mod-keepfilters" },
  { type: "equation",      label: "R\u00f3wnanie", needsValue: true,  cssVar: "--mod-equation" },
];

function getModDef(type) {
  for (var i = 0; i < MODIFIER_DEFS.length; i++) {
    if (MODIFIER_DEFS[i].type === type) return MODIFIER_DEFS[i];
  }
  return null;
}

/* ===========================================================
   3. DOM REFERENCES
   =========================================================== */
var $ = function (s) { return document.querySelector(s); };
var dataPresetEl = $("#dataPreset");
var panelSource  = $("#panelSource");
var panelFormula = $("#panelFormula");
var panelResult  = $("#panelResult");
var cntRows      = $("#cntRows");
var cntMods      = $("#cntMods");
var cntSum       = $("#cntSum");
var slicerBar    = $("#slicerBar");

/* ===========================================================
   4. STATE
   =========================================================== */
var state = {
  data: [],
  columns: [],        // all column names except measure
  measureCol: "",
  colModifiers: {},   // { colName: { type: string, value?: string } }
  slicerFilters: {},  // { colName: Set<string> }
};

/* ===========================================================
   5. HELPERS
   =========================================================== */
function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function formatNumber(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

function getDistinctValues(colName) {
  var seen = {};
  var values = [];
  for (var r = 0; r < state.data.length; r++) {
    var v = state.data[r][colName];
    var key = String(v);
    if (!seen[key]) {
      seen[key] = true;
      values.push(v);
    }
  }
  return values;
}

/* ===========================================================
   6. MODIFIER MENU (floating dropdown with value picker)
   =========================================================== */
var modMenu = null;
var modMenuCol = null;

function ensureModMenu() {
  if (modMenu) return;

  var el = document.createElement("div");
  el.className = "modifier-menu";

  var h = '<div class="mod-menu-title">Modyfikator filtru</div>';
  h += '<div class="mod-menu-opt mod-menu-none" data-type="">' +
       '<span class="mod-menu-x">\u2715</span> Brak (usu\u0144)</div>';
  for (var i = 0; i < MODIFIER_DEFS.length; i++) {
    var d = MODIFIER_DEFS[i];
    var arrow = d.needsValue ? ' <span class="mod-menu-arrow">\u25b8</span>' : '';
    h += '<div class="mod-menu-opt" data-type="' + d.type + '">' +
         '<span class="mod-menu-dot" style="background:var(' + d.cssVar + ');"></span>' +
         d.label + arrow + '</div>';
  }
  h += '<div class="mod-menu-values" style="display:none;"></div>';

  el.innerHTML = h;
  document.body.appendChild(el);
  modMenu = el;

  var opts = el.querySelectorAll(".mod-menu-opt");
  for (var oi = 0; oi < opts.length; oi++) {
    opts[oi].addEventListener("click", onModMenuOptClick);
  }

  document.addEventListener("mousedown", function (e) {
    if (modMenu && modMenu.style.display !== "none" &&
        !modMenu.contains(e.target) &&
        !e.target.closest("th.col-clickable")) {
      hideModMenu();
    }
  });
}

function onModMenuOptClick() {
  var type = this.getAttribute("data-type");
  var def = getModDef(type);

  if (type === "") {
    delete state.colModifiers[modMenuCol];
    hideModMenu();
    renderAll();
    return;
  }

  if (def && def.needsValue) {
    showValuePicker(type);
    var allOpts = modMenu.querySelectorAll(".mod-menu-opt");
    for (var i = 0; i < allOpts.length; i++) {
      allOpts[i].classList.toggle("selected", allOpts[i] === this);
    }
    return;
  }

  state.colModifiers[modMenuCol] = { type: type };
  hideModMenu();
  renderAll();
}

function showValuePicker(type) {
  var valuesDiv = modMenu.querySelector(".mod-menu-values");
  modMenu._pendingType = type;

  var values = getDistinctValues(modMenuCol);

  var existing = state.colModifiers[modMenuCol];
  var currentVal = (existing && existing.type === type && existing.value !== undefined)
    ? String(existing.value) : null;

  var h = '<div class="mod-menu-values-label">Wybierz warto\u015b\u0107:</div>';
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    var vs = String(v);
    var isActive = (vs === currentVal);
    h += '<div class="mod-menu-value' + (isActive ? ' active' : '') +
         '" data-val="' + escAttr(vs) + '">' + escHtml(vs) + '</div>';
  }
  valuesDiv.innerHTML = h;
  valuesDiv.style.display = "block";

  var valEls = valuesDiv.querySelectorAll(".mod-menu-value");
  for (var vi = 0; vi < valEls.length; vi++) {
    valEls[vi].addEventListener("click", onValueClick);
  }
}

function onValueClick() {
  var val = this.getAttribute("data-val");
  var type = modMenu._pendingType || "equation";
  state.colModifiers[modMenuCol] = { type: type, value: val };
  hideModMenu();
  renderAll();
}

function showModMenu(colName, thEl) {
  ensureModMenu();
  modMenuCol = colName;

  var rect = thEl.getBoundingClientRect();
  modMenu.style.top = (rect.bottom + 4) + "px";
  modMenu.style.left = Math.max(4, rect.left) + "px";
  modMenu.style.display = "block";

  modMenu.querySelector(".mod-menu-values").style.display = "none";
  modMenu._pendingType = null;

  var hasModifier = !!state.colModifiers[colName];
  modMenu.querySelector(".mod-menu-none").style.display = hasModifier ? "" : "none";

  var currentType = hasModifier ? state.colModifiers[colName].type : null;
  var allOpts = modMenu.querySelectorAll(".mod-menu-opt");
  for (var i = 0; i < allOpts.length; i++) {
    allOpts[i].classList.toggle("selected",
      allOpts[i].getAttribute("data-type") === currentType);
  }
}

function hideModMenu() {
  if (modMenu) {
    modMenu.style.display = "none";
    modMenuCol = null;
  }
}

/* ===========================================================
   7. COMPUTE — measure evaluation with modifier context
   =========================================================== */
function computeMeasure(baseFilters) {
  var mc = state.measureCol;

  var filters = {};
  for (var col in baseFilters) {
    if (baseFilters.hasOwnProperty(col)) {
      filters[col] = baseFilters[col];
    }
  }

  var modCols = Object.keys(state.colModifiers);
  for (var mi = 0; mi < modCols.length; mi++) {
    var col = modCols[mi];
    var mod = state.colModifiers[col];

    if (mod.type === "REMOVEFILTERS" || mod.type === "ALL") {
      delete filters[col];
    } else if (mod.type === "ALLSELECTED") {
      delete filters[col];
      if (state.slicerFilters[col]) {
        filters[col] = state.slicerFilters[col]; // Set
      }
    } else if (mod.type === "equation") {
      filters[col] = mod.value;
    } else if (mod.type === "KEEPFILTERS") {
      if (filters.hasOwnProperty(col)) {
        if (filters[col] !== mod.value) {
          return 0;
        }
      } else {
        filters[col] = mod.value;
      }
    }
  }

  var sum = 0;
  var filterCols = Object.keys(filters);
  for (var r = 0; r < state.data.length; r++) {
    var match = true;
    for (var fi = 0; fi < filterCols.length; fi++) {
      var f = filters[filterCols[fi]];
      var rowVal = state.data[r][filterCols[fi]];
      if (f instanceof Set) {
        if (!f.has(String(rowVal))) { match = false; break; }
      } else {
        if (rowVal !== f) { match = false; break; }
      }
    }
    if (match) sum += (state.data[r][mc] || 0);
  }
  return sum;
}

function computeResult() {
  var modCount = Object.keys(state.colModifiers).length;

  var rowMeasures = [];
  for (var r = 0; r < state.data.length; r++) {
    var baseFilters = {};
    for (var i = 0; i < state.columns.length; i++) {
      baseFilters[state.columns[i]] = state.data[r][state.columns[i]];
    }
    rowMeasures.push(computeMeasure(baseFilters));
  }

  var grandTotal = computeMeasure({});

  return {
    rows: state.data,
    rowMeasures: rowMeasures,
    total: grandTotal,
    count: state.data.length,
    modCount: modCount,
  };
}

/* ===========================================================
   8a. SLICER BAR
   =========================================================== */
function hasActiveSlicer() {
  for (var col in state.slicerFilters) {
    if (state.slicerFilters.hasOwnProperty(col) && state.slicerFilters[col].size > 0) return true;
  }
  return false;
}

function rowMatchesSlicer(row) {
  for (var col in state.slicerFilters) {
    if (!state.slicerFilters.hasOwnProperty(col)) continue;
    var s = state.slicerFilters[col];
    if (s.size === 0) continue;
    if (!s.has(String(row[col]))) return false;
  }
  return true;
}

function renderSlicerBar() {
  var cols = state.columns;
  if (!cols.length) { slicerBar.classList.remove("visible"); return; }
  slicerBar.classList.add("visible");

  var h = '<span class="slicer-group-label">Slicer</span>';
  for (var ci = 0; ci < cols.length; ci++) {
    var col = cols[ci];
    var vals = getDistinctValues(col);
    var activeSet = state.slicerFilters[col] || null;
    h += '<div class="slicer-group">';
    h += '<span class="slicer-group-label">' + escHtml(col) + ':</span>';
    for (var vi = 0; vi < vals.length; vi++) {
      var vs = String(vals[vi]);
      var isActive = activeSet && activeSet.has(vs);
      h += '<span class="slicer-chip' + (isActive ? ' active' : '') +
           '" data-col="' + escAttr(col) + '" data-val="' + escAttr(vs) + '">' +
           escHtml(vs) + '</span>';
    }
    h += '</div>';
  }
  slicerBar.innerHTML = h;

  var chips = slicerBar.querySelectorAll(".slicer-chip");
  for (var i = 0; i < chips.length; i++) {
    chips[i].addEventListener("click", onSlicerChipClick);
  }
}

function onSlicerChipClick() {
  var col = this.getAttribute("data-col");
  var val = this.getAttribute("data-val");
  if (!state.slicerFilters[col]) state.slicerFilters[col] = new Set();
  var s = state.slicerFilters[col];
  if (s.has(val)) s.delete(val); else s.add(val);
  if (s.size === 0) delete state.slicerFilters[col];
  renderAll();
}

/* ===========================================================
   8b. RENDER — Source table (clickable headers)
   =========================================================== */
function renderSourceTable() {
  var data = state.data;
  var allCols = state.columns.concat([state.measureCol]);

  var h = '<table class="data-table"><thead><tr><th>#</th>';
  for (var ci = 0; ci < allCols.length; ci++) {
    var c = allCols[ci];
    var isMeasure = (c === state.measureCol);
    var mod = state.colModifiers[c];

    if (isMeasure) {
      h += '<th>' + c + '</th>';
    } else {
      var thCls = "col-clickable";
      if (mod) thCls += " col-active-mod";
      h += '<th class="' + thCls + '" data-col="' + c + '">';
      h += c;
      if (mod) {
        var shortLabel = mod.type === "equation" ? "R\u00f3wn." : mod.type;
        h += ' <span class="col-mod-label">' + shortLabel + '</span>';
      }
      h += ' <span class="rf-icon">' + RF_ICON_SVG + '</span>';
      h += '</th>';
    }
  }
  h += '</tr></thead><tbody>';

  var slicerActive = hasActiveSlicer();
  for (var i = 0; i < data.length; i++) {
    var dimmed = slicerActive && !rowMatchesSlicer(data[i]);
    h += '<tr' + (dimmed ? ' class="slicer-dimmed"' : '') + '><td style="color:var(--gray-400)">' + i + '</td>';
    for (var ci2 = 0; ci2 < allCols.length; ci2++) {
      var v = data[i][allCols[ci2]];
      if (v === null || v === undefined) {
        h += '<td class="null-val">null</td>';
      } else {
        h += '<td>' + v + '</td>';
      }
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  panelSource.innerHTML = h;

  var ths = panelSource.querySelectorAll("th.col-clickable");
  for (var ti = 0; ti < ths.length; ti++) {
    ths[ti].addEventListener("click", function (e) {
      e.stopPropagation();
      showModMenu(this.getAttribute("data-col"), this);
    });
  }
}

/* ===========================================================
   9. RENDER — Result table (all original rows, recalculated measures)
   =========================================================== */
function renderResultTable(result) {
  var data = state.data;
  var allCols = state.columns.concat([state.measureCol]);

  var h = '<table class="data-table"><thead><tr><th>#</th>';
  for (var ci = 0; ci < allCols.length; ci++) {
    var c = allCols[ci];
    var isMeasure = (c === state.measureCol);
    var mod = state.colModifiers[c];

    if (isMeasure) {
      h += '<th class="col-measure">' + c + '</th>';
    } else if (mod) {
      var def = getModDef(mod.type);
      var isFilter = def && def.needsValue;
      var thCls = isFilter ? "col-filtered-mod" : "col-hidden-rf";
      var icon = isFilter ? FILTER_SVG : EYE_SLASH_SVG;
      h += '<th class="' + thCls + '">' + c +
        ' <span class="col-hidden-icon">' + icon + '</span></th>';
    } else {
      h += '<th>' + c + '</th>';
    }
  }
  h += '</tr></thead><tbody>';

  var slicerActive2 = hasActiveSlicer();
  for (var i = 0; i < data.length; i++) {
    var dimmed2 = slicerActive2 && !rowMatchesSlicer(data[i]);
    h += '<tr' + (dimmed2 ? ' class="slicer-dimmed"' : '') + '><td style="color:var(--gray-400)">' + i + '</td>';
    for (var ci2 = 0; ci2 < allCols.length; ci2++) {
      var c2 = allCols[ci2];
      var isMeasure2 = (c2 === state.measureCol);
      var mod2 = state.colModifiers[c2];
      var v = data[i][c2];

      if (isMeasure2) {
        var mVal = result.rowMeasures[i];
        var changed = (mVal !== v);
        h += '<td class="col-measure' + (changed ? ' col-measure-changed' : '') + '">' +
             formatNumber(mVal) + '</td>';
      } else if (mod2) {
        var def2 = getModDef(mod2.type);
        var isFilter2 = def2 && def2.needsValue;
        var tdCls = isFilter2 ? "col-filtered-mod" : "col-hidden-rf";
        if (v === null || v === undefined) {
          h += '<td class="' + tdCls + '"><span class="null-val">null</span></td>';
        } else {
          h += '<td class="' + tdCls + '">' + v + '</td>';
        }
      } else {
        if (v === null || v === undefined) {
          h += '<td class="null-val">null</td>';
        } else {
          h += '<td>' + v + '</td>';
        }
      }
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  panelResult.innerHTML = h;
}

/* ===========================================================
   10. RENDER — Formula panel
   =========================================================== */
function renderFormula(result) {
  var mc = state.measureCol;
  var modCols = [];
  for (var i = 0; i < state.columns.length; i++) {
    if (state.colModifiers[state.columns[i]]) modCols.push(state.columns[i]);
  }
  var hasAny = modCols.length > 0;

  var h = '<span class="formula-label">Metryka</span>';
  h += '<div class="formula-block' + (hasAny ? ' has-rf' : '') + '">';

  if (!hasAny) {
    h += mc + ' =<br>';
    h += '<span class="fn">SUM</span> ( <span class="col">Tabela[' + mc + ']</span> )';
  } else {
    h += mc + ' =<br>';
    h += '<span class="kw">CALCULATE</span> (<br>';
    h += '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Tabela[' + mc + ']</span> ),<br>';

    var allSame = true;
    var firstType = state.colModifiers[modCols[0]].type;
    var firstDef = getModDef(firstType);
    for (var ci = 1; ci < modCols.length; ci++) {
      if (state.colModifiers[modCols[ci]].type !== firstType) { allSame = false; break; }
    }
    var canCollapse = allSame && modCols.length === state.columns.length &&
                      firstDef && !firstDef.needsValue;

    if (canCollapse) {
      h += '&nbsp;&nbsp;<span class="fn">' + firstType + '</span> ( <span class="removed-arg">Tabela</span> )';
    } else {
      for (var mi = 0; mi < modCols.length; mi++) {
        var col = modCols[mi];
        var mod = state.colModifiers[col];
        var comma = (mi < modCols.length - 1) ? "," : "";

        if (mod.type === "equation") {
          h += '&nbsp;&nbsp;<span class="eq-arg">Tabela[' + col + '] = "' +
               escHtml(String(mod.value)) + '"</span>' + comma + '<br>';
        } else if (mod.type === "KEEPFILTERS") {
          h += '&nbsp;&nbsp;<span class="fn">KEEPFILTERS</span> ( <span class="eq-arg">Tabela[' +
               col + '] = "' + escHtml(String(mod.value)) + '"</span> )' + comma + '<br>';
        } else {
          h += '&nbsp;&nbsp;<span class="fn">' + mod.type + '</span> ( <span class="removed-arg">Tabela[' +
            col + ']</span> )' + comma + '<br>';
        }
      }
    }

    h += ')';
  }

  h += '</div>';

  h += '<div class="metric-result changed" id="metricBox">';
  h += '<div class="metric-label">' + mc + '</div>';
  h += '<div class="metric-value">' + formatNumber(result.total) + '</div>';
  h += '</div>';

  if (hasAny) {
    h += '<div style="font-size:0.75rem;color:var(--gray-600);margin-top:4px;line-height:1.5;">';
    h += '<strong style="color:var(--orange);">Aktywne modyfikatory:</strong><br>';
    for (var ri = 0; ri < modCols.length; ri++) {
      var m = state.colModifiers[modCols[ri]];
      var label = m.type === "equation" ? "R\u00f3wnanie" : m.type;
      h += '<code>' + modCols[ri] + '</code> \u2192 <small>' + label + '</small>';
      if (m.value !== undefined) h += ' <small style="color:var(--gray-400);">= "' + escHtml(String(m.value)) + '"</small>';
      if (ri < modCols.length - 1) h += '<br>';
    }
    h += '</div>';
  } else {
    h += '<div style="font-size:0.75rem;color:var(--gray-500);margin-top:4px;line-height:1.5;">';
    h += 'Kliknij nag\u0142\u00f3wek kolumny w tabeli danych, aby doda\u0107 modyfikator filtru.';
    h += '</div>';
  }

  panelFormula.innerHTML = h;

  setTimeout(function () {
    var box = document.getElementById("metricBox");
    if (box) box.classList.remove("changed");
  }, 500);
}

/* ===========================================================
   11. RENDER ALL
   =========================================================== */
function renderAll() {
  var result = computeResult();
  renderSlicerBar();
  renderSourceTable();
  renderResultTable(result);
  renderFormula(result);
  cntRows.textContent = result.count;
  cntMods.textContent = result.modCount;
  cntSum.textContent = formatNumber(result.total);
}

/* ===========================================================
   12. LOAD PRESET
   =========================================================== */
function loadPreset() {
  var d = DATASETS[dataPresetEl.value];
  if (!d) return;
  var p = d.dax;

  state.data = JSON.parse(JSON.stringify(p.data));
  state.measureCol = p.measureCol;
  state.colModifiers = {};
  state.slicerFilters = {};

  var allCols = Object.keys(p.data[0]);
  state.columns = [];
  for (var i = 0; i < allCols.length; i++) {
    if (allCols[i] !== p.measureCol) {
      state.columns.push(allCols[i]);
    }
  }

  renderAll();
}

/* ===========================================================
   13. EVENTS & INIT
   =========================================================== */
dataPresetEl.addEventListener("change", function () {
  loadPreset();
});

loadPreset();

})();
