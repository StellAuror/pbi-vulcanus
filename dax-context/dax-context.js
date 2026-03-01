/* ============================================================
   DAX CONTEXT VISUALIZER — App logic
   Depends on: PQEngine (shared/engine.js)

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
   2. DATA PRESETS
   =========================================================== */
var PRESETS = {
  basic: {
    name: "Sprzeda\u017c wg produktu i regionu",
    data: [
      { Produkt: "Chleb",   Region: "P\u00f3\u0142noc",  Kwota: 1200 },
      { Produkt: "Chleb",   Region: "Po\u0142udnie", Kwota: 800 },
      { Produkt: "Mas\u0142o",   Region: "P\u00f3\u0142noc",  Kwota: 950 },
      { Produkt: "Mas\u0142o",   Region: "Po\u0142udnie", Kwota: 1100 },
      { Produkt: "Mleko",   Region: "P\u00f3\u0142noc",  Kwota: 700 },
      { Produkt: "Mleko",   Region: "Po\u0142udnie", Kwota: 600 },
      { Produkt: "Ser",     Region: "P\u00f3\u0142noc",  Kwota: 400 },
      { Produkt: "Ser",     Region: "Po\u0142udnie", Kwota: 350 },
    ],
    measureCol: "Kwota",
  },
  dates: {
    name: "Sprzeda\u017c wg daty i kategorii",
    data: [
      { Kategoria: "Pieczywo", Miesi\u0105c: "Stycze\u0144",  Kwota: 3200 },
      { Kategoria: "Pieczywo", Miesi\u0105c: "Luty",     Kwota: 2800 },
      { Kategoria: "Pieczywo", Miesi\u0105c: "Marzec",   Kwota: 3100 },
      { Kategoria: "Nabia\u0142",   Miesi\u0105c: "Stycze\u0144",  Kwota: 4100 },
      { Kategoria: "Nabia\u0142",   Miesi\u0105c: "Luty",     Kwota: 3900 },
      { Kategoria: "Nabia\u0142",   Miesi\u0105c: "Marzec",   Kwota: 4300 },
      { Kategoria: "Owoce",    Miesi\u0105c: "Stycze\u0144",  Kwota: 1500 },
      { Kategoria: "Owoce",    Miesi\u0105c: "Luty",     Kwota: 1800 },
      { Kategoria: "Owoce",    Miesi\u0105c: "Marzec",   Kwota: 2000 },
    ],
    measureCol: "Kwota",
  },
};

/* ===========================================================
   3. MODIFIER DEFINITIONS
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
   4. DOM REFERENCES
   =========================================================== */
var $ = function (s) { return document.querySelector(s); };
var dataPresetEl = $("#dataPreset");
var panelSource  = $("#panelSource");
var panelFormula = $("#panelFormula");
var panelResult  = $("#panelResult");
var cntRows      = $("#cntRows");
var cntMods      = $("#cntMods");
var cntSum       = $("#cntSum");

/* ===========================================================
   5. STATE
   =========================================================== */
var state = {
  data: [],
  columns: [],        // all column names except measure
  measureCol: "",
  colModifiers: {},   // { colName: { type: string, value?: string } }
};

/* ===========================================================
   6. HELPERS
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
   7. MODIFIER MENU (floating dropdown with value picker)
   =========================================================== */
var modMenu = null;
var modMenuCol = null;

function ensureModMenu() {
  if (modMenu) return;

  var el = document.createElement("div");
  el.className = "modifier-menu";

  var h = '<div class="mod-menu-title">Modyfikator filtru</div>';
  // "None" option
  h += '<div class="mod-menu-opt mod-menu-none" data-type="">' +
       '<span class="mod-menu-x">\u2715</span> Brak (usu\u0144)</div>';
  // Modifier options
  for (var i = 0; i < MODIFIER_DEFS.length; i++) {
    var d = MODIFIER_DEFS[i];
    var arrow = d.needsValue ? ' <span class="mod-menu-arrow">\u25b8</span>' : '';
    h += '<div class="mod-menu-opt" data-type="' + d.type + '">' +
         '<span class="mod-menu-dot" style="background:var(' + d.cssVar + ');"></span>' +
         d.label + arrow + '</div>';
  }
  // Value picker (hidden, populated dynamically)
  h += '<div class="mod-menu-values" style="display:none;"></div>';

  el.innerHTML = h;
  document.body.appendChild(el);
  modMenu = el;

  // Wire option clicks
  var opts = el.querySelectorAll(".mod-menu-opt");
  for (var oi = 0; oi < opts.length; oi++) {
    opts[oi].addEventListener("click", onModMenuOptClick);
  }

  // Close on outside click
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

  // "Brak" — remove modifier
  if (type === "") {
    delete state.colModifiers[modMenuCol];
    hideModMenu();
    renderAll();
    return;
  }

  // Needs value → show value picker
  if (def && def.needsValue) {
    showValuePicker(type);

    // Highlight selected option
    var allOpts = modMenu.querySelectorAll(".mod-menu-opt");
    for (var i = 0; i < allOpts.length; i++) {
      allOpts[i].classList.toggle("selected", allOpts[i] === this);
    }
    return;
  }

  // Apply immediately (no value needed)
  state.colModifiers[modMenuCol] = { type: type };
  hideModMenu();
  renderAll();
}

function showValuePicker(type) {
  var valuesDiv = modMenu.querySelector(".mod-menu-values");
  modMenu._pendingType = type;

  // Get distinct values for this column
  var values = getDistinctValues(modMenuCol);

  // Check if there is an existing value selected
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

  // Wire value clicks
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

  // Position below the header
  var rect = thEl.getBoundingClientRect();
  modMenu.style.top = (rect.bottom + 4) + "px";
  modMenu.style.left = Math.max(4, rect.left) + "px";
  modMenu.style.display = "block";

  // Reset value picker
  modMenu.querySelector(".mod-menu-values").style.display = "none";
  modMenu._pendingType = null;

  // Show "none" only when a modifier is already set
  var hasModifier = !!state.colModifiers[colName];
  modMenu.querySelector(".mod-menu-none").style.display = hasModifier ? "" : "none";

  // Highlight current selection
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
   8. COMPUTE — measure evaluation with modifier context
   =========================================================== */

/**
 * Compute SUM(measureCol) given a base filter context,
 * then applying all active modifiers on top.
 *
 * @param {Object} baseFilters  { colName: value } — the row's natural context
 * @returns {number}
 */
function computeMeasure(baseFilters) {
  var mc = state.measureCol;

  // Copy base filters
  var filters = {};
  for (var col in baseFilters) {
    if (baseFilters.hasOwnProperty(col)) {
      filters[col] = baseFilters[col];
    }
  }

  // Apply modifiers
  var modCols = Object.keys(state.colModifiers);
  for (var mi = 0; mi < modCols.length; mi++) {
    var col = modCols[mi];
    var mod = state.colModifiers[col];

    if (mod.type === "REMOVEFILTERS" || mod.type === "ALL" || mod.type === "ALLSELECTED") {
      // Remove filter on this column
      delete filters[col];
    } else if (mod.type === "equation") {
      // Replace filter with specific value
      filters[col] = mod.value;
    } else if (mod.type === "KEEPFILTERS") {
      // Intersect: keep only if existing value matches
      if (filters.hasOwnProperty(col)) {
        if (filters[col] !== mod.value) {
          return 0; // empty intersection
        }
        // else existing == mod.value, keep it
      } else {
        // No existing filter → add the filter
        filters[col] = mod.value;
      }
    }
  }

  // Sum all rows matching the effective filter
  var sum = 0;
  var filterCols = Object.keys(filters);
  for (var r = 0; r < state.data.length; r++) {
    var match = true;
    for (var fi = 0; fi < filterCols.length; fi++) {
      if (state.data[r][filterCols[fi]] !== filters[filterCols[fi]]) {
        match = false;
        break;
      }
    }
    if (match) sum += (state.data[r][mc] || 0);
  }
  return sum;
}

/**
 * Compute all per-row measures and the grand total.
 */
function computeResult() {
  var modCount = Object.keys(state.colModifiers).length;

  // Per-row measures (each row evaluated in its own filter context)
  var rowMeasures = [];
  for (var r = 0; r < state.data.length; r++) {
    var baseFilters = {};
    for (var i = 0; i < state.columns.length; i++) {
      baseFilters[state.columns[i]] = state.data[r][state.columns[i]];
    }
    rowMeasures.push(computeMeasure(baseFilters));
  }

  // Grand total = measure with NO base filter context
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
   9. RENDER — Source table (clickable headers)
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

  for (var i = 0; i < data.length; i++) {
    h += '<tr><td style="color:var(--gray-400)">' + i + '</td>';
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

  // Wire click events
  var ths = panelSource.querySelectorAll("th.col-clickable");
  for (var ti = 0; ti < ths.length; ti++) {
    ths[ti].addEventListener("click", function (e) {
      e.stopPropagation();
      showModMenu(this.getAttribute("data-col"), this);
    });
  }
}

/* ===========================================================
   10. RENDER — Result table (all original rows, recalculated measures)
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

  for (var i = 0; i < data.length; i++) {
    h += '<tr><td style="color:var(--gray-400)">' + i + '</td>';
    for (var ci2 = 0; ci2 < allCols.length; ci2++) {
      var c2 = allCols[ci2];
      var isMeasure2 = (c2 === state.measureCol);
      var mod2 = state.colModifiers[c2];
      var v = data[i][c2];

      if (isMeasure2) {
        // Show the recalculated measure for this row
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
   11. RENDER — Formula panel
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
    h += 'Wynik =<br>';
    h += '<span class="fn">SUM</span> ( <span class="col">Tabela[' + mc + ']</span> )';
  } else {
    h += 'Wynik =<br>';
    h += '<span class="kw">CALCULATE</span> (<br>';
    h += '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Tabela[' + mc + ']</span> ),<br>';

    // Check if all columns have the same non-value type → collapse to table ref
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

  // Metric result value
  h += '<div class="metric-result changed" id="metricBox">';
  h += '<div class="metric-label">SUM( ' + mc + ' )</div>';
  h += '<div class="metric-value">' + formatNumber(result.total) + '</div>';
  h += '</div>';

  // Summary
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
   12. RENDER ALL
   =========================================================== */
function renderAll() {
  var result = computeResult();
  renderSourceTable();
  renderResultTable(result);
  renderFormula(result);
  cntRows.textContent = result.count;
  cntMods.textContent = result.modCount;
  cntSum.textContent = formatNumber(result.total);
}

/* ===========================================================
   13. LOAD PRESET
   =========================================================== */
function loadPreset() {
  var p = PRESETS[dataPresetEl.value];
  if (!p) return;

  state.data = JSON.parse(JSON.stringify(p.data));
  state.measureCol = p.measureCol;
  state.colModifiers = {};

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
   14. EVENTS & INIT
   =========================================================== */
dataPresetEl.addEventListener("change", function () {
  loadPreset();
});

loadPreset();

})();
