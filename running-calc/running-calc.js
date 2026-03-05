/* ============================================================
   RUNNING CALCULATIONS VISUALIZER — App logic
   Pattern: same as DAX Context — two standard data-tables
   (source + result) with a formula panel in the center.

   Left panel:  Full table with all 24 months. Click a row to
                set the evaluation context.
   Center:      DAX formula + aggregated metric.
   Right panel: The rows the measure "sees" — included rows
                highlighted, excluded rows dimmed. Footer with
                the aggregated result.

   6 patterns:
     1. Running Total (YTD)
     2. DATESINPERIOD (sliding window)
     3. Moving Average
     4. MoM % Change
     5. YoY % Change
     6. % of Grand Total
   ============================================================ */
(function () {
"use strict";

/* ===========================================================
   1. CONSTANTS & DATA
   =========================================================== */
var MONTH_NAMES = [
  "Sty", "Lut", "Mar", "Kwi", "Maj", "Cze",
  "Lip", "Sie", "Wrz", "Pa\u017a", "Lis", "Gru"
];

var SALES = [
  { rok: 2023, m: 1,  q: 1, val: 45200 },
  { rok: 2023, m: 2,  q: 1, val: 38700 },
  { rok: 2023, m: 3,  q: 1, val: 52100 },
  { rok: 2023, m: 4,  q: 2, val: 41800 },
  { rok: 2023, m: 5,  q: 2, val: 47500 },
  { rok: 2023, m: 6,  q: 2, val: 55300 },
  { rok: 2023, m: 7,  q: 3, val: 36200 },
  { rok: 2023, m: 8,  q: 3, val: 33400 },
  { rok: 2023, m: 9,  q: 3, val: 48900 },
  { rok: 2023, m: 10, q: 4, val: 51700 },
  { rok: 2023, m: 11, q: 4, val: 62300 },
  { rok: 2023, m: 12, q: 4, val: 78500 },
  { rok: 2024, m: 1,  q: 1, val: 49800 },
  { rok: 2024, m: 2,  q: 1, val: 42100 },
  { rok: 2024, m: 3,  q: 1, val: 56700 },
  { rok: 2024, m: 4,  q: 2, val: 44200 },
  { rok: 2024, m: 5,  q: 2, val: 51900 },
  { rok: 2024, m: 6,  q: 2, val: 58100 },
  { rok: 2024, m: 7,  q: 3, val: 39500 },
  { rok: 2024, m: 8,  q: 3, val: 37200 },
  { rok: 2024, m: 9,  q: 3, val: 53400 },
  { rok: 2024, m: 10, q: 4, val: 55800 },
  { rok: 2024, m: 11, q: 4, val: 67100 },
  { rok: 2024, m: 12, q: 4, val: 84200 },
];

var GRAND_TOTAL = 0;
for (var gi = 0; gi < SALES.length; gi++) {
  SALES[gi].idx = gi;
  SALES[gi].label = MONTH_NAMES[SALES[gi].m - 1] + " " + SALES[gi].rok;
  GRAND_TOTAL += SALES[gi].val;
}

/* ===========================================================
   2. FUNCTION DEFINITIONS
   =========================================================== */
var RC_FUNCTIONS = {

  RUNNING_TOTAL: {
    name: "DATESYTD \u2014 Suma narastaj\u0105ca YTD",
    measureName: "Sprzeda\u017c YTD",
    desc: "<strong>DATESYTD</strong> zwraca wszystkie daty od pocz\u0105tku roku " +
          "do bie\u017c\u0105cego miesi\u0105ca. CALCULATE sumuje sprzeda\u017c z tych miesi\u0119cy.",
    hasWindow: false,
    compute: function (idx) {
      var row = SALES[idx];
      var sum = 0; var inputs = [];
      for (var i = 0; i < SALES.length; i++) {
        if (SALES[i].rok === row.rok && SALES[i].m <= row.m) {
          sum += SALES[i].val;
          inputs.push(i);
        }
      }
      return { value: sum, inputs: inputs, op: "SUM", isPercent: false };
    },
    formula: function () {
      return '<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">DATESYTD</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },

  DATESINPERIOD: {
    name: "DATESINPERIOD \u2014 Okno N miesi\u0119cy",
    measureName: "Sprzeda\u017c Okno",
    desc: "<strong>DATESINPERIOD</strong> zwraca ci\u0105g\u0142y zakres dat wstecz od " +
          "bie\u017c\u0105cej daty. CALCULATE sumuje sprzeda\u017c z tego okna.",
    hasWindow: true,
    compute: function (idx, windowSize) {
      var sum = 0; var inputs = [];
      for (var w = 0; w < windowSize; w++) {
        var ti = idx - w;
        if (ti >= 0) {
          sum += SALES[ti].val;
          inputs.push(ti);
        }
      }
      inputs.sort(function(a,b){ return a-b; });
      return { value: sum, inputs: inputs, op: "SUM", isPercent: false };
    },
    formula: function (win) {
      return '<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">DATESINPERIOD</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span>,<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">MAX</span> ( <span class="col">Kalendarz[Data]</span> ),<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">-' + win + '</span>,<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">MONTH</span><br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },

  MOVING_AVG: {
    name: "AVERAGEX \u2014 \u015arednia krocz\u0105ca",
    measureName: "\u015arednia N mies.",
    desc: "<strong>AVERAGEX</strong> + <strong>DATESINPERIOD</strong> oblicza \u015bredni\u0105 " +
          "sprzeda\u017c w ruchomym oknie N miesi\u0119cy.",
    hasWindow: true,
    compute: function (idx, windowSize) {
      var sum = 0; var count = 0; var inputs = [];
      for (var w = 0; w < windowSize; w++) {
        var ti = idx - w;
        if (ti >= 0) {
          sum += SALES[ti].val;
          count++;
          inputs.push(ti);
        }
      }
      inputs.sort(function(a,b){ return a-b; });
      var avg = count > 0 ? Math.round(sum / count) : 0;
      return { value: avg, inputs: inputs, op: "AVG", isPercent: false, sum: sum, count: count };
    },
    formula: function (win) {
      return '<span class="fn">AVERAGEX</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">DATESINPERIOD</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span>,<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">MAX</span> ( <span class="col">Kalendarz[Data]</span> ),<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">-' + win + '</span>,<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">MONTH</span><br>' +
             '&nbsp;&nbsp;),<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> )<br>' +
             ')';
    },
  },

  MOM_PCT: {
    name: "DATEADD \u2014 Zmiana MoM %",
    measureName: "MoM %",
    desc: "Zmiana procentowa miesi\u0105c do miesi\u0105ca. <strong>DATEADD(-1, MONTH)</strong> " +
          "pobiera warto\u015b\u0107 z poprzedniego miesi\u0105ca do por\u00f3wnania.",
    hasWindow: false,
    compute: function (idx) {
      if (idx === 0) return { value: null, inputs: [], op: "MOM", isPercent: true };
      var curr = SALES[idx].val;
      var prev = SALES[idx - 1].val;
      var pct = prev !== 0 ? ((curr - prev) / prev * 100) : 0;
      return { value: Math.round(pct * 10) / 10, inputs: [idx - 1, idx], op: "MOM", isPercent: true,
               curr: curr, prev: prev };
    },
    formula: function () {
      var h = '';
      h += '<span class="kw">VAR</span> _Curr = <span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> )<br>';
      h += '<span class="kw">VAR</span> _Prev =<br>';
      h += '&nbsp;&nbsp;<span class="fn">CALCULATE</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">DATEADD</span> ( <span class="col">Kalendarz[Data]</span>,<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">-1</span>, <span class="param">MONTH</span> )<br>';
      h += '&nbsp;&nbsp;)<br>';
      h += '<span class="kw">RETURN</span><br>';
      h += '&nbsp;&nbsp;<span class="fn">DIVIDE</span> ( _Curr \u2212 _Prev, _Prev )';
      return h;
    },
  },

  YOY_PCT: {
    name: "SAMEPERIODLASTYEAR \u2014 Zmiana YoY %",
    measureName: "YoY %",
    desc: "Zmiana procentowa rok do roku. <strong>SAMEPERIODLASTYEAR</strong> " +
          "zwraca ten sam miesi\u0105c w poprzednim roku.",
    hasWindow: false,
    compute: function (idx) {
      var row = SALES[idx];
      var lyIdx = -1;
      for (var i = 0; i < SALES.length; i++) {
        if (SALES[i].rok === row.rok - 1 && SALES[i].m === row.m) { lyIdx = i; break; }
      }
      if (lyIdx < 0) return { value: null, inputs: [], op: "YOY", isPercent: true };
      var curr = row.val;
      var prev = SALES[lyIdx].val;
      var pct = prev !== 0 ? ((curr - prev) / prev * 100) : 0;
      return { value: Math.round(pct * 10) / 10, inputs: [lyIdx, idx], op: "YOY", isPercent: true,
               curr: curr, prev: prev };
    },
    formula: function () {
      var h = '';
      h += '<span class="kw">VAR</span> _Curr = <span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> )<br>';
      h += '<span class="kw">VAR</span> _LY =<br>';
      h += '&nbsp;&nbsp;<span class="fn">CALCULATE</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">SAMEPERIODLASTYEAR</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span> )<br>';
      h += '&nbsp;&nbsp;)<br>';
      h += '<span class="kw">RETURN</span><br>';
      h += '&nbsp;&nbsp;<span class="fn">DIVIDE</span> ( _Curr \u2212 _LY, _LY )';
      return h;
    },
  },

  PCT_OF_TOTAL: {
    name: "ALL \u2014 % sumy ca\u0142kowitej",
    measureName: "% Total",
    desc: "<strong>CALCULATE</strong> + <strong>ALL</strong> usuwa wszystkie filtry, " +
          "daj\u0105c sum\u0119 globaln\u0105. DIVIDE oblicza udzia\u0142 procentowy.",
    hasWindow: false,
    compute: function (idx) {
      var curr = SALES[idx].val;
      var pct = GRAND_TOTAL !== 0 ? (curr / GRAND_TOTAL * 100) : 0;
      /* All rows are "context" for ALL — we show them all */
      var all = [];
      for (var i = 0; i < SALES.length; i++) all.push(i);
      return { value: Math.round(pct * 100) / 100, inputs: all, op: "PCT", isPercent: true,
               curr: curr, total: GRAND_TOTAL };
    },
    formula: function () {
      return '<span class="fn">DIVIDE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">ALL</span> ( <span class="col">Kalendarz</span> )<br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },

  /* ---- Time Intelligence ---- */

  DATESQTD: {
    name: "DATESQTD \u2014 Suma QTD",
    measureName: "Sprzeda\u017c QTD",
    desc: "<strong>DATESQTD</strong> zwraca daty od pocz\u0105tku bie\u017c\u0105cego kwarta\u0142u " +
          "do bie\u017c\u0105cej daty. CALCULATE sumuje sprzeda\u017c z tych miesi\u0119cy.",
    hasWindow: false,
    compute: function (idx) {
      var row = SALES[idx];
      var qStart = (row.q - 1) * 3 + 1;
      var sum = 0; var inputs = [];
      for (var i = 0; i < SALES.length; i++) {
        if (SALES[i].rok === row.rok && SALES[i].m >= qStart && SALES[i].m <= row.m) {
          sum += SALES[i].val;
          inputs.push(i);
        }
      }
      return { value: sum, inputs: inputs, op: "SUM", isPercent: false };
    },
    formula: function () {
      return '<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">DATESQTD</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },

  PREVIOUSMONTH: {
    name: "PREVIOUSMONTH \u2014 Poprz. miesi\u0105c",
    measureName: "Sprzeda\u017c poprz. mies.",
    desc: "<strong>PREVIOUSMONTH</strong> zwraca daty z poprzedniego miesi\u0105ca. " +
          "CALCULATE oblicza sum\u0119 sprzeda\u017cy z tego okresu.",
    hasWindow: false,
    compute: function (idx) {
      if (idx === 0) return { value: null, inputs: [], op: "SUM", isPercent: false };
      return { value: SALES[idx - 1].val, inputs: [idx - 1], op: "SUM", isPercent: false };
    },
    formula: function () {
      return '<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">PREVIOUSMONTH</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },

  PREVIOUSQUARTER: {
    name: "PREVIOUSQUARTER \u2014 Poprz. kwarta\u0142",
    measureName: "Sprzeda\u017c poprz. kw.",
    desc: "<strong>PREVIOUSQUARTER</strong> zwraca daty z poprzedniego kwarta\u0142u. " +
          "CALCULATE sumuje sprzeda\u017c z tych miesi\u0119cy.",
    hasWindow: false,
    compute: function (idx) {
      var row = SALES[idx];
      var prevQ, prevY;
      if (row.q === 1) { prevQ = 4; prevY = row.rok - 1; }
      else { prevQ = row.q - 1; prevY = row.rok; }
      var sum = 0; var inputs = [];
      for (var i = 0; i < SALES.length; i++) {
        if (SALES[i].rok === prevY && SALES[i].q === prevQ) {
          sum += SALES[i].val;
          inputs.push(i);
        }
      }
      if (inputs.length === 0) return { value: null, inputs: [], op: "SUM", isPercent: false };
      return { value: sum, inputs: inputs, op: "SUM", isPercent: false };
    },
    formula: function () {
      return '<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">PREVIOUSQUARTER</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },

  PARALLELPERIOD: {
    name: "PARALLELPERIOD \u2014 Ca\u0142y poprzedni rok",
    measureName: "Sprzeda\u017c poprz. rok",
    desc: "<strong>PARALLELPERIOD</strong> z interwa\u0142em YEAR zwraca <em>ca\u0142y</em> " +
          "poprzedni rok (wszystkie 12 miesi\u0119cy). CALCULATE sumuje sprzeda\u017c " +
          "z tego pe\u0142nego okresu \u2014 to kluczowa r\u00f3\u017cnica vs DATEADD, kt\u00f3ry przesuwa tylko bie\u017c\u0105cy punkt.",
    hasWindow: false,
    compute: function (idx) {
      var row = SALES[idx];
      var prevYear = row.rok - 1;
      var sum = 0; var inputs = [];
      for (var i = 0; i < SALES.length; i++) {
        if (SALES[i].rok === prevYear) {
          sum += SALES[i].val;
          inputs.push(i);
        }
      }
      if (inputs.length === 0) return { value: null, inputs: [], op: "SUM", isPercent: false };
      return { value: sum, inputs: inputs, op: "SUM", isPercent: false };
    },
    formula: function () {
      return '<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">PARALLELPERIOD</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span>,<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">-1</span>,<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">YEAR</span><br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },

  DATEADD_SHIFT: {
    name: "DATEADD \u2014 Przesuni\u0119ty okres",
    measureName: "Sprzeda\u017c Shifted",
    desc: "<strong>DATEADD</strong> przesuwa daty w kontek\u015bcie o podan\u0105 liczb\u0119 " +
          "miesi\u0119cy. Zwraca warto\u015b\u0107 sprzeda\u017cy z przesuni\u0119tego okresu.",
    hasWindow: true,
    compute: function (idx, windowSize) {
      var shifted = idx - windowSize;
      if (shifted < 0 || shifted >= SALES.length) return { value: null, inputs: [], op: "SUM", isPercent: false };
      return { value: SALES[shifted].val, inputs: [shifted], op: "SUM", isPercent: false };
    },
    formula: function (win) {
      return '<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">DATEADD</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span>,<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">-' + win + '</span>,<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">MONTH</span><br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },

  SPLY_VAL: {
    name: "SAMEPERIODLASTYEAR \u2014 Warto\u015b\u0107 rok temu",
    measureName: "Sprzeda\u017c LY",
    desc: "<strong>SAMEPERIODLASTYEAR</strong> zwraca ten sam miesi\u0105c w poprzednim " +
          "roku. Pokazuje warto\u015b\u0107 sprzeda\u017cy sprzed roku \u2014 bez por\u00f3wnania procentowego.",
    hasWindow: false,
    compute: function (idx) {
      var row = SALES[idx];
      var lyIdx = -1;
      for (var i = 0; i < SALES.length; i++) {
        if (SALES[i].rok === row.rok - 1 && SALES[i].m === row.m) { lyIdx = i; break; }
      }
      if (lyIdx < 0) return { value: null, inputs: [], op: "SUM", isPercent: false };
      return { value: SALES[lyIdx].val, inputs: [lyIdx], op: "SUM", isPercent: false };
    },
    formula: function () {
      return '<span class="fn">CALCULATE</span> (<br>' +
             '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>' +
             '&nbsp;&nbsp;<span class="fn">SAMEPERIODLASTYEAR</span> (<br>' +
             '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>' +
             '&nbsp;&nbsp;)<br>' +
             ')';
    },
  },
};

/* ===========================================================
   3. DOM REFERENCES
   =========================================================== */
var $ = function (s) { return document.querySelector(s); };
var rcFunctionEl  = $("#rcFunction");
var windowSection = $("#windowSection");
var windowSizeEl  = $("#windowSize");
var panelSource   = $("#panelSource");
var panelFormula  = $("#panelFormula");
var panelResult   = $("#panelResult");
var ctxLabelEl    = $("#ctxLabel");
var rcResultEl    = $("#rcResultLabel");

/* ===========================================================
   4. STATE
   =========================================================== */
var state = {
  selectedRow: 14,       // Mar 2024
  funcName: "DATEADD_SHIFT",
  windowSize: 3,
};

/* ===========================================================
   5. HELPERS
   =========================================================== */
function fmt(n) {
  if (n === null || n === undefined) return "\u2014";
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}
function fmtPct(n) {
  if (n === null || n === undefined) return "\u2014";
  var sign = n > 0 ? "+" : "";
  return sign + n.toFixed(1) + "%";
}
function fmtPctNoSign(n) {
  if (n === null || n === undefined) return "\u2014";
  return n.toFixed(2) + "%";
}
function formatResult(r) {
  if (r.value === null) return "\u2014";
  if (!r.isPercent) return fmt(r.value);
  return (r.op === "PCT") ? fmtPctNoSign(r.value) : fmtPct(r.value);
}

/* ===========================================================
   6. COMPUTE
   =========================================================== */
function computeForRow(idx) {
  var fn = RC_FUNCTIONS[state.funcName];
  return fn.compute(idx, state.windowSize);
}

/* ===========================================================
   7. RENDER — Source table (left panel, clickable rows)
   =========================================================== */
function renderSource() {
  var h = '<table class="data-table"><thead><tr>';
  h += '<th>#</th><th>Okres</th><th>Q</th><th>Sprzeda\u017c</th>';
  h += '</tr></thead><tbody>';

  for (var i = 0; i < SALES.length; i++) {
    var s = SALES[i];
    var isQ = (s.m % 3 === 0);
    var isCtx = (i === state.selectedRow);
    var cls = "row-clickable";
    if (isQ) cls += " q-sep";
    if (isCtx) cls += " row-ctx";

    h += '<tr class="' + cls + '" data-idx="' + i + '">';
    h += '<td style="color:var(--gray-400)">' + i + '</td>';
    h += '<td>' + s.label + '</td>';
    h += '<td style="color:var(--gray-500)">Q' + s.q + '</td>';
    h += '<td>' + fmt(s.val) + '</td>';
    h += '</tr>';
  }

  h += '</tbody></table>';
  panelSource.innerHTML = h;

  /* Click handlers */
  var rows = panelSource.querySelectorAll("tr.row-clickable");
  for (var ri = 0; ri < rows.length; ri++) {
    rows[ri].addEventListener("click", onRowClick);
  }

  /* Scroll active into view */
  var active = panelSource.querySelector("tr.row-ctx");
  if (active) active.scrollIntoView({ block: "nearest" });
}

function onRowClick() {
  var idx = parseInt(this.getAttribute("data-idx"), 10);
  if (!isNaN(idx) && idx >= 0 && idx < SALES.length) {
    state.selectedRow = idx;
    renderAll();
  }
}

/* ===========================================================
   8. RENDER — Result table (right panel)
   Shows all rows from the source. Rows included in the
   calculation are highlighted; others are dimmed.
   Footer shows the aggregated result.
   =========================================================== */
function renderResult(result) {
  var fn = RC_FUNCTIONS[state.funcName];
  var inputSet = {};
  for (var ii = 0; ii < result.inputs.length; ii++) {
    inputSet[result.inputs[ii]] = true;
  }

  var includedCount = result.inputs.length;

  var h = '<table class="data-table"><thead><tr>';
  h += '<th>#</th><th>Okres</th><th>Sprzeda\u017c</th>';
  h += '</tr></thead><tbody>';

  for (var i = 0; i < SALES.length; i++) {
    var s = SALES[i];
    var isIncluded = !!inputSet[i];
    var isQ = (s.m % 3 === 0);
    var cls = isIncluded ? "row-included" : "row-excluded";
    if (isQ) cls += " q-sep";

    h += '<tr class="' + cls + '">';
    h += '<td style="color:var(--gray-400)">' + i + '</td>';
    h += '<td>' + s.label + '</td>';
    h += '<td class="col-val">' + fmt(s.val) + '</td>';
    h += '</tr>';
  }

  h += '</tbody>';

  /* Footer row with aggregated result */
  h += '<tfoot><tr>';
  if (result.op === "SUM") {
    h += '<td colspan="2">SUM (' + includedCount + ' wierszy)</td>';
    h += '<td class="col-measure">' + fmt(result.value) + '</td>';
  } else if (result.op === "AVG") {
    h += '<td colspan="2">AVG (' + result.count + ' wierszy)</td>';
    h += '<td class="col-measure">' + fmt(result.value) + '</td>';
  } else if (result.op === "MOM") {
    if (result.value === null) {
      h += '<td colspan="2">\u0394 m/m</td><td class="col-measure">\u2014</td>';
    } else {
      h += '<td colspan="2">(' + fmt(result.curr) + ' \u2212 ' + fmt(result.prev) + ') \u00f7 ' + fmt(result.prev) + '</td>';
      h += '<td class="col-measure">' + fmtPct(result.value) + '</td>';
    }
  } else if (result.op === "YOY") {
    if (result.value === null) {
      h += '<td colspan="2">\u0394 r/r</td><td class="col-measure">\u2014</td>';
    } else {
      h += '<td colspan="2">(' + fmt(result.curr) + ' \u2212 ' + fmt(result.prev) + ') \u00f7 ' + fmt(result.prev) + '</td>';
      h += '<td class="col-measure">' + fmtPct(result.value) + '</td>';
    }
  } else if (result.op === "PCT") {
    h += '<td colspan="2">' + fmt(result.curr) + ' \u00f7 ' + fmt(result.total) + '</td>';
    h += '<td class="col-measure">' + fmtPctNoSign(result.value) + '</td>';
  }
  h += '</tr></tfoot>';

  h += '</table>';
  panelResult.innerHTML = h;
}

/* ===========================================================
   9. RENDER — Formula panel (center)
   =========================================================== */
function renderFormula(result) {
  var fn = RC_FUNCTIONS[state.funcName];
  var row = SALES[state.selectedRow];

  var h = '';
  h += '<span class="formula-label">' + fn.measureName + '</span>';

  h += '<div class="formula-block">';
  h += fn.measureName + ' =<br>';
  h += fn.formula(state.windowSize);
  h += '</div>';

  /* Metric box */
  h += '<div class="metric-result">';
  h += '<div class="metric-label">' + fn.measureName + ' (' + row.label + ')</div>';
  h += '<div class="metric-value">' + formatResult(result) + '</div>';
  h += '</div>';

  /* Description */
  h += '<div class="rc-desc">' + fn.desc + '</div>';

  panelFormula.innerHTML = h;
}

/* ===========================================================
   10. RENDER ALL
   =========================================================== */
function renderAll() {
  var result = computeForRow(state.selectedRow);

  renderSource();
  renderResult(result);
  renderFormula(result);

  /* Top bar */
  var row = SALES[state.selectedRow];
  ctxLabelEl.textContent = row.label;
  rcResultEl.textContent = formatResult(result);

  /* Show/hide window section */
  var fn = RC_FUNCTIONS[state.funcName];
  if (fn.hasWindow) {
    windowSection.classList.remove("hidden");
  } else {
    windowSection.classList.add("hidden");
  }
}

/* ===========================================================
   11. EVENTS
   =========================================================== */
rcFunctionEl.addEventListener("change", function () {
  state.funcName = this.value;
  renderAll();
});

windowSizeEl.addEventListener("change", function () {
  state.windowSize = parseInt(this.value, 10);
  renderAll();
});

/* ===========================================================
   12. INIT
   =========================================================== */
renderAll();

})();
