/* ============================================================
   MERGE (JOIN) VISUALIZER — App logic
   Depends on: PQEngine (shared/engine.js), DATASETS (shared/datasets.js)
   ============================================================ */
(function () {
"use strict";

const E = PQEngine;

/* ===========================================================
   1. JOIN DESCRIPTIONS (one-liners for ribbon)
   =========================================================== */
const JOIN_INFO = {
  inner:      { title:"Inner Join",       symbol:"A \u2229 B",  desc:"Tylko wiersze z dopasowaniem po obu stronach." },
  leftOuter:  { title:"Left Outer Join",  symbol:"A \u27d5 B",  desc:"Wszystkie z lewej + dopasowania z prawej. Brak \u2192 null." },
  rightOuter: { title:"Right Outer Join", symbol:"A \u27d6 B",  desc:"Wszystkie z prawej + dopasowania z lewej. Brak \u2192 null." },
  fullOuter:  { title:"Full Outer Join",  symbol:"A \u27d7 B",  desc:"Wszystko z obu stron. Brak \u2192 null." },
  leftAnti:   { title:"Left Anti Join",   symbol:"A \\\\ B",    desc:"Wiersze z lewej BEZ dopasowania w prawej." },
  rightAnti:  { title:"Right Anti Join",  symbol:"B \\\\ A",    desc:"Wiersze z prawej BEZ dopasowania w lewej." },
  leftSemi:   { title:"Left Semi Join",   symbol:"A \u22c9 B",  desc:"Wiersze z lewej Z dopasowaniem, bez kolumn prawej." },
  rightSemi:  { title:"Right Semi Join",  symbol:"A \u22ca B",  desc:"Wiersze z prawej Z dopasowaniem, bez kolumn lewej." },
  fuzzy:      { title:"Fuzzy Join",       symbol:"A \u2248 B",  desc:"Left Outer z przybli\u017conym dopasowaniem (Levenshtein)." },
};

/* ===========================================================
   2. DOM
   =========================================================== */
const $ = s => document.querySelector(s);
const joinTypeEl     = $("#joinType");
const dataPresetEl   = $("#dataPreset");
const joinDescEl     = $("#joinDesc");
const speedSlider    = $("#speedSlider");
const speedVal       = $("#speedVal");
const fuzzyControls  = $("#fuzzyControls");
const fuzzyThreshold = $("#fuzzyThreshold");
const thresholdVal   = $("#thresholdVal");
const btnStart       = $("#btnStart");
const btnPause       = $("#btnPause");
const btnStep        = $("#btnStep");
const btnReset       = $("#btnReset");
const cntB           = $("#cntB");
const cntA           = $("#cntA");
const cntResult      = $("#cntResult");
const statusText     = $("#statusText");
const statusBadge    = $("#statusBadge");
const panelA         = $("#panelA");
const panelB         = $("#panelB");
const panelResult    = $("#panelResult");
const logPanel       = $("#logPanel");
const compareBubble  = $("#compareBubble");
const connSvg        = $("#connLines");
const tablesArea     = $(".tables-area");

/* ===========================================================
   3. STATE
   =========================================================== */
const MERGE_HL = ["highlight-a","highlight-b","match","nomatch","result-new"];

let state = E.createState({
  dataA: [], dataB: [],
  joinType: "leftOuter", keyCol: "Produkt",
  fuzzyThresh: 0.6,
  matchedA: new Set(), matchedB: new Set(),
});

/* ===========================================================
   4. HELPERS
   =========================================================== */
function _log(html) { E.log(state, logPanel, html); }
function _delay(ms) { return E.delay(state, ms); }
function _setRow(id, cls) { E.setRowClass(id, cls, MERGE_HL); }
function _clearActive() { E.clearClasses(MERGE_HL); }
function _clearAll() { E.clearClasses([...MERGE_HL, "processed"]); }
function _renderResult() { E.renderTable(panelResult, state.result, "res"); }
function _hlResult() { E.highlightLastResult(state.result.length); }

function showBubble(el, text) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  compareBubble.innerHTML = text;
  compareBubble.style.left = (r.right + 8) + "px";
  compareBubble.style.top = (r.top + r.height / 2 - 14) + "px";
  compareBubble.classList.add("visible");
}
function hideBubble() { compareBubble.classList.remove("visible"); }

/* --- SVG ring helpers --- */
function _svgGroup(id) {
  let g = connSvg.querySelector("#" + id);
  if (!g) {
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);
    connSvg.appendChild(g);
  }
  return g;
}
function clearActive() { const g = connSvg.querySelector("#svg-active"); if (g) g.innerHTML = ""; }
function clearAnchor() { const g = connSvg.querySelector("#svg-anchor"); if (g) g.innerHTML = ""; }
function clearLines() { clearAnchor(); clearActive(); }

function _getKeyCell(rowId) {
  const row = document.getElementById(rowId);
  if (!row) return null;
  const tbl = row.closest("table");
  if (!tbl) return null;
  const headers = Array.from(tbl.querySelectorAll("thead th"));
  const idx = headers.findIndex(th => th.textContent.trim() === state.keyCol);
  if (idx < 0) return null;
  return row.querySelectorAll("td")[idx] || null;
}

const PAD = 3;
function _rrect(g, rect, ref, color, sw, dash, fillOpacity) {
  const x = rect.left - ref.left - PAD, y = rect.top - ref.top - PAD;
  const w = rect.width + PAD * 2,      h = rect.height + PAD * 2;
  const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  el.setAttribute("x", x);  el.setAttribute("y", y);
  el.setAttribute("width", w); el.setAttribute("height", h);
  el.setAttribute("rx", 5);   el.setAttribute("ry", 5);
  el.setAttribute("fill", color); el.setAttribute("fill-opacity", fillOpacity);
  el.setAttribute("stroke", color); el.setAttribute("stroke-width", sw);
  if (dash) el.setAttribute("stroke-dasharray", dash);
  el.setAttribute("stroke-linejoin", "round");
  g.appendChild(el);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

function drawAnchorRing(id, color) {
  clearAnchor();
  const cell = _getKeyCell(id);
  if (!cell) return;
  const ref = tablesArea.getBoundingClientRect();
  const g = _svgGroup("svg-anchor");
  _rrect(g, cell.getBoundingClientRect(), ref, color, 2, "5 3", 0.07);
}

// activeId = inner-loop row (changes each step); anchorId = outer-loop row (persists)
function drawLine(activeId, anchorId, color) {
  clearActive();
  const aCell = _getKeyCell(activeId);
  const bCell = _getKeyCell(anchorId);
  if (!aCell || !bCell) return;
  const ref = tablesArea.getBoundingClientRect();
  const rA = aCell.getBoundingClientRect();
  const rB = bCell.getBoundingClientRect();
  const g  = _svgGroup("svg-active");

  // Rounded-rect outline around active key cell
  const A = _rrect(g, rA, ref, color, 2, null, 0.1);

  // Edge connector points
  const aCx = A.cx, aCy = A.cy;
  const bBox = { x: rB.left - ref.left - PAD, y: rB.top - ref.top - PAD,
                 w: rB.width + PAD * 2,       h: rB.height + PAD * 2 };
  const bCx = bBox.x + bBox.w / 2, bCy = bBox.y + bBox.h / 2;

  const goRight = aCx < bCx;
  const x1 = goRight ? A.x + A.w : A.x;
  const x2 = goRight ? bBox.x    : bBox.x + bBox.w;
  const span = Math.abs(x2 - x1);
  const bend = Math.max(span * 0.45, 20);
  const cp1x = goRight ? x1 + bend : x1 - bend;
  const cp2x = goRight ? x2 - bend : x2 + bend;

  // Smooth bezier connector
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M${x1},${aCy} C${cp1x},${aCy} ${cp2x},${bCy} ${x2},${bCy}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color); path.setAttribute("stroke-width", "1.75");
  path.setAttribute("stroke-linecap", "round"); path.setAttribute("opacity", "0.8");
  g.appendChild(path);
}

function buildResultRow(aRow, bRow, colsA, colsB) {
  const r = {};
  colsA.forEach(c => r[c] = aRow ? aRow[c] : null);
  colsB.forEach(c => r[c] = bRow ? bRow[c] : null);
  return r;
}

function updateJoinDesc() {
  const info = JOIN_INFO[state.joinType];
  if (!info) return;
  joinDescEl.textContent = info.symbol + " \u2014 " + info.desc;
}

/* ===========================================================
   5. ANIMATION ENGINE
   =========================================================== */
async function runAnimation() {
  const jt = state.joinType, A = state.dataA, B = state.dataB, key = state.keyCol;
  const colsA = E.getColumns(A), colsB = E.getColumns(B), isFuzzy = jt === "fuzzy";
  state.result = []; state.matchedA = new Set(); state.matchedB = new Set();
  _renderResult(); cntResult.textContent = "0";
  _log(`<span class="finalize">\u2550\u2550\u2550 Start: ${JOIN_INFO[jt].title} \u2550\u2550\u2550</span>`);

  if (jt === "rightOuter" || jt === "rightAnti" || jt === "rightSemi")
    await animateRight(jt, A, B, key, colsA, colsB);
  else
    await animateStandard(jt, A, B, key, colsA, colsB, isFuzzy);

  clearLines();
  if (!state.aborted)
    _log(`<span class="finalize">\u2550\u2550\u2550 Gotowe \u2014 wynik: ${state.result.length} wierszy \u2550\u2550\u2550</span>`);
}

async function animateStandard(jt, A, B, key, colsA, colsB, isFuzzy) {
  for (let bi = 0; bi < B.length; bi++) {
    if (state.aborted) return;
    const bRow = B[bi], bKey = String(bRow[key] ?? "");
    _clearActive(); clearLines();
    _setRow(`b_${bi}`, "highlight-b"); E.scrollIntoView(`b_${bi}`);
    drawAnchorRing(`b_${bi}`, "#7048e8");
    cntB.textContent = `${bi+1} / ${B.length}`;
    _log(`<span class="key-check">Bior\u0119 <strong>B[${bi}]</strong> \u2192 ${key} = "${bKey}"</span>`);
    await _delay();

    let anyMatch = false;
    for (let ai = 0; ai < A.length; ai++) {
      if (state.aborted) return;
      const aRow = A[ai], aKey = String(aRow[key] ?? "");
      _setRow(`a_${ai}`, "highlight-a"); E.scrollIntoView(`a_${ai}`);
      cntA.textContent = `${ai+1} / ${A.length}`;
      drawLine(`a_${ai}`, `b_${bi}`, "#adb5bd");

      let isMatch = false, similarity = 0;
      if (isFuzzy) {
        similarity = E.levenshteinSimilarity(bKey, aKey);
        isMatch = similarity >= state.fuzzyThresh;
        showBubble(document.getElementById(`a_${ai}`), `"${bKey}" \u2248 "${aKey}" \u2192 <span class="${isMatch?'eq':'neq'}">${(similarity*100).toFixed(0)}%</span>`);
        _log(`<span class="key-check">&nbsp;&nbsp;\u2194 A[${ai}] "${aKey}"</span> \u2192 <span class="fuzzy-score">${(similarity*100).toFixed(0)}%</span> \u2192 ${isMatch ? '<span class="match-yes">MATCH \u2713</span>' : '<span class="match-no">brak</span>'}`);
      } else {
        isMatch = bKey === aKey;
        showBubble(document.getElementById(`a_${ai}`), `"${bKey}" = "${aKey}" \u2192 <span class="${isMatch?'eq':'neq'}">${isMatch ? '\u2713' : '\u2717'}</span>`);
        _log(`<span class="key-check">&nbsp;&nbsp;\u2194 A[${ai}] "${aKey}"</span> \u2192 ${isMatch ? '<span class="match-yes">MATCH \u2713</span>' : '<span class="match-no">brak</span>'}`);
      }
      await _delay();
      drawLine(`a_${ai}`, `b_${bi}`, isMatch ? "#2b8a3e" : "#c92a2a");

      if (isMatch) {
        anyMatch = true; state.matchedA.add(ai); state.matchedB.add(bi);
        _setRow(`a_${ai}`, "match"); _setRow(`b_${bi}`, "match");
        if (jt==="inner"||jt==="leftOuter"||jt==="fullOuter"||jt==="fuzzy") {
          state.result.push(buildResultRow(aRow, bRow, colsA, colsB));
          _renderResult(); _hlResult(); cntResult.textContent = state.result.length;
          _log(`<span class="action">&nbsp;&nbsp;\u2192 dodaj\u0119 do wyniku: A[${ai}] + B[${bi}]</span>`);
          await _delay();
        } else if (jt==="leftAnti") { _log(`<span class="action">&nbsp;&nbsp;\u2192 match \u2014 A[${ai}] nie trafi (Anti)</span>`); }
          else if (jt==="leftSemi") { _log(`<span class="action">&nbsp;&nbsp;\u2192 match \u2014 A[${ai}] trafi (Semi)</span>`); }
      } else {
        _setRow(`a_${ai}`, "nomatch"); await _delay(state.speed / 3);
      }
      hideBubble();
      if (!isMatch) _setRow(`a_${ai}`, "");
    }

    if (!anyMatch) {
      if (jt==="inner") _log(`<span class="match-no">&nbsp;&nbsp;Brak dopasowania \u2192 pomijam</span>`);
      else _log(`<span class="match-no">&nbsp;&nbsp;Brak dopasowania w A</span>`);
    }
    E.markProcessed(`b_${bi}`); await _delay(state.speed / 2);
  }
  await finalizeStd(jt, A, B, colsA, colsB);
}

async function animateRight(jt, A, B, key, colsA, colsB) {
  for (let ai = 0; ai < A.length; ai++) {
    if (state.aborted) return;
    const aRow = A[ai], aKey = String(aRow[key] ?? "");
    _clearActive(); clearLines();
    _setRow(`a_${ai}`, "highlight-a"); E.scrollIntoView(`a_${ai}`);
    drawAnchorRing(`a_${ai}`, "#1971c2");
    cntA.textContent = `${ai+1} / ${A.length}`;
    _log(`<span class="key-check">Bior\u0119 <strong>A[${ai}]</strong> \u2192 ${key} = "${aKey}"</span>`);
    await _delay();

    let anyMatch = false;
    for (let bi = 0; bi < B.length; bi++) {
      if (state.aborted) return;
      const bRow = B[bi], bKey = String(bRow[key] ?? "");
      _setRow(`b_${bi}`, "highlight-b"); E.scrollIntoView(`b_${bi}`);
      cntB.textContent = `${bi+1} / ${B.length}`;
      drawLine(`b_${bi}`, `a_${ai}`, "#adb5bd");
      const isMatch = aKey === bKey;
      showBubble(document.getElementById(`b_${bi}`), `"${aKey}" = "${bKey}" \u2192 <span class="${isMatch?'eq':'neq'}">${isMatch?'\u2713':'\u2717'}</span>`);
      _log(`<span class="key-check">&nbsp;&nbsp;\u2194 B[${bi}] "${bKey}"</span> \u2192 ${isMatch ? '<span class="match-yes">MATCH \u2713</span>' : '<span class="match-no">brak</span>'}`);
      await _delay();
      drawLine(`b_${bi}`, `a_${ai}`, isMatch ? "#2b8a3e" : "#c92a2a");

      if (isMatch) {
        anyMatch = true; state.matchedA.add(ai); state.matchedB.add(bi);
        _setRow(`b_${bi}`, "match"); _setRow(`a_${ai}`, "match");
        if (jt==="rightOuter") {
          state.result.push(buildResultRow(aRow, bRow, colsA, colsB));
          _renderResult(); _hlResult(); cntResult.textContent = state.result.length;
          _log(`<span class="action">&nbsp;&nbsp;\u2192 dodaj\u0119: A[${ai}] + B[${bi}]</span>`); await _delay();
        } else if (jt==="rightAnti") { _log(`<span class="action">&nbsp;&nbsp;\u2192 match \u2014 B[${bi}] nie trafi (Anti)</span>`); }
          else if (jt==="rightSemi") { _log(`<span class="action">&nbsp;&nbsp;\u2192 match \u2014 B[${bi}] trafi (Semi)</span>`); }
      } else { _setRow(`b_${bi}`, "nomatch"); await _delay(state.speed / 3); }
      hideBubble();
      if (!isMatch) _setRow(`b_${bi}`, "");
    }
    if (!anyMatch) _log(`<span class="match-no">&nbsp;&nbsp;Brak dopasowania w B</span>`);
    E.markProcessed(`a_${ai}`); await _delay(state.speed / 2);
  }
  await finalizeRight(jt, A, B, colsA, colsB);
}

/* ===========================================================
   6. FINALIZE
   =========================================================== */
async function finalizeStd(jt, A, B, colsA, colsB) {
  if (state.aborted) return;
  if (jt==="leftOuter"||jt==="fuzzy") {
    _log(`<span class="finalize">\u2500\u2500 Finalizacja: wiersze A bez dopasowania \u2500\u2500</span>`); await _delay();
    for (let ai=0;ai<A.length;ai++) { if (state.aborted) return;
      if (!state.matchedA.has(ai)) {
        _setRow(`a_${ai}`,"highlight-a"); E.scrollIntoView(`a_${ai}`);
        state.result.push(buildResultRow(A[ai],null,colsA,colsB));
        _renderResult(); _hlResult(); cntResult.textContent=state.result.length;
        _log(`<span class="action">&nbsp;&nbsp;A[${ai}] bez dopasowania \u2192 dodaj\u0119 z null</span>`);
        await _delay(); E.markProcessed(`a_${ai}`);
      }
    }
  } else if (jt==="fullOuter") {
    _log(`<span class="finalize">\u2500\u2500 Finalizacja: A bez dopasowania \u2500\u2500</span>`); await _delay();
    for (let ai=0;ai<A.length;ai++) { if (state.aborted) return;
      if (!state.matchedA.has(ai)) {
        _setRow(`a_${ai}`,"highlight-a"); E.scrollIntoView(`a_${ai}`);
        state.result.push(buildResultRow(A[ai],null,colsA,colsB));
        _renderResult(); _hlResult(); cntResult.textContent=state.result.length;
        _log(`<span class="action">&nbsp;&nbsp;A[${ai}] \u2192 null dla B</span>`); await _delay(); E.markProcessed(`a_${ai}`);
      }
    }
    _log(`<span class="finalize">\u2500\u2500 Finalizacja: B bez dopasowania \u2500\u2500</span>`); await _delay();
    for (let bi=0;bi<B.length;bi++) { if (state.aborted) return;
      if (!state.matchedB.has(bi)) {
        _setRow(`b_${bi}`,"highlight-b"); E.scrollIntoView(`b_${bi}`);
        state.result.push(buildResultRow(null,B[bi],colsA,colsB));
        _renderResult(); _hlResult(); cntResult.textContent=state.result.length;
        _log(`<span class="action">&nbsp;&nbsp;B[${bi}] \u2192 null dla A</span>`); await _delay(); E.markProcessed(`b_${bi}`);
      }
    }
  } else if (jt==="leftAnti") {
    _log(`<span class="finalize">\u2500\u2500 Finalizacja: A bez dopasowania \u2500\u2500</span>`); await _delay();
    for (let ai=0;ai<A.length;ai++) { if (state.aborted) return;
      if (!state.matchedA.has(ai)) {
        _setRow(`a_${ai}`,"highlight-a"); E.scrollIntoView(`a_${ai}`);
        const r={}; colsA.forEach(c=>r[c]=A[ai][c]); state.result.push(r);
        _renderResult(); _hlResult(); cntResult.textContent=state.result.length;
        _log(`<span class="action">&nbsp;&nbsp;A[${ai}] brak \u2192 dodaj\u0119 (Anti)</span>`); await _delay(); E.markProcessed(`a_${ai}`);
      } else _log(`<span class="match-no">&nbsp;&nbsp;A[${ai}] mia\u0142 match \u2192 pomijam</span>`);
    }
  } else if (jt==="leftSemi") {
    _log(`<span class="finalize">\u2500\u2500 Finalizacja: A z dopasowaniem \u2500\u2500</span>`); await _delay();
    for (let ai=0;ai<A.length;ai++) { if (state.aborted) return;
      if (state.matchedA.has(ai)) {
        _setRow(`a_${ai}`,"highlight-a"); E.scrollIntoView(`a_${ai}`);
        const r={}; colsA.forEach(c=>r[c]=A[ai][c]); state.result.push(r);
        _renderResult(); _hlResult(); cntResult.textContent=state.result.length;
        _log(`<span class="action">&nbsp;&nbsp;A[${ai}] match \u2192 dodaj\u0119 (Semi)</span>`); await _delay(); E.markProcessed(`a_${ai}`);
      } else _log(`<span class="match-no">&nbsp;&nbsp;A[${ai}] brak \u2192 pomijam</span>`);
    }
  }
}

async function finalizeRight(jt, A, B, colsA, colsB) {
  if (state.aborted) return;
  if (jt==="rightOuter") {
    _log(`<span class="finalize">\u2500\u2500 Finalizacja: B bez dopasowania \u2500\u2500</span>`); await _delay();
    for (let bi=0;bi<B.length;bi++) { if (state.aborted) return;
      if (!state.matchedB.has(bi)) {
        _setRow(`b_${bi}`,"highlight-b"); E.scrollIntoView(`b_${bi}`);
        state.result.push(buildResultRow(null,B[bi],colsA,colsB));
        _renderResult(); _hlResult(); cntResult.textContent=state.result.length;
        _log(`<span class="action">&nbsp;&nbsp;B[${bi}] \u2192 null</span>`); await _delay(); E.markProcessed(`b_${bi}`);
      }
    }
  } else if (jt==="rightAnti") {
    _log(`<span class="finalize">\u2500\u2500 Finalizacja: B bez dopasowania \u2500\u2500</span>`); await _delay();
    for (let bi=0;bi<B.length;bi++) { if (state.aborted) return;
      if (!state.matchedB.has(bi)) {
        _setRow(`b_${bi}`,"highlight-b"); E.scrollIntoView(`b_${bi}`);
        const r={}; E.getColumns(B).forEach(c=>r[c]=B[bi][c]); state.result.push(r);
        _renderResult(); _hlResult(); cntResult.textContent=state.result.length;
        _log(`<span class="action">&nbsp;&nbsp;B[${bi}] brak \u2192 dodaj\u0119 (Anti)</span>`); await _delay(); E.markProcessed(`b_${bi}`);
      } else _log(`<span class="match-no">&nbsp;&nbsp;B[${bi}] match \u2192 pomijam</span>`);
    }
  } else if (jt==="rightSemi") {
    _log(`<span class="finalize">\u2500\u2500 Finalizacja: B z dopasowaniem \u2500\u2500</span>`); await _delay();
    for (let bi=0;bi<B.length;bi++) { if (state.aborted) return;
      if (state.matchedB.has(bi)) {
        _setRow(`b_${bi}`,"highlight-b"); E.scrollIntoView(`b_${bi}`);
        const r={}; E.getColumns(B).forEach(c=>r[c]=B[bi][c]); state.result.push(r);
        _renderResult(); _hlResult(); cntResult.textContent=state.result.length;
        _log(`<span class="action">&nbsp;&nbsp;B[${bi}] match \u2192 dodaj\u0119 (Semi)</span>`); await _delay(); E.markProcessed(`b_${bi}`);
      } else _log(`<span class="match-no">&nbsp;&nbsp;B[${bi}] brak \u2192 pomijam</span>`);
    }
  }
}

/* ===========================================================
   7. LOAD / RESET
   =========================================================== */
function loadPreset() {
  const d = DATASETS[dataPresetEl.value];
  if (!d) return;
  const m = d.merge;
  state.dataA = JSON.parse(JSON.stringify(m.A));
  state.dataB = JSON.parse(JSON.stringify(m.B));
  state.keyCol = m.keyCol;
  E.renderTable(panelA, state.dataA, "a");
  E.renderTable(panelB, state.dataB, "b");
  state.result = []; _renderResult();
  cntResult.textContent = "0"; cntA.textContent = "\u2013"; cntB.textContent = "\u2013";
}

function fullReset() {
  state.aborted = true; state.running = false; state.paused = false; state.stepMode = false;
  if (state.stepResolve) { state.stepResolve(); state.stepResolve = null; }
  setTimeout(() => {
    state.aborted = false;
    loadPreset(); E.clearLog(state, logPanel); _clearAll(); hideBubble(); clearLines();
    E.setStatus(statusBadge, statusText, "ready");
    E.updateButtons(state, btnStart, btnPause, btnStep);
  }, 50);
}

/* ===========================================================
   8. EVENTS
   =========================================================== */
joinTypeEl.addEventListener("change", () => {
  state.joinType = joinTypeEl.value;
  fuzzyControls.classList.toggle("visible", state.joinType === "fuzzy");
  updateJoinDesc(); if (!state.running) fullReset();
});
dataPresetEl.addEventListener("change", () => { if (!state.running) fullReset(); });
speedSlider.addEventListener("input", () => {
  state.speed = parseInt(speedSlider.value);
  speedVal.textContent = state.speed + " ms";
});
fuzzyThreshold.addEventListener("input", () => {
  state.fuzzyThresh = parseInt(fuzzyThreshold.value) / 100;
  thresholdVal.textContent = state.fuzzyThresh.toFixed(2);
});

E.wirePlaybackButtons({
  state, btnStart, btnPause, btnStep, btnReset,
  statusBadge, statusText,
  onReset: fullReset,
  onBeforeStart() {
    state.joinType = joinTypeEl.value;
  },
  onAnimate: runAnimation,
});

/* ===========================================================
   9. INIT
   =========================================================== */
state.joinType = joinTypeEl.value;
state.speed = parseInt(speedSlider.value);
state.fuzzyThresh = parseInt(fuzzyThreshold.value) / 100;
loadPreset(); updateJoinDesc();
E.updateButtons(state, btnStart, btnPause, btnStep);
speedVal.textContent = state.speed + " ms";
thresholdVal.textContent = state.fuzzyThresh.toFixed(2);

})();
