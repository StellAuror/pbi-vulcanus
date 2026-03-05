/* ============================================================
   TIME INTELLIGENCE VISUALIZER — App logic
   Self-contained module (no shared datasets dependency).

   7 functions: DATEADD, SAMEPERIODLASTYEAR, DATESYTD,
   DATESQTD, PREVIOUSMONTH, PREVIOUSQUARTER, PARALLELPERIOD.

   User clicks a month cell to set the evaluation context,
   selects a TI function, and sees which dates are returned
   plus the aggregated result.
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

var MONTH_FULL = [
  "Stycze\u0144", "Luty", "Marzec", "Kwiecie\u0144", "Maj", "Czerwiec",
  "Lipiec", "Sierpie\u0144", "Wrzesie\u0144", "Pa\u017adziernik", "Listopad", "Grudzie\u0144"
];

var YEARS = [2023, 2024];

/* Monthly sales data — 24 rows (Jan 2023 – Dec 2024) */
var SALES_DATA = [
  { rok: 2023, miesiac: 1,  kwartal: 1, sprzedaz: 45200 },
  { rok: 2023, miesiac: 2,  kwartal: 1, sprzedaz: 38700 },
  { rok: 2023, miesiac: 3,  kwartal: 1, sprzedaz: 52100 },
  { rok: 2023, miesiac: 4,  kwartal: 2, sprzedaz: 41800 },
  { rok: 2023, miesiac: 5,  kwartal: 2, sprzedaz: 47500 },
  { rok: 2023, miesiac: 6,  kwartal: 2, sprzedaz: 55300 },
  { rok: 2023, miesiac: 7,  kwartal: 3, sprzedaz: 36200 },
  { rok: 2023, miesiac: 8,  kwartal: 3, sprzedaz: 33400 },
  { rok: 2023, miesiac: 9,  kwartal: 3, sprzedaz: 48900 },
  { rok: 2023, miesiac: 10, kwartal: 4, sprzedaz: 51700 },
  { rok: 2023, miesiac: 11, kwartal: 4, sprzedaz: 62300 },
  { rok: 2023, miesiac: 12, kwartal: 4, sprzedaz: 78500 },
  { rok: 2024, miesiac: 1,  kwartal: 1, sprzedaz: 49800 },
  { rok: 2024, miesiac: 2,  kwartal: 1, sprzedaz: 42100 },
  { rok: 2024, miesiac: 3,  kwartal: 1, sprzedaz: 56700 },
  { rok: 2024, miesiac: 4,  kwartal: 2, sprzedaz: 44200 },
  { rok: 2024, miesiac: 5,  kwartal: 2, sprzedaz: 51900 },
  { rok: 2024, miesiac: 6,  kwartal: 2, sprzedaz: 58100 },
  { rok: 2024, miesiac: 7,  kwartal: 3, sprzedaz: 39500 },
  { rok: 2024, miesiac: 8,  kwartal: 3, sprzedaz: 37200 },
  { rok: 2024, miesiac: 9,  kwartal: 3, sprzedaz: 53400 },
  { rok: 2024, miesiac: 10, kwartal: 4, sprzedaz: 55800 },
  { rok: 2024, miesiac: 11, kwartal: 4, sprzedaz: 67100 },
  { rok: 2024, miesiac: 12, kwartal: 4, sprzedaz: 84200 },
];

/* Add display fields */
for (var i = 0; i < SALES_DATA.length; i++) {
  var d = SALES_DATA[i];
  d.okres = MONTH_NAMES[d.miesiac - 1] + " " + d.rok;
  d.kwartalLabel = "Q" + d.kwartal;
  d.idx = i;
}

/* ===========================================================
   2. FUNCTION DEFINITIONS & DESCRIPTIONS
   =========================================================== */
var TI_FUNCTIONS = {
  DATEADD: {
    label: "DATEADD",
    hasParams: true,
    measureName: "Sprzeda\u017c Shifted",
    desc: "<strong>DATEADD</strong> przesuwa ka\u017cd\u0105 dat\u0119 w kontek\u015bcie o podan\u0105 " +
          "liczb\u0119 interwa\u0142\u00f3w. Wynik to pojedyncza przesuni\u0119ta data (lub zbi\u00f3r dat " +
          "je\u015bli kontekst obejmuje wiele dat).",
  },
  SAMEPERIODLASTYEAR: {
    label: "SAMEPERIODLASTYEAR",
    hasParams: false,
    measureName: "Sprzeda\u017c LY",
    desc: "<strong>SAMEPERIODLASTYEAR</strong> zwraca ten sam okres (miesi\u0105c) " +
          "w poprzednim roku. R\u00f3wnowa\u017cne z <code>DATEADD(-1, YEAR)</code>.",
  },
  DATESYTD: {
    label: "DATESYTD",
    hasParams: false,
    measureName: "Sprzeda\u017c YTD",
    desc: "<strong>DATESYTD</strong> zwraca wszystkie daty od pocz\u0105tku roku " +
          "(1 stycznia) do bie\u017c\u0105cej daty w kontek\u015bcie. Tworzy kumulacj\u0119 Year-To-Date.",
  },
  DATESQTD: {
    label: "DATESQTD",
    hasParams: false,
    measureName: "Sprzeda\u017c QTD",
    desc: "<strong>DATESQTD</strong> zwraca daty od pocz\u0105tku bie\u017c\u0105cego kwarta\u0142u " +
          "do bie\u017c\u0105cej daty. Tworzy kumulacj\u0119 Quarter-To-Date.",
  },
  PREVIOUSMONTH: {
    label: "PREVIOUSMONTH",
    hasParams: false,
    measureName: "Sprzeda\u017c PM",
    desc: "<strong>PREVIOUSMONTH</strong> zwraca daty z poprzedniego miesi\u0105ca " +
          "wzgl\u0119dem kontekstu. Przydatne do por\u00f3wna\u0144 miesi\u0105c do miesi\u0105ca (MoM).",
  },
  PREVIOUSQUARTER: {
    label: "PREVIOUSQUARTER",
    hasParams: false,
    measureName: "Sprzeda\u017c PQ",
    desc: "<strong>PREVIOUSQUARTER</strong> zwraca pe\u0142ne 3 miesi\u0105ce " +
          "poprzedniego kwarta\u0142u. Przydatne do por\u00f3wna\u0144 QoQ.",
  },
  PARALLELPERIOD: {
    label: "PARALLELPERIOD",
    hasParams: true,
    measureName: "Sprzeda\u017c PP",
    desc: "<strong>PARALLELPERIOD</strong> najpierw <em>rozszerza</em> kontekst do pe\u0142nego " +
          "interwału (miesi\u0105c/kwarta\u0142/rok), a nast\u0119pnie przesuwa go. " +
          "Np. kontekst = Mar\u00a02024, interwał = YEAR \u2192 ca\u0142y rok 2023.",
  },
};

/* ===========================================================
   3. DOM REFERENCES
   =========================================================== */
var $ = function (s) { return document.querySelector(s); };
var tiFunctionEl  = $("#tiFunction");
var paramSection  = $("#paramSection");
var paramNumberEl = $("#paramNumber");
var paramIntervalEl = $("#paramInterval");
var panelSource   = $("#panelSource");
var panelFormula  = $("#panelFormula");
var panelResult   = $("#panelResult");
var ctxLabelEl    = $("#ctxLabel");
var tiResultEl    = $("#tiResultLabel");

/* ===========================================================
   4. STATE
   =========================================================== */
var state = {
  contextIndex: 14,       // default: Mar 2024
  funcName: "DATEADD",
  paramNumber: -1,
  paramInterval: "YEAR",
};

/* ===========================================================
   5. HELPERS
   =========================================================== */
function formatNumber(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

function findIndex(rok, miesiac) {
  for (var i = 0; i < SALES_DATA.length; i++) {
    if (SALES_DATA[i].rok === rok && SALES_DATA[i].miesiac === miesiac) return i;
  }
  return -1;
}

function shiftMonth(rok, miesiac, numMonths) {
  var total = (rok - 1) * 12 + (miesiac - 1) + numMonths;
  if (total < 0) return { rok: 0, miesiac: 0 }; // out of range
  return { rok: Math.floor(total / 12) + 1, miesiac: (total % 12) + 1 };
}

function getQuarterStart(kwartal) {
  return (kwartal - 1) * 3 + 1;
}

/* ===========================================================
   6. COMPUTE — Time Intelligence function evaluation
   =========================================================== */
function computeTI() {
  var ctx = SALES_DATA[state.contextIndex];
  var fn = state.funcName;
  var num = state.paramNumber;
  var interval = state.paramInterval;
  var resultIndices = [];

  switch (fn) {

    case "DATEADD": {
      var monthShift = num;
      if (interval === "QUARTER") monthShift = num * 3;
      else if (interval === "YEAR") monthShift = num * 12;
      var shifted = shiftMonth(ctx.rok, ctx.miesiac, monthShift);
      var idx = findIndex(shifted.rok, shifted.miesiac);
      if (idx >= 0) resultIndices.push(idx);
      break;
    }

    case "SAMEPERIODLASTYEAR": {
      var idx2 = findIndex(ctx.rok - 1, ctx.miesiac);
      if (idx2 >= 0) resultIndices.push(idx2);
      break;
    }

    case "DATESYTD": {
      for (var i = 0; i < SALES_DATA.length; i++) {
        if (SALES_DATA[i].rok === ctx.rok && SALES_DATA[i].miesiac <= ctx.miesiac) {
          resultIndices.push(i);
        }
      }
      break;
    }

    case "DATESQTD": {
      var qStart = getQuarterStart(ctx.kwartal);
      for (var i = 0; i < SALES_DATA.length; i++) {
        if (SALES_DATA[i].rok === ctx.rok &&
            SALES_DATA[i].miesiac >= qStart &&
            SALES_DATA[i].miesiac <= ctx.miesiac) {
          resultIndices.push(i);
        }
      }
      break;
    }

    case "PREVIOUSMONTH": {
      var prev = shiftMonth(ctx.rok, ctx.miesiac, -1);
      var idx3 = findIndex(prev.rok, prev.miesiac);
      if (idx3 >= 0) resultIndices.push(idx3);
      break;
    }

    case "PREVIOUSQUARTER": {
      var prevQ = ctx.kwartal - 1;
      var prevQYear = ctx.rok;
      if (prevQ < 1) { prevQ = 4; prevQYear--; }
      var pqStart = getQuarterStart(prevQ);
      for (var m = pqStart; m <= pqStart + 2; m++) {
        var idx4 = findIndex(prevQYear, m);
        if (idx4 >= 0) resultIndices.push(idx4);
      }
      break;
    }

    case "PARALLELPERIOD": {
      /* PARALLELPERIOD expands context to full interval, then shifts */
      if (interval === "MONTH") {
        /* Same as DATEADD for single-month context */
        var monthShiftP = num;
        var shiftedP = shiftMonth(ctx.rok, ctx.miesiac, monthShiftP);
        var idxP = findIndex(shiftedP.rok, shiftedP.miesiac);
        if (idxP >= 0) resultIndices.push(idxP);
      } else if (interval === "QUARTER") {
        /* Expand to full quarter containing ctx, then shift by N quarters */
        var qStartP = getQuarterStart(ctx.kwartal);
        var shiftedQStart = shiftMonth(ctx.rok, qStartP, num * 3);
        for (var mq = 0; mq < 3; mq++) {
          var sm = shiftMonth(shiftedQStart.rok, shiftedQStart.miesiac, mq);
          var idxQ = findIndex(sm.rok, sm.miesiac);
          if (idxQ >= 0) resultIndices.push(idxQ);
        }
      } else { /* YEAR */
        /* Expand to full year containing ctx, then shift by N years */
        var targetYear = ctx.rok + num;
        for (var iy = 0; iy < SALES_DATA.length; iy++) {
          if (SALES_DATA[iy].rok === targetYear) resultIndices.push(iy);
        }
      }
      break;
    }
  }

  /* Calculate sums */
  var ctxValue = ctx.sprzedaz;
  var resultSum = 0;
  for (var ri = 0; ri < resultIndices.length; ri++) {
    resultSum += SALES_DATA[resultIndices[ri]].sprzedaz;
  }

  return {
    indices: resultIndices,
    ctxValue: ctxValue,
    resultSum: resultSum,
    monthCount: resultIndices.length,
    outOfRange: resultIndices.length === 0,
  };
}

/* ===========================================================
   7. RENDER — Calendar grid (used by both panels)
   =========================================================== */
function buildCalendarHTML(highlightSet, highlightClass, contextIdx, showContextGhost) {
  var h = '<div class="cal-grid-wrap"><table class="cal-grid">';
  h += '<thead><tr><th>Miesi\u0105c</th>';
  for (var y = 0; y < YEARS.length; y++) {
    h += '<th>' + YEARS[y] + '</th>';
  }
  h += '</tr></thead><tbody>';

  for (var m = 1; m <= 12; m++) {
    var kwartal = Math.ceil(m / 3);
    var isQEnd = (m % 3 === 0);
    h += '<tr' + (isQEnd ? ' class="q-sep"' : '') + '>';

    /* Month label */
    h += '<td><div class="month-label">';
    if (m === getQuarterStart(kwartal)) {
      h += '<span class="q-badge">Q' + kwartal + '</span> ';
    }
    h += MONTH_NAMES[m - 1] + '</div></td>';

    /* Year columns */
    for (var yi = 0; yi < YEARS.length; yi++) {
      var yr = YEARS[yi];
      var dataIdx = findIndex(yr, m);
      var cls = [];
      var isClickable = (highlightClass === "ctx-active"); // only source panel is clickable

      if (dataIdx >= 0) {
        if (isClickable) cls.push("clickable");

        if (dataIdx === contextIdx && highlightClass === "ctx-active") {
          cls.push("ctx-active");
        } else if (showContextGhost && dataIdx === contextIdx) {
          cls.push("ctx-ghost");
        } else if (highlightSet && highlightSet[dataIdx]) {
          cls.push(highlightClass);
        }

        var val = formatNumber(SALES_DATA[dataIdx].sprzedaz);
        h += '<td class="' + cls.join(' ') + '"' +
             (isClickable ? ' data-idx="' + dataIdx + '"' : '') + '>' +
             val + '</td>';
      } else {
        h += '<td class="no-data">&mdash;</td>';
      }
    }
    h += '</tr>';
  }

  h += '</tbody></table></div>';
  return h;
}

/* ===========================================================
   8. RENDER — Source panel (clickable calendar)
   =========================================================== */
function renderSourcePanel() {
  var ctx = SALES_DATA[state.contextIndex];
  var html = buildCalendarHTML(null, "ctx-active", state.contextIndex, false);

  /* Summary bar */
  html += '<div class="cal-summary source">';
  html += '<span class="sum-label">Kontekst</span>';
  html += '<span class="sum-months">' + ctx.okres + ' (Q' + ctx.kwartal + ')</span>';
  html += '<span class="sum-value">' + formatNumber(ctx.sprzedaz) + '</span>';
  html += '</div>';

  panelSource.innerHTML = html;

  /* Attach click handlers */
  var cells = panelSource.querySelectorAll("td.clickable");
  for (var i = 0; i < cells.length; i++) {
    cells[i].addEventListener("click", onContextClick);
  }
}

function onContextClick() {
  var idx = parseInt(this.getAttribute("data-idx"), 10);
  if (!isNaN(idx) && idx >= 0 && idx < SALES_DATA.length) {
    state.contextIndex = idx;
    renderAll();
  }
}

/* ===========================================================
   9. RENDER — Result panel (highlighted calendar)
   =========================================================== */
function renderResultPanel(result) {
  var highlightSet = {};
  for (var i = 0; i < result.indices.length; i++) {
    highlightSet[result.indices[i]] = true;
  }

  var html = buildCalendarHTML(highlightSet, "ti-included", state.contextIndex, true);

  /* Summary bar */
  if (result.outOfRange) {
    html += '<div class="cal-summary result" style="background:var(--gray-50);border-color:var(--gray-200);color:var(--gray-500);">';
    html += '<span class="sum-label">Brak danych</span>';
    html += '<span class="sum-months">Przesuni\u0119cie wykracza poza dost\u0119pny zakres dat</span>';
    html += '<span class="sum-value">&mdash;</span>';
    html += '</div>';
  } else {
    html += '<div class="cal-summary result">';
    html += '<span class="sum-label">Wynik</span>';
    var monthLabels = [];
    for (var mi = 0; mi < result.indices.length; mi++) {
      monthLabels.push(SALES_DATA[result.indices[mi]].okres);
    }
    var monthsText = result.monthCount === 1
      ? monthLabels[0]
      : result.monthCount + ' mies. (' + monthLabels[0] + ' \u2013 ' + monthLabels[monthLabels.length - 1] + ')';
    html += '<span class="sum-months">' + monthsText + '</span>';
    html += '<span class="sum-value">' + formatNumber(result.resultSum) + '</span>';
    html += '</div>';
  }

  panelResult.innerHTML = html;
}

/* ===========================================================
   10. RENDER — Formula panel
   =========================================================== */
function renderFormulaPanel(result) {
  var ctx = SALES_DATA[state.contextIndex];
  var fn = state.funcName;
  var def = TI_FUNCTIONS[fn];
  var num = state.paramNumber;
  var interval = state.paramInterval;

  var h = '';

  /* Formula label */
  h += '<span class="formula-label">Metryka — ' + def.label + '</span>';

  /* DAX formula block */
  h += '<div class="formula-block">';
  h += def.measureName + ' =<br>';
  h += '<span class="kw">CALCULATE</span> (<br>';
  h += '&nbsp;&nbsp;<span class="fn">SUM</span> ( <span class="col">Dane[Sprzeda\u017c]</span> ),<br>';

  switch (fn) {
    case "DATEADD":
      h += '&nbsp;&nbsp;<span class="fn">DATEADD</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span>,<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">' + num + '</span>,<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">' + interval + '</span><br>';
      h += '&nbsp;&nbsp;)<br>';
      break;
    case "SAMEPERIODLASTYEAR":
      h += '&nbsp;&nbsp;<span class="fn">SAMEPERIODLASTYEAR</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>';
      h += '&nbsp;&nbsp;)<br>';
      break;
    case "DATESYTD":
      h += '&nbsp;&nbsp;<span class="fn">DATESYTD</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>';
      h += '&nbsp;&nbsp;)<br>';
      break;
    case "DATESQTD":
      h += '&nbsp;&nbsp;<span class="fn">DATESQTD</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>';
      h += '&nbsp;&nbsp;)<br>';
      break;
    case "PREVIOUSMONTH":
      h += '&nbsp;&nbsp;<span class="fn">PREVIOUSMONTH</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>';
      h += '&nbsp;&nbsp;)<br>';
      break;
    case "PREVIOUSQUARTER":
      h += '&nbsp;&nbsp;<span class="fn">PREVIOUSQUARTER</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span><br>';
      h += '&nbsp;&nbsp;)<br>';
      break;
    case "PARALLELPERIOD":
      h += '&nbsp;&nbsp;<span class="fn">PARALLELPERIOD</span> (<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="col">Kalendarz[Data]</span>,<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">' + num + '</span>,<br>';
      h += '&nbsp;&nbsp;&nbsp;&nbsp;<span class="param">' + interval + '</span><br>';
      h += '&nbsp;&nbsp;)<br>';
      break;
  }

  h += ')';
  h += '</div>';

  /* Metric comparison */
  h += '<div class="metric-compare">';
  h += '<div class="metric-box ctx">';
  h += '<div class="metric-label">Kontekst (' + ctx.okres + ')</div>';
  h += '<div class="metric-value">' + formatNumber(result.ctxValue) + '</div>';
  h += '</div>';
  h += '<div class="metric-box res">';
  h += '<div class="metric-label">Wynik ' + def.label + '</div>';
  if (result.outOfRange) {
    h += '<div class="metric-value" style="color:var(--gray-400);">&mdash;</div>';
  } else {
    h += '<div class="metric-value">' + formatNumber(result.resultSum) + '</div>';
  }
  h += '</div>';
  h += '</div>';

  /* Delta */
  if (!result.outOfRange) {
    var delta = result.resultSum - result.ctxValue;
    var deltaClass = delta > 0 ? "positive" : (delta < 0 ? "negative" : "neutral");
    var deltaSign = delta > 0 ? "+" : "";
    var pctChange = result.ctxValue !== 0
      ? ((delta / result.ctxValue) * 100).toFixed(1)
      : "0.0";
    var pctSign = delta > 0 ? "+" : "";

    h += '<div style="text-align:center;">';
    h += '<span class="delta-badge ' + deltaClass + '">';
    h += deltaSign + formatNumber(delta) + ' (' + pctSign + pctChange + '%)';
    h += '</span>';
    h += '</div>';
  }

  /* Context arrow explanation */
  h += '<div style="text-align:center;padding:4px 0;">';
  h += '<div class="shift-arrow">';
  h += '<span style="font-size:0.78rem;">' + ctx.okres + '</span>';
  h += ' <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/>' +
       '<polyline points="12 5 19 12 12 19"/></svg> ';
  if (result.outOfRange) {
    h += '<span style="color:var(--gray-400);font-size:0.78rem;">poza zakresem</span>';
  } else if (result.monthCount === 1) {
    h += '<span style="color:var(--ti);font-size:0.78rem;">' +
         SALES_DATA[result.indices[0]].okres + '</span>';
  } else {
    h += '<span style="color:var(--ti);font-size:0.78rem;">' +
         result.monthCount + ' miesi\u0119cy</span>';
  }
  h += '</div></div>';

  /* Description */
  h += '<div class="ti-desc">' + def.desc + '</div>';

  /* Additional context for specific functions */
  if (fn === "PARALLELPERIOD" && !result.outOfRange) {
    h += '<div class="ti-desc" style="margin-top:-6px;">';
    h += '<span class="ti-highlight">Uwaga:</span> PARALLELPERIOD r\u00f3\u017cni si\u0119 od DATEADD — ';
    if (interval === "YEAR") {
      h += 'rozszerza kontekst (1 miesi\u0105c) do ca\u0142ego roku, a potem przesuwa.';
    } else if (interval === "QUARTER") {
      h += 'rozszerza kontekst do pe\u0142nego kwarta\u0142u, a potem przesuwa.';
    } else {
      h += 'dla MONTH dzia\u0142a identycznie jak DATEADD.';
    }
    h += '</div>';
  }

  if (fn === "SAMEPERIODLASTYEAR" && !result.outOfRange) {
    h += '<div class="ti-desc" style="margin-top:-6px;">';
    h += '<span class="ti-highlight">Podpowied\u017a:</span> ';
    h += '<code>SAMEPERIODLASTYEAR(daty)</code> = <code>DATEADD(daty, -1, YEAR)</code>';
    h += '</div>';
  }

  panelFormula.innerHTML = h;
}

/* ===========================================================
   11. RENDER ALL
   =========================================================== */
function renderAll() {
  var result = computeTI();

  renderSourcePanel();
  renderResultPanel(result);
  renderFormulaPanel(result);

  /* Update top bar */
  var ctx = SALES_DATA[state.contextIndex];
  ctxLabelEl.textContent = ctx.okres;
  tiResultEl.textContent = result.outOfRange ? "\u2014" : formatNumber(result.resultSum);

  /* Show/hide param section */
  var def = TI_FUNCTIONS[state.funcName];
  if (def.hasParams) {
    paramSection.classList.remove("hidden");
  } else {
    paramSection.classList.add("hidden");
  }
}

/* ===========================================================
   12. EVENTS
   =========================================================== */
tiFunctionEl.addEventListener("change", function () {
  state.funcName = this.value;
  renderAll();
});

paramNumberEl.addEventListener("change", function () {
  state.paramNumber = parseInt(this.value, 10);
  renderAll();
});

paramIntervalEl.addEventListener("change", function () {
  state.paramInterval = this.value;
  renderAll();
});

/* ===========================================================
   13. INIT
   =========================================================== */
renderAll();

})();
