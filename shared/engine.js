/* ============================================================
   SHARED ENGINE — Power Query Visualizers
   Reusable utilities: delay, step control, table rendering,
   row highlighting, log, status badge, button wiring.
   ============================================================ */

const PQEngine = (function () {
  "use strict";

  /* ----------------------------------------------------------
     State prototype (apps clone & extend)
     ---------------------------------------------------------- */
  function createState(extra) {
    const base = {
      result: [],
      speed: 600,
      running: false,
      paused: false,
      stepMode: false,
      stepResolve: null,
      aborted: false,
      logCount: 0,
    };
    return Object.assign(base, extra || {});
  }

  /* ----------------------------------------------------------
     Delay / Step control
     ---------------------------------------------------------- */
  function delay(state, ms) {
    return new Promise((resolve) => {
      if (state.aborted) return resolve();
      if (state.stepMode) {
        state.stepResolve = resolve;
        return;
      }
      const check = () => {
        if (state.aborted) return resolve();
        if (state.paused) return requestAnimationFrame(check);
        setTimeout(resolve, ms !== undefined ? ms : state.speed);
      };
      check();
    });
  }

  function triggerStep(state) {
    if (state.stepResolve) {
      const r = state.stepResolve;
      state.stepResolve = null;
      r();
    }
  }

  /* ----------------------------------------------------------
     Table rendering
     ---------------------------------------------------------- */
  function getColumns(data) {
    return data.length ? Object.keys(data[0]) : [];
  }

  function renderTable(container, data, idPrefix, columns) {
    if (!data.length) {
      container.innerHTML =
        '<p style="padding:16px;color:var(--gray-400);font-size:0.82rem;">Brak danych</p>';
      return;
    }
    const cols = columns || getColumns(data);
    let h = '<table class="data-table"><thead><tr><th>#</th>';
    cols.forEach((c) => (h += `<th>${c}</th>`));
    h += "</tr></thead><tbody>";
    data.forEach((row, i) => {
      h += `<tr id="${idPrefix}_${i}"><td style="color:var(--gray-400)">${i}</td>`;
      cols.forEach((c) => {
        const v = row[c];
        h +=
          v === null || v === undefined
            ? '<td class="null-val">null</td>'
            : `<td>${v}</td>`;
      });
      h += "</tr>";
    });
    h += "</tbody></table>";
    container.innerHTML = h;
  }

  /* ----------------------------------------------------------
     Row highlight helpers
     ---------------------------------------------------------- */
  function clearClasses(classList) {
    document.querySelectorAll(".data-table tr").forEach((tr) => {
      classList.forEach((c) => tr.classList.remove(c));
    });
  }

  function setRowClass(id, cls, removeList) {
    const el = document.getElementById(id);
    if (!el) return;
    (removeList || []).forEach((c) => el.classList.remove(c));
    if (cls) el.classList.add(cls);
  }

  function markProcessed(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("processed");
  }

  function scrollIntoView(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function highlightLastResult(resultLength) {
    const el = document.getElementById(`res_${resultLength - 1}`);
    if (el) {
      el.classList.add("result-new");
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* ----------------------------------------------------------
     Log
     ---------------------------------------------------------- */
  function log(state, logPanel, html) {
    state.logCount++;
    const d = document.createElement("div");
    d.className = "log-line";
    d.innerHTML = `<span class="step-num">${state.logCount}.</span> ${html}`;
    logPanel.appendChild(d);
    logPanel.scrollTop = logPanel.scrollHeight;
  }

  function clearLog(state, logPanel) {
    logPanel.innerHTML = "";
    state.logCount = 0;
  }

  /* ----------------------------------------------------------
     Status badge
     ---------------------------------------------------------- */
  function setStatus(statusBadge, statusText, s) {
    statusBadge.className = "status-badge";
    const map = {
      ready: "Gotowy",
      running: "Animacja\u2026",
      paused: "Pauza",
      step: "Krok",
      done: "Zako\u0144czono",
    };
    statusText.textContent = map[s] || s;
    if (s === "running") statusBadge.classList.add("running");
    if (s === "paused" || s === "step") statusBadge.classList.add("paused");
    if (s === "done") statusBadge.classList.add("done");
  }

  /* ----------------------------------------------------------
     Button wiring
     ---------------------------------------------------------- */
  function updateButtons(state, btnStart, btnPause, btnStep) {
    btnStart.disabled = state.running;
    btnPause.disabled = !state.running;
    btnStep.disabled = !state.running;
    btnPause.innerHTML = state.paused
      ? "&#9654; Wznów"
      : "&#10074;&#10074; Pauza";
  }

  function wirePlaybackButtons(opts) {
    const {
      state, btnStart, btnPause, btnStep, btnReset,
      statusBadge, statusText,
      onReset, onBeforeStart, onAnimate,
    } = opts;

    const _update = () => updateButtons(state, btnStart, btnPause, btnStep);
    const _status = (s) => setStatus(statusBadge, statusText, s);

    btnStart.addEventListener("click", async () => {
      if (state.running) return;
      onReset();
      await new Promise((r) => setTimeout(r, 100));
      state.running = true;
      state.paused = false;
      state.stepMode = false;
      state.aborted = false;
      if (onBeforeStart) onBeforeStart();
      _update();
      _status("running");
      try {
        await onAnimate();
      } catch (e) {
        if (!state.aborted) console.error(e);
      }
      if (!state.aborted) _status("done");
      state.running = false;
      _update();
    });

    btnPause.addEventListener("click", () => {
      if (!state.running) return;
      if (state.stepMode) {
        state.stepMode = false;
        state.paused = false;
        triggerStep(state);
        _status("running");
      } else {
        state.paused = !state.paused;
        _status(state.paused ? "paused" : "running");
      }
      _update();
    });

    btnStep.addEventListener("click", () => {
      if (!state.running) return;
      state.stepMode = true;
      state.paused = false;
      _status("step");
      _update();
      triggerStep(state);
    });

    btnReset.addEventListener("click", () => onReset());
  }

  /* ----------------------------------------------------------
     Fuzzy — Levenshtein
     ---------------------------------------------------------- */
  function levenshteinDistance(a, b) {
    const la = a.length, lb = b.length;
    const dp = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
    for (let i = 0; i <= la; i++) dp[i][0] = i;
    for (let j = 0; j <= lb; j++) dp[0][j] = j;
    for (let i = 1; i <= la; i++)
      for (let j = 1; j <= lb; j++)
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[la][lb];
  }

  function levenshteinSimilarity(a, b) {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    const sa = String(a).toLowerCase(),
      sb = String(b).toLowerCase();
    const maxLen = Math.max(sa.length, sb.length);
    return maxLen === 0 ? 1 : 1 - levenshteinDistance(sa, sb) / maxLen;
  }

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  return {
    createState,
    delay,
    triggerStep,
    getColumns,
    renderTable,
    clearClasses,
    setRowClass,
    markProcessed,
    scrollIntoView,
    highlightLastResult,
    log,
    clearLog,
    setStatus,
    updateButtons,
    wirePlaybackButtons,
    levenshteinSimilarity,
  };
})();
