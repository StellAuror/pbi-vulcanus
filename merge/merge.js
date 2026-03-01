/* ============================================================
   MERGE (JOIN) VISUALIZER — App logic
   Depends on: PQEngine (shared/engine.js)
   ============================================================ */
(function () {
"use strict";

const E = PQEngine;

/* ===========================================================
   1. DATA PRESETS
   =========================================================== */
const PRESETS = {
  basic: {
    name: "Paragony \u2014 klucze unikalne",
    A: [
      { Produkt: "Chleb",  Paragon: "PAR-001", Ilo\u015b\u0107: 2 },
      { Produkt: "Mas\u0142o",  Paragon: "PAR-001", Ilo\u015b\u0107: 1 },
      { Produkt: "Mleko",  Paragon: "PAR-002", Ilo\u015b\u0107: 3 },
      { Produkt: "Ser",    Paragon: "PAR-002", Ilo\u015b\u0107: 1 },
      { Produkt: "Jab\u0142ka", Paragon: "PAR-003", Ilo\u015b\u0107: 5 },
    ],
    B: [
      { Produkt: "Chleb",  Cena: 4.50, Kategoria: "Pieczywo" },
      { Produkt: "Mas\u0142o",  Cena: 7.99, Kategoria: "Nabia\u0142" },
      { Produkt: "Mleko",  Cena: 3.49, Kategoria: "Nabia\u0142" },
      { Produkt: "Banany", Cena: 5.99, Kategoria: "Owoce" },
      { Produkt: "Ry\u017c",   Cena: 6.29, Kategoria: "Sypkie" },
    ],
  },
  dupA: {
    name: "Paragony \u2014 duplikaty w lewej",
    A: [
      { Produkt: "Chleb",  Paragon: "PAR-001", Ilo\u015b\u0107: 2 },
      { Produkt: "Chleb",  Paragon: "PAR-004", Ilo\u015b\u0107: 1 },
      { Produkt: "Mas\u0142o",  Paragon: "PAR-001", Ilo\u015b\u0107: 1 },
      { Produkt: "Mleko",  Paragon: "PAR-002", Ilo\u015b\u0107: 3 },
      { Produkt: "Mleko",  Paragon: "PAR-003", Ilo\u015b\u0107: 2 },
      { Produkt: "Mleko",  Paragon: "PAR-005", Ilo\u015b\u0107: 1 },
      { Produkt: "Jab\u0142ka", Paragon: "PAR-003", Ilo\u015b\u0107: 5 },
    ],
    B: [
      { Produkt: "Chleb",  Cena: 4.50, Kategoria: "Pieczywo" },
      { Produkt: "Mas\u0142o",  Cena: 7.99, Kategoria: "Nabia\u0142" },
      { Produkt: "Mleko",  Cena: 3.49, Kategoria: "Nabia\u0142" },
      { Produkt: "Banany", Cena: 5.99, Kategoria: "Owoce" },
    ],
  },
  dupB: {
    name: "Paragony \u2014 duplikaty w prawej + braki",
    A: [
      { Produkt: "Chleb",  Paragon: "PAR-001", Ilo\u015b\u0107: 2 },
      { Produkt: "Mas\u0142o",  Paragon: "PAR-001", Ilo\u015b\u0107: 1 },
      { Produkt: "Ser",    Paragon: "PAR-002", Ilo\u015b\u0107: 1 },
      { Produkt: "Jab\u0142ka", Paragon: "PAR-003", Ilo\u015b\u0107: 5 },
    ],
    B: [
      { Produkt: "Chleb",  Cena: 4.50, Kategoria: "Pieczywo" },
      { Produkt: "Chleb",  Cena: 4.99, Kategoria: "Pieczywo bio" },
      { Produkt: "Mas\u0142o",  Cena: 7.99, Kategoria: "Nabia\u0142" },
      { Produkt: "Mleko",  Cena: 3.49, Kategoria: "Nabia\u0142" },
      { Produkt: "Banany", Cena: 5.99, Kategoria: "Owoce" },
      { Produkt: "Banany", Cena: 6.49, Kategoria: "Owoce bio" },
    ],
  },
};

/* ===========================================================
   2. JOIN DESCRIPTIONS
   =========================================================== */
const JOIN_INFO = {
  inner:      { title:"Inner Join",       symbol:"A \u2229 B",  desc:"Wynik zawiera <strong>tylko</strong> wiersze z dopasowaniem po obu stronach.", dup:"Duplikaty \u2192 iloczyn kartezja\u0144ski." },
  leftOuter:  { title:"Left Outer Join",  symbol:"A \u27d5 B",  desc:"<strong>Wszystkie</strong> wiersze z lewej + dopasowania z prawej. Brak matcha \u2192 <em>null</em>.", dup:"Duplikaty w prawej mno\u017c\u0105 wiersze lewej." },
  rightOuter: { title:"Right Outer Join", symbol:"A \u27d6 B",  desc:"<strong>Wszystkie</strong> z prawej. Brak matcha \u2192 null z lewej.", dup:"Duplikaty w lewej mno\u017c\u0105 wynik." },
  fullOuter:  { title:"Full Outer Join",  symbol:"A \u27d7 B",  desc:"<strong>Wszystko</strong> z obu. Brak dopasowania \u2192 null.", dup:"Duplikaty \u2192 iloczyn. Wiersze bez matcha na ko\u0144cu." },
  leftAnti:   { title:"Left Anti Join",   symbol:"A \\\\ B",    desc:"Wiersze z lewej <strong>BEZ</strong> dopasowania.", dup:"Kolumny z prawej nie s\u0105 do\u0142\u0105czane." },
  rightAnti:  { title:"Right Anti Join",  symbol:"B \\\\ A",    desc:"Wiersze z prawej <strong>BEZ</strong> dopasowania.", dup:"Kolumny z lewej nie s\u0105 do\u0142\u0105czane." },
  leftSemi:   { title:"Left Semi Join",   symbol:"A \u22c9 B",  desc:"Wiersze z lewej <strong>Z</strong> dopasowaniem, bez kolumn prawej. Max 1 wyst\u0105pienie.", dup:"Bez mno\u017cenia \u2014 to r\u00f3\u017cnica vs Inner Join." },
  rightSemi:  { title:"Right Semi Join",  symbol:"A \u22ca B",  desc:"Wiersze z prawej <strong>Z</strong> dopasowaniem, bez kolumn lewej.", dup:"Analogicznie do Left Semi." },
  fuzzy:      { title:"Fuzzy Join",       symbol:"A \u2248 B",  desc:"Left Outer z <strong>przybli\u017conym</strong> dopasowaniem (Levenshtein).", dup:"Mo\u017cliwe wielokrotne matche.", warn:"Niski pr\u00f3g = wi\u0119cej b\u0142\u0119dnych dopasowa\u0144." },
};

/* ===========================================================
   3. DOM
   =========================================================== */
const $ = s => document.querySelector(s);
const joinTypeEl     = $("#joinType");
const dataPresetEl   = $("#dataPreset");
const keyColumnEl    = $("#keyColumn");
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
const eduPanel       = $("#eduPanel");
const compareBubble  = $("#compareBubble");

/* ===========================================================
   4. STATE
   =========================================================== */
const MERGE_HL = ["highlight-a","highlight-b","match","nomatch","result-new"];

let state = E.createState({
  dataA: [], dataB: [],
  joinType: "leftOuter", keyCol: "Produkt",
  fuzzyThresh: 0.6,
  matchedA: new Set(), matchedB: new Set(),
});

/* ===========================================================
   5. HELPERS
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

function buildResultRow(aRow, bRow, colsA, colsB) {
  const r = {};
  colsA.forEach(c => r[c] = aRow ? aRow[c] : null);
  colsB.forEach(c => r[c] = bRow ? bRow[c] : null);
  return r;
}

function updateEduPanel() {
  const info = JOIN_INFO[state.joinType]; if (!info) return;
  let h = `<h4>${info.symbol} &nbsp;${info.title}</h4><p>${info.desc}</p>`;
  h += `<p class="dup-note"><strong>Duplikaty:</strong> ${info.dup}</p>`;
  if (info.warn) h += `<p class="warn-note">${info.warn}</p>`;
  eduPanel.innerHTML = h;
}

/* ===========================================================
   6. ANIMATION ENGINE
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

  if (!state.aborted)
    _log(`<span class="finalize">\u2550\u2550\u2550 Gotowe \u2014 wynik: ${state.result.length} wierszy \u2550\u2550\u2550</span>`);
}

async function animateStandard(jt, A, B, key, colsA, colsB, isFuzzy) {
  for (let bi = 0; bi < B.length; bi++) {
    if (state.aborted) return;
    const bRow = B[bi], bKey = String(bRow[key] ?? "");
    _clearActive();
    _setRow(`b_${bi}`, "highlight-b"); E.scrollIntoView(`b_${bi}`);
    cntB.textContent = `${bi+1} / ${B.length}`;
    _log(`<span class="key-check">Bior\u0119 <strong>B[${bi}]</strong> \u2192 ${key} = "${bKey}"</span>`);
    await _delay();

    let anyMatch = false;
    for (let ai = 0; ai < A.length; ai++) {
      if (state.aborted) return;
      const aRow = A[ai], aKey = String(aRow[key] ?? "");
      _setRow(`a_${ai}`, "highlight-a"); E.scrollIntoView(`a_${ai}`);
      cntA.textContent = `${ai+1} / ${A.length}`;

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
    _clearActive();
    _setRow(`a_${ai}`, "highlight-a"); E.scrollIntoView(`a_${ai}`);
    cntA.textContent = `${ai+1} / ${A.length}`;
    _log(`<span class="key-check">Bior\u0119 <strong>A[${ai}]</strong> \u2192 ${key} = "${aKey}"</span>`);
    await _delay();

    let anyMatch = false;
    for (let bi = 0; bi < B.length; bi++) {
      if (state.aborted) return;
      const bRow = B[bi], bKey = String(bRow[key] ?? "");
      _setRow(`b_${bi}`, "highlight-b"); E.scrollIntoView(`b_${bi}`);
      cntB.textContent = `${bi+1} / ${B.length}`;
      const isMatch = aKey === bKey;
      showBubble(document.getElementById(`b_${bi}`), `"${aKey}" = "${bKey}" \u2192 <span class="${isMatch?'eq':'neq'}">${isMatch?'\u2713':'\u2717'}</span>`);
      _log(`<span class="key-check">&nbsp;&nbsp;\u2194 B[${bi}] "${bKey}"</span> \u2192 ${isMatch ? '<span class="match-yes">MATCH \u2713</span>' : '<span class="match-no">brak</span>'}`);
      await _delay();

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
   7. FINALIZE
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
   8. LOAD / RESET
   =========================================================== */
function loadPreset() {
  const p = PRESETS[dataPresetEl.value];
  state.dataA = JSON.parse(JSON.stringify(p.A));
  state.dataB = JSON.parse(JSON.stringify(p.B));
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
    loadPreset(); E.clearLog(state, logPanel); _clearAll(); hideBubble();
    E.setStatus(statusBadge, statusText, "ready");
    E.updateButtons(state, btnStart, btnPause, btnStep);
  }, 50);
}

/* ===========================================================
   9. EVENTS
   =========================================================== */
joinTypeEl.addEventListener("change", () => {
  state.joinType = joinTypeEl.value;
  fuzzyControls.classList.toggle("visible", state.joinType === "fuzzy");
  updateEduPanel(); if (!state.running) fullReset();
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
    state.keyCol = keyColumnEl.value;
  },
  onAnimate: runAnimation,
});

/* ===========================================================
   10. INIT
   =========================================================== */
state.joinType = joinTypeEl.value;
state.speed = parseInt(speedSlider.value);
state.fuzzyThresh = parseInt(fuzzyThreshold.value) / 100;
loadPreset(); updateEduPanel();
E.updateButtons(state, btnStart, btnPause, btnStep);
speedVal.textContent = state.speed + " ms";
thresholdVal.textContent = state.fuzzyThresh.toFixed(2);

})();
