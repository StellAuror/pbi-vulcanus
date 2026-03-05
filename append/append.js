/* ============================================================
   APPEND VISUALIZER — App logic
   Depends on: PQEngine (shared/engine.js), DATASETS (shared/datasets.js)
   ============================================================ */
(function () {
"use strict";

const E = PQEngine;

/* ===========================================================
   1. CONSTANTS
   =========================================================== */
const TAGS = ["a", "b", "c", "d", "e", "f"];
const TAG_CLASSES = { a: "tag-a", b: "tag-b", c: "tag-c" };
function tagClass(t) { return TAG_CLASSES[t] || "tag-extra"; }
const ROW_CLASSES = { a: "active-row", b: "active-row-b", c: "active-row-c" };
function rowActiveClass(t) { return ROW_CLASSES[t] || "active-row"; }

/* ===========================================================
   2. DOM
   =========================================================== */
const $ = s => document.querySelector(s);
const appendModeEl    = $("#appendMode");
const dataPresetEl    = $("#dataPreset");
const tableCountCtrl  = $("#tableCountControls");
const tableCountLabel = $("#tableCountLabel");
const btnAddTable     = $("#btnAddTable");
const btnRemoveTable  = $("#btnRemoveTable");
const speedSlider     = $("#speedSlider");
const speedVal        = $("#speedVal");
const btnStart        = $("#btnStart");
const btnPause        = $("#btnPause");
const btnStep         = $("#btnStep");
const btnReset        = $("#btnReset");
const cntTable        = $("#cntTable");
const cntRow          = $("#cntRow");
const cntResult       = $("#cntResult");
const statusText      = $("#statusText");
const statusBadge     = $("#statusBadge");
const sourcesScroll   = $("#sourcesScroll");
const resultScroll    = $("#resultScroll");
const logPanel        = $("#logPanel");

/* ===========================================================
   3. STATE
   =========================================================== */
const APPEND_HL = ["active-row", "active-row-b", "active-row-c", "copied", "result-new"];

let state = E.createState({
  tables: [],
  allColumns: [],
  mode: "two",
  tableCount: 3,
});
state.speed = 500;

/* ===========================================================
   4. HELPERS
   =========================================================== */
function _log(html) { E.log(state, logPanel, html); }
function _delay(ms) { return E.delay(state, ms); }
function _clearActive() { E.clearClasses(APPEND_HL); }
function _clearAll() { E.clearClasses([...APPEND_HL, "processed"]); }

function getTableColumns(ti) {
  return state.tables[ti] && state.tables[ti].data.length
    ? E.getColumns(state.tables[ti].data) : [];
}

function computeAllColumns() {
  const seen = new Set();
  const ordered = [];
  state.tables.forEach(tbl => {
    E.getColumns(tbl.data).forEach(c => {
      if (!seen.has(c)) { seen.add(c); ordered.push(c); }
    });
  });
  state.allColumns = ordered;
  return ordered;
}

/* ===========================================================
   5. TABLE RENDERING
   =========================================================== */
function renderResultTable() {
  if (!state.result.length) {
    resultScroll.innerHTML = '<p style="padding:16px;color:var(--gray-400);font-size:0.82rem;">Wynik pojawi si\u0119 tutaj\u2026</p>';
    return;
  }
  const cols = state.allColumns;
  let h = '<table class="data-table"><thead><tr><th>#</th>';
  cols.forEach(c => h += `<th>${c}</th>`);
  h += '</tr></thead><tbody>';
  state.result.forEach((row, i) => {
    h += `<tr id="res_${i}"><td style="color:var(--gray-400)">${i}</td>`;
    cols.forEach(c => {
      const v = row[c];
      h += v === null || v === undefined
        ? '<td class="null-val">null</td>'
        : `<td>${v}</td>`;
    });
    h += '</tr>';
  });
  h += '</tbody></table>';
  resultScroll.innerHTML = h;
}

function renderAllSources() {
  sourcesScroll.innerHTML = "";
  state.tables.forEach((tbl, ti) => {
    const panel = document.createElement("div");
    panel.className = "source-panel";
    const tag = tbl.tag || TAGS[ti] || "a";
    panel.innerHTML = `
      <div class="source-panel-header">
        <span class="tag ${tagClass(tag)}">${String.fromCharCode(65 + ti)}</span>
        ${tbl.label}
        <span style="margin-left:auto;font-size:0.7rem;color:var(--gray-400)">${tbl.data.length} wierszy</span>
      </div>
      <div class="source-panel-body" id="src_body_${ti}"></div>
    `;
    sourcesScroll.appendChild(panel);
    E.renderTable(
      panel.querySelector(".source-panel-body"),
      tbl.data,
      `t${ti}`
    );
  });
}

/* ===========================================================
   6. ANIMATION ENGINE
   =========================================================== */
async function runAnimation() {
  state.result = [];
  const allCols = computeAllColumns();
  renderResultTable();
  cntResult.textContent = "0";

  _log('<span class="phase">\u2550\u2550\u2550 Append \u2014 analiza kolumn \u2550\u2550\u2550</span>');

  const tableCols = state.tables.map((t, i) => E.getColumns(t.data));

  state.tables.forEach((tbl, ti) => {
    const cols = tableCols[ti];
    _log(`<span class="header-action">Tabela ${String.fromCharCode(65+ti)} \u201e${tbl.label}\u201d:</span> <span class="info">${cols.join(", ")}</span>`);
  });
  await _delay();

  const shared = allCols.filter(c => tableCols.every(tc => tc.includes(c)));
  const unique = allCols.filter(c => !tableCols.every(tc => tc.includes(c)));

  if (shared.length) {
    _log(`<span class="copy-action">Wsp\u00f3lne kolumny:</span> <span class="info">${shared.join(", ")}</span>`);
  }
  if (unique.length) {
    _log(`<span class="null-action">Kolumny tylko w niekt\u00f3rych tabelach:</span> <span class="info">${unique.join(", ")} \u2192 brakuj\u0105ce = null</span>`);
  }

  _log(`<span class="phase">Wynikowe kolumny: ${allCols.join(", ")}</span>`);
  await _delay();

  for (let ti = 0; ti < state.tables.length; ti++) {
    if (state.aborted) return;
    const tbl = state.tables[ti];
    const tblCols = tableCols[ti];
    const tag = tbl.tag || TAGS[ti] || "a";
    const letter = String.fromCharCode(65 + ti);

    _log(`<span class="phase">\u2500\u2500 Do\u0142\u0105czam tabel\u0119 ${letter}: \u201e${tbl.label}\u201d (${tbl.data.length} wierszy) \u2500\u2500</span>`);
    cntTable.textContent = `${letter} (${ti + 1}/${state.tables.length})`;
    await _delay();

    for (let ri = 0; ri < tbl.data.length; ri++) {
      if (state.aborted) return;
      const srcRow = tbl.data[ri];
      const rowId = `t${ti}_${ri}`;

      _clearActive();
      E.setRowClass(rowId, rowActiveClass(tag), APPEND_HL);
      E.scrollIntoView(rowId);
      cntRow.textContent = `${ri + 1} / ${tbl.data.length}`;

      const resRow = {};
      let nullCols = [];
      allCols.forEach(c => {
        if (tblCols.includes(c)) {
          resRow[c] = srcRow[c] !== undefined ? srcRow[c] : null;
        } else {
          resRow[c] = null;
          nullCols.push(c);
        }
      });

      const vals = tblCols.map(c => `${c}=${JSON.stringify(srcRow[c])}`).join(", ");
      let logMsg = `<span class="copy-action">  Kopiuj\u0119 ${letter}[${ri}]:</span> <span class="info">${vals}</span>`;
      if (nullCols.length) {
        logMsg += ` <span class="null-action">+ null: ${nullCols.join(", ")}</span>`;
      }
      _log(logMsg);

      await _delay();

      state.result.push(resRow);
      renderResultTable();
      E.highlightLastResult(state.result.length);
      cntResult.textContent = state.result.length;

      E.setRowClass(rowId, "copied", APPEND_HL);
      await _delay(state.speed / 3);
      E.markProcessed(rowId);
    }

    _log(`<span class="info">  \u2713 Tabela ${letter} \u2014 ${tbl.data.length} wierszy dodanych</span>`);
    await _delay(state.speed / 2);
  }
}

/* ===========================================================
   7. LOAD / RESET
   =========================================================== */
function loadPreset() {
  const d = DATASETS[dataPresetEl.value];
  if (!d) return;
  let tables = JSON.parse(JSON.stringify(d.append.tables));

  if (state.mode === "two") {
    tables = tables.slice(0, 2);
  } else {
    // "three" mode — respect tableCount
    while (tables.length < state.tableCount) {
      const idx = tables.length;
      const letter = String.fromCharCode(65 + idx);
      const tag = TAGS[idx] || "a";
      tables.push({
        label: `Tabela ${letter}`,
        tag: tag,
        data: [
          { Produkt: `Extra-${idx}-1`, Ilo\u015b\u0107: Math.floor(Math.random() * 50) + 1, Kwota: +(Math.random() * 200 + 20).toFixed(2) },
          { Produkt: `Extra-${idx}-2`, Ilo\u015b\u0107: Math.floor(Math.random() * 50) + 1, Kwota: +(Math.random() * 200 + 20).toFixed(2) },
        ],
      });
    }
    tables = tables.slice(0, state.tableCount);
  }

  state.tables = tables;
  state.result = [];
  renderAllSources();
  renderResultTable();
  cntResult.textContent = "0";
  cntTable.textContent = "\u2013";
  cntRow.textContent = "\u2013";
}

function fullReset() {
  state.aborted = true; state.running = false; state.paused = false; state.stepMode = false;
  if (state.stepResolve) { state.stepResolve(); state.stepResolve = null; }
  setTimeout(() => {
    state.aborted = false;
    loadPreset(); E.clearLog(state, logPanel); _clearAll();
    E.setStatus(statusBadge, statusText, "ready");
    E.updateButtons(state, btnStart, btnPause, btnStep);
  }, 50);
}

/* ===========================================================
   8. EVENTS
   =========================================================== */
appendModeEl.addEventListener("change", () => {
  state.mode = appendModeEl.value;
  tableCountCtrl.style.display = state.mode === "three" ? "flex" : "none";
  if (!state.running) fullReset();
});

dataPresetEl.addEventListener("change", () => { if (!state.running) fullReset(); });

btnAddTable.addEventListener("click", () => {
  if (state.tableCount < 6) {
    state.tableCount++;
    tableCountLabel.textContent = state.tableCount;
    if (!state.running) fullReset();
  }
});
btnRemoveTable.addEventListener("click", () => {
  if (state.tableCount > 2) {
    state.tableCount--;
    tableCountLabel.textContent = state.tableCount;
    if (!state.running) fullReset();
  }
});

speedSlider.addEventListener("input", () => {
  state.speed = parseInt(speedSlider.value);
  speedVal.textContent = state.speed + " ms";
});

E.wirePlaybackButtons({
  state, btnStart, btnPause, btnStep, btnReset,
  statusBadge, statusText,
  onReset: fullReset,
  onBeforeStart() {
    _log(`<span class="phase">\u2550\u2550\u2550 Start: Append (${state.tables.length} tabel) \u2550\u2550\u2550</span>`);
  },
  onAnimate: async () => {
    await runAnimation();
    if (!state.aborted) {
      _log(`<span class="phase">\u2550\u2550\u2550 Gotowe \u2014 wynik: ${state.result.length} wierszy \u2550\u2550\u2550</span>`);
    }
  },
});

/* ===========================================================
   9. INIT
   =========================================================== */
state.mode = appendModeEl.value;
state.speed = parseInt(speedSlider.value);
state.tableCount = 3;
loadPreset();
E.updateButtons(state, btnStart, btnPause, btnStep);
speedVal.textContent = state.speed + " ms";
tableCountLabel.textContent = state.tableCount;

})();
