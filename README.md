# Power BI Wizualizator

Interaktywne animacje operacji Power Query i DAX: **Merge (Join)**, **Append (Union)** i **DAX Context**.

## Uruchomienie

Otwórz `index.html` w przeglądarce. Vanilla JS + CSS, zero zależności, działa offline.

## Struktura

```
index.html                  ← Landing page / menu nawigacyjne
shared/
  theme.css                 ← Wspólny motyw: CSS variables, layout, sidebar, tabele, log, scrollbar, responsive
  engine.js                 ← Wspólny silnik: moduł PQEngine (IIFE → window.PQEngine)
                               API: createState, delay, triggerStep, getColumns, renderTable,
                               clearClasses, setRowClass, markProcessed, scrollIntoView,
                               highlightLastResult, log, clearLog, setStatus, updateButtons,
                               wirePlaybackButtons, levenshteinSimilarity
merge/
  index.html                ← HTML shell (importuje shared/* + merge/*)
  merge.css                 ← Style: 3-panel grid (A | B | Result), compare bubble, row highlights
  merge.js                  ← Logika joinów (Inner, Left/Right Outer, Full Outer, Anti, Semi, Fuzzy)
append/
  index.html                ← HTML shell (importuje shared/* + append/*)
  append.css                ← Style: source panels (horizontal scroll), result area
  append.js                 ← Logika append (analiza kolumn, kopiowanie wierszy, null-filling)
dax-context/
  index.html                ← HTML shell (importuje shared/* + dax-context/*)
  dax-context.css           ← Style: 3-panel (Source | Formula | Result), column highlights, hidden-col effect
  dax-context.js            ← Logika DAX context (REMOVEFILTERS, REMOVEFILTERS ALL, ALLSELECTED)
```

## Konwencje

- **Język UI**: polski
- **Dane testowe**: produkty spożywcze (chleb, masło, mleko…) — paragony + cennik
- **Polskie znaki w JS**: zapisane jako unicode escape (`\u0142` = ł, `\u015b` = ś, `\u0107` = ć itd.)
- **Kolory**: szara skala + zielony (match/sukces) + czerwony (nomatch) + niebieski (Merge accent) + fioletowy (Append accent) + teal (DAX Context accent)
- **Animacja**: silnik oparty na Promise z delay/pause/step — `wirePlaybackButtons()` w engine.js obsługuje Start/Pause/Step/Reset
- **Nowy wizualizator**: stwórz folder `nazwa/`, dodaj `nazwa.css` + `nazwa.js` + `index.html`, zaimportuj `shared/*`, dodaj kartę w root `index.html`
