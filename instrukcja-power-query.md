# Instrukcja ćwiczeń Power Query — Fresh Market

Fresh Market to sieć sklepów spożywczych z oddziałami na terenie całej Polski. Jako analityk danych przygotowujesz dane do raportu sprzedaży w Power BI. Dane są rozrzucone po kilku plikach Excela na SharePoincie i wymagają porządków, zanim nadadzą się do analizy.

Ćwiczenia są ułożone od prostych do złożonych — zaczniesz od prostego sklejenia dwóch plików, a skończysz na pełnym pipeline'ie głównej tabeli sprzedaży.

Wszystkie operacje wykonujesz w Power Query (zakładka **Przekształć dane** w Power BI Desktop).

**Dlaczego w Power Query, a nie w Power BI?** Power Query przetwarza dane raz — przy załadowaniu. Power BI (DAX) działa przy każdej interakcji użytkownika z raportem: każdy klik w filtr, każda zmiana wykresu powoduje, że DAX przelicza wyrażenia na nowo dla tysięcy wierszy. Jeśli możesz coś policzyć lub wyczyścić dla wszystkich wierszy z góry — zrób to w Power Query. Raport będzie szybszy, a model prostszy.

---

## Ćwiczenie 1 — Połącz dwa pliki sprzedaży

> Dział IT prysłał dane za ostatni rok podzielone na dwa pliki: `Sprzedaż cz.1.xlsx` i `Sprzedaż cz.2.xlsx`. Zanim w ogóle zaczniesz analizować, musisz je skleić w jedno.

**Masz:** dwa osobne pliki — `Sprzedaż cz.1.xlsx` i `Sprzedaż cz.2.xlsx` — każdy to fragment sprzedaży za rok.  
**Potrzebujesz:** jednej tabeli ze wszystkimi transakcjami.

Otwórz grupę zapytań **Append queries**. Znajdziesz tam trzy zapytania.

Każdy plik jest osobnym zapytaniem, a dopiero trzecie (`Sprzedaż total`) je skleja. To celowy podział — dzięki temu możesz łatwo podejrzeć lub podmienić jeden z plików źródłowych bez ruszania reszty. Gdybyś od razu ładował oba pliki w jednym zapytaniu, każda zmiana źródła wymagałaby ingerencji w więcej miejsc.

### `Sprzedaż 1` i `Sprzedaż 2`

Każdy plik ma na górze pusty wiersz — przez to Power Query nie rozpoznaje nagłówków automatycznie. Dla każdego z tych zapytań:

1. Odfiltruj pusty wiersz z góry — żeby go usunąć, zanim awansujesz nagłówki. W `Sprzedaż 1` filtruj po `Column2` (nie jest null i nie jest pusty tekst), w `Sprzedaż 2` — po `Column1`. Klik: **Filtruj wiersze**.
2. Awansuj pierwszy wiersz na nagłówki — dopiero teraz górny wiersz zawiera faktyczne nazwy kolumn. Klik: **Przekształć → Użyj pierwszego wiersza jako nagłówków**.

### `Sprzedaż total`

Mając dwa czyste zapytania, sklej je w jedno:

1. Dołącz `Sprzedaż 2` pod `Sprzedaż 1` — klik: **Strona główna → Dołącz zapytania**, wybierz oba zapytania. Wynik to jedna tabela z pełną sprzedażą za rok.

---

## Ćwiczenie 2 — Przestaw tabelę targetów

**Masz:** plik `Targety.xlsx`, gdzie kategorie produktów to wiersze, a każdy miesiąc to osobna kolumna.  
**Potrzebujesz:** tabeli w układzie wierszowym — każdy wiersz to jedna wartość targetu z przypisaną kategorią i datą.

Dlaczego układ z pliku nie jest dobry? Power BI jest zbudowany wokół filtrowania po wartościach w wierszach. Jeśli miesiąc to nazwa kolumny, nie możesz po nim filtrować ani porównywać z datami sprzedaży — Power BI po prostu nie wie, że to jest data. Musisz więc najpierw "obrócić" tabelę tak, żeby każdy miesiąc był wartością w wierszu.

Otwórz grupę **Transformacje** i kliknij zapytanie **Transformacje na tabelach 1**.

Dane mają wadę: pierwszy wiersz w arkuszu jest pusty, dopiero drugi zawiera nagłówki. Zanim zaczniesz właściwą transformację, oczyść strukturę:

1. Usuń górny pusty wiersz — klik: **Strona główna → Usuń wiersze → Usuń górne wiersze**, wartość: `1`.
2. Awansuj pierwszy wiersz na nagłówki — klik: **Przekształć → Użyj pierwszego wiersza jako nagłówków**.
3. Usuń wiersze, gdzie `Data` jest null — resztki po pustych komórkach Excela; klik: **Filtruj wiersze** po kolumnie `Data`.
4. Ustaw typy kolumn — `Data` jako **Data**, kolumny kategorii (`CHIPSY, PRZEKĄSKI`, `KULINARKA`, `NAPOJE`, `NAPOJE GORĄCE`, `WINO`) jako **Liczba całkowita**.

Teraz obrót tabeli. Dane idą "w poprzek" (miesiące to kolumny) — chcesz je "wyprostować":

5. Zdejmij nagłówki z powrotem do danych — potrzebujesz nazwy miesięcy jako wartości w wierszach, nie jako nagłówki kolumn. Klik: **Przekształć → Użyj nagłówków jako pierwszego wiersza**.
6. Transponuj tabelę — zamień wiersze z kolumnami. Klik: **Przekształć → Transponuj**. Teraz każda kategoria to jedna kolumna, a daty lecą wierszami.
7. Awansuj nagłówki ponownie — po transponowaniu górny wiersz to daty; klik: **Przekształć → Użyj pierwszego wiersza jako nagłówków**.
8. Cofnij przestawienie kolumn dat (Unpivot) — zaznacz kolumnę z nazwami kategorii, a na pozostałych kliknij prawym przyciskiem: **Cofnij przestawienie innych kolumn**. Każda para "kategoria + data + wartość" staje się osobnym wierszem. Powstaną kolumny `Attribute` (data) i `Value` (wartość).
9. Przestaw kolumnę dat z powrotem (Pivot) — teraz chcesz daty jako kolumny z zagregowanymi wartościami. Zaznacz kolumnę `Attribute`, klik: **Przekształć → Przestaw kolumnę**, wartości z: `Value`, agregacja: **Suma**.

### `Transformacje na tabelach 2` — wariant uproszczony

**Masz:** ten sam plik `Targety.xlsx`.  
**Potrzebujesz:** tabeli tylko z jedną kategorią (`CHIPSY, PRZEKĄSKI`) — z datami jako kolumnami.

Kroki 1–4 są identyczne jak wyżej. Potem:

5. Zostaw tylko dwie kolumny — zaznacz `Data` i `CHIPSY, PRZEKĄSKI`, klik: **Usuń inne kolumny**.
6. Przestaw kolumnę `Data` — klik: **Przekształć → Przestaw kolumnę**, wartości z: `CHIPSY, PRZEKĄSKI`, agregacja: **Suma**. Każdy miesiąc staje się osobną kolumną.

---

## Ćwiczenie 3 — Połącz sklepy Biedronki z kierownikami i konkurencją

**Masz:** dwa osobne arkusze ze sklepami (północne i południowe), listę kierowników w osobnym arkuszu i listę sklepów konkurencji w kolejnym.  
**Potrzebujesz:** jednej tabeli z pełnym obrazem każdego sklepu — region, kierownik z e-mailem i telefonem, sklepy konkurencji w okolicy.

Otwórz grupę **Ćwiczenie biedronki**. Zacznij od trzech pomocniczych zapytań, które później złączysz w całość.

### `Biedr południowe` — przygotuj dane z południa

Dane leżą w arkuszu `Biedr_Południe`. Jedyna rzecz do zrobienia:

1. Awansuj nagłówki — klik: **Przekształć → Użyj pierwszego wiersza jako nagłówków**.
2. Dodaj kolumnę `Region` z wartością `południowe` — żeby po złączeniu z północnymi wiedzieć, skąd pochodzi każdy wiersz. Klik: **Dodaj kolumnę → Kolumna niestandardowa**, formuła: `"południowe"`.

### `Klierownicy` — przygotuj listę kierowników

Nazwiska i imiona są wpisane małymi literami i w osobnych kolumnach. Trzeba je poprawić i scalić, bo będziesz łączyć po pełnym imieniu i nazwisku. Scalenie robimy tutaj — w tabeli pomocniczej — żeby klucz łączenia był zawsze w tej samej formie po obu stronach złączenia. Inaczej `Jan Kowalski` (w tabeli sklepów) nie trafi na `jan` + `kowalski` (w liście kierowników) i złączenie nic nie znajdzie:

1. Awansuj nagłówki.
2. Popraw wielkość liter w `Imię` i `Nazwisko` — zaznacz obie kolumny, klik: **Przekształć → Format → Każde słowo z wielkiej litery**.
3. Scal `Imię` i `Nazwisko` w jedną kolumnę `Imię i nazwisko` — zaznacz obie, klik: **Przekształć → Scal kolumny**, separator: spacja.

### `Konkurencja` — przygotuj dane o sklepach konkurencji

Chcesz mieć adres i odległość w jednym polu — żeby po późniejszym pivocie każda komórka była czytelna:

1. Awansuj nagłówki.
2. Dodaj kolumnę `Adres konkurencji` łączącą `Adres_konkurencji` i `Odległość_km` spacją — klik: **Dodaj kolumnę → Kolumna niestandardowa**.
3. Dodaj kolumnę `Merged` łączącą `Konkurencyjny_Sklep`, `Adres_konkurencji` i `Odległość_km` spacją — to będzie wartość w komórkach po pivocie.

### `Biedr total` — złącz wszystko

Mając przygotowane trzy pomocnicze zapytania, sklejasz je w całość:

1. Zacznij od danych z arkusza `Biedr_Północ` — awansuj nagłówki, dodaj kolumnę `Region` z wartością `północne`.
2. Dołącz sklepy z południa pod sklepy z północy — klik: **Strona główna → Dołącz zapytania**, wybierz `Biedr południowe`. Masz teraz pełną listę sklepów z całej Polski.
3. Dołącz dane kierowników — scal z `Klierownicy` po kluczu `Kierownik` (lewa tabela) = `Imię i nazwisko` (prawa tabela), typ: **lewe zewnętrzne**. Klik: **Strona główna → Scal zapytania**. Lewe zewnętrzne oznacza: zachowaj wszystkie sklepy z lewej tabeli, nawet jeśli nie ma dla nich dopasowanego kierownika — lepiej mieć null niż stracić wiersz z danymi.
4. Rozwiń kolumnę `Klierownicy` — zaznacz pola `Email` i `Telefon`.
5. Dołącz dane o konkurencji — scal z `Konkurencja` po kluczu `SklepID`, typ: **lewe zewnętrzne**. Ten sam powód — sklep bez pobliskiej konkurencji nadal zostaje w tabeli.
6. Rozwiń kolumnę `Konkurencja` — zaznacz `Konkurencyjny_Sklep` i `Merged`.
7. Przestaw kolumnę `Konkurencyjny_Sklep` (Pivot) — każdy sklep konkurencyjny staje się osobną kolumną, wartości z `Merged`. Klik: **Przekształć → Przestaw kolumnę**.

---

## Ćwiczenie 4 — Główna tabela sprzedaży `fSprzedaż`

**Masz:** folder na SharePoincie, do którego co miesiąc wpada nowy plik `sprzedaż_*.xlsx`. Każdy plik to tabela `Sprz` z surowymi danymi transakcji — ale dane mają błędy: złe nazwy sklepów, numery telefonów bez kierunkowego, kategoria i podkategoria w jednej kolumnie, jednostkowe ceny zamiast wartości, brak stawek VAT.  
**Potrzebujesz:** jednej, czystej tabeli faktów z wartościami netto, brutto i kosztami — gotowej do modelu danych.

Kliknij zapytanie **fSprzedaż**.

### Wczytaj dane z całego folderu

Zamiast ładować pliki jeden po jednym, wczytujesz cały folder. Co miesiąc pojawia się nowy plik — gdybyś dodawał go ręcznie za każdym razem, musiałbyś co miesiąc wchodzić do Power Query i edytować zapytanie. Przy podejściu folderowym: nowy plik leci do folderu, klikasz Odśwież — gotowe:

1. Połącz się z folderem SharePoint — źródłem jest parametr `p_SPURL`. Pobierasz listę wszystkich plików w tej lokalizacji.
2. Zostaw tylko pliki z właściwego podfolderu — odfiltruj wiersze, gdzie `Folder Path` równa się parametrowi `p_SPFolder`.
3. Zamień nazwy plików na małe litery (kolumna `Name`) — osoby wrzucające pliki czasem piszą `Sprzedaż`, czasem `sprzedaż`, czasem `SPRZEDAŻ`. Żeby filtr z następnego kroku trafiał na każdą wersję, ujednolicasz wielkość liter przed porównaniem. Klik: **Przekształć kolumny → Format → Małe litery**.
4. Zostaw tylko pliki, których nazwa zaczyna się od `sprzedaż` — odfiltruj inne pliki leżące w tym samym folderze. Klik: **Filtruj wiersze → Zaczyna się od**.
5. Usuń pliki ukryte — odfiltruj wiersze, gdzie `Attributes[Hidden]` jest `true`.
6. Dla każdego pliku wywołaj funkcję `Transform File` — otwiera ona plik Excel i pobiera tabelę `Sprz`. Klik: **Dodaj kolumnę → Wywołaj funkcję niestandardową**, wskaż `Transform File`. Powstaje kolumna z zagnieżdżonymi tabelami.
7. Zostaw tylko kolumnę `Transform File` — reszta metadanych folderu nie jest potrzebna. Klik: **Usuń inne kolumny**.
8. Rozwiń kolumnę `Transform File` — kliknij ikonę rozwijania przy nagłówku, zaznacz wszystkie pola. Dane ze wszystkich plików lądują w jednej tabeli.
9. Usuń wiersze, gdzie `Faktura ID` jest null — przy łączeniu wielu plików mogą pojawić się puste wiersze. Klik: **Filtruj wiersze**.

### Wyczyść dane tekstowe

Dane wpisywali ludzie — są literówki, niespójne spacje i błędna nazwa jednego sklepu. To ważny krok: jeśli `Nazwa Sklepu` ma gdzieś dodatkową spację albo różną pisownię, Power BI potraktuje to jako dwa różne sklepy — i podsumowania sprzedaży w raporcie będą błędne:

10. Przytnij spacje w `Nazwa Sklepu` — usuwa spacje z początku i końca. Klik: zaznacz kolumnę, **Przekształć → Format → Przytnij**.
11. Zastąp podwójną spację pojedynczą w `Nazwa Sklepu` — klik: **Przekształć → Zamień wartości**, szukaj `  ` (dwie spacje), zamień na ` ` (jedna spacja).
12. Zastąp `Fresh Market Anita` na `Fresh Market Anna` w `Nazwa Sklepu` — korekta błędnie wpisanej nazwy.
13. Popraw wielkie litery w `Miasto` — dane mogą mieć `warszawa`, `Warszawa` albo `WARSZAWA`. Klik: zaznacz `Miasto`, **Przekształć → Format → Każde słowo z wielkiej litery**.

### Podziel i przetwórz kolumny strukturalne

Kilka kolumn zawiera "za dużo informacji naraz" albo są w złym formacie. Rozdzielasz je tutaj, żeby w Power BI każde pole było osobno filtrowalne i sortowalne — nie możesz sensownie filtrować po kategorii produktu, jeśli kategoria i podkategoria siedzą razem w jednej kolumnie jako `NAPOJE-SOKI`:

14. Zduplikuj kolumnę `Numer hurtowni` — prawym: **Duplikuj kolumnę**. Kopia (`Numer hurtowni - Copy`) posłuży do wyciągnięcia samego numeru, oryginał zostanie podzielony na część literową i cyfrową.
15. Przestaw kolumny w żądanej kolejności — klik: przeciągnij kolumny lub **Przenieś** z menu kontekstowego. Docelowa kolejność: `Data faktury`, `Nazwa Sklepu`, `Ulica`, `Miasto`, `Kod pocztowy`, `Numer telefonu`, `Numer hurtowni`, `Numer hurtowni - Copy`, `Nazwa hurtowni`, `Imię kierownika hurtowni`, `Nazwisko kierownika hurtowni`, `Rejon`, `Region`, `Produkt ID`, `Nazwa produktu`, `Dostawca`, `Kategoria i podkategoria`, `Ilość`, `Sprzedaz`, `Koszt zakupu`.
16. Wyciągnij środkowe 3 znaki z `Numer hurtowni - Copy` — to numeryczna część identyfikatora (pozycje 2–4, indeksowanie od 0). Klik: zaznacz kolumnę, **Przekształć → Wyodrębnij → Zakres**, pozycja startowa: `1`, długość: `3`.
17. Dodaj kolumnę `First Characters` z pierwszym znakiem `Numer hurtowni` — klik: **Dodaj kolumnę → Wyodrębnij → Pierwsze znaki**, liczba: `1`.
18. Scal `Imię kierownika hurtowni` i `Nazwisko kierownika hurtowni` w kolumnę `Imię i nazwisko kierownika` — zaznacz obie, klik: **Przekształć → Scal kolumny**, separator: spacja.
19. Podziel `Numer hurtowni` w miejscu przejścia z liter na cyfry — np. `HUR123` → `HUR` i `123`. Klik: **Przekształć → Podziel kolumnę → Według przejścia między znakami**, typ: **od nie-cyfry do cyfry**. Powstaną `Numer hurtowni.1` i `Numer hurtowni.2`.
20. Zastąp kropkę przecinkiem w `Koszt zakupu` — plik Excela używa kropki jako separatora dziesiętnego, Power Query (w ustawieniach `pl-PL`) oczekuje przecinka. Klik: **Zamień wartości**, `.` → `,`.
21. Podziel `Kategoria i podkategoria` według myślnika — jedna kolumna zawiera np. `NAPOJE-SOKI`. Klik: **Przekształć → Podziel kolumnę → Według ogranicznika**, ogranicznik: `-`. Powstaną `Kategoria` i `Podkategoria`.
22. Dodaj prefiks `+48 ` do `Numer telefonu` — numery są bez kierunkowego. Klik: zaznacz kolumnę, **Przekształć → Format → Dodaj prefiks**, wartość: `+48 `.
23. Dodaj kolumnę `Nr mieszkania` z częścią adresu po znaku `/` — adresy mają format `ul. Kowalska 5/3`. Klik: **Dodaj kolumnę → Wyodrębnij → Tekst po ograniczniku**, ogranicznik: `/`.
24. Ustaw typy wszystkich kolumn — to jeden z ważniejszych kroków. Power BI dziedziczy typy z Power Query i na ich podstawie decyduje, jakie agregacje są dostępne (suma, średnia etc.) oraz jak renderować dane. Kolumna dat bez typu `Date` nie ma kalendarza, liczba bez typu liczbowego nie sumuje się. Klik: **Wykryj typy danych** lub ręcznie. Kluczowe: `Data faktury` → Data, `Kod pocztowy` i `Ilość` → Liczba całkowita, `Sprzedaz` i `Koszt zakupu` → Liczba dziesiętna.

### Oblicz wartości finansowe

W źródle masz cenę jednostkową i ilość, ale raport potrzebuje wartości na poziomie każdego wiersza transakcji. Możesz to zrobić w DAX — ale nie powinieneś. DAX przelicza wyrażenia przy każdym odświeżeniu wizualizacji, filtrze i selekcji użytkownika. Power Query robi to raz przy załadowaniu. Proste mnożenie `Ilość * Cena` dla miliona wierszy to klasyczny przypadek, który lepiej zrobić z góry i zapisać jako kolumnę — zamiast liczyć w kółko przy każdym kliknięciu w raport.

25. Dodaj kolumnę `Wartość netto` = `Ilość * Sprzedaz` — klik: **Dodaj kolumnę → Kolumna niestandardowa**, formuła: `[Ilość] * [Sprzedaz]`.
26. Dodaj kolumnę `Start of Month` — data początku miesiąca z `Data faktury`. Klik: zaznacz `Data faktury`, **Dodaj kolumnę → Data → Miesiąc → Początek miesiąca**. Przyda się do połączenia z tabelą celów.
27. Dołącz stawki VAT — scal z zapytaniem `Stawki VAT` po kolumnie `Kategoria`, typ: **lewe zewnętrzne**. Klik: **Strona główna → Scal zapytania**. Stawka VAT zależy od kategorii i jest stała — zamiast używać zagnieżdżonego `LOOKUPVALUE()` w DAX przy każdym odświeżeniu wykresu, wzbogacasz dane raz tutaj. Każda transakcja dostaje właściwą stawkę VAT i jest z nią zapisana w modelu.
28. Rozwiń kolumnę `Stawki VAT` — wybierz tylko pole `Stawka VAT`.
29. Dodaj kolumnę `Wartość Brutto` — klik: **Dodaj kolumnę → Kolumna niestandardowa**, formuła: `[Stawka VAT] / 100 * [Wartość netto] + [Wartość netto]`.
30. Zaokrąglij `Wartość Brutto` do 2 miejsc po przecinku — klik: zaznacz kolumnę, **Przekształć → Zaokrąglij**, wartość: `2`.
31. Dodaj kolumnę `Koszty netto` = `Koszt zakupu * Ilość` — klik: **Dodaj kolumnę → Kolumna niestandardowa**.

### Posprzątaj tabelę

Kolumny źródłowe, z których wyliczyłeś nowe miary, nie są już potrzebne. Każda zbędna kolumna w modelu zajmuje pamięć RAM i powiększa plik `.pbix`. Im węższy model, tym szybszy raport — więc wyrzucasz wszystko, co już nie wnosi wartości:

32. Usuń `Sprzedaz`, `Koszt zakupu` i `Stawka VAT` — masz już `Wartość Netto`, `Wartość Brutto` i `Koszty netto`. Klik: zaznacz kolumny, **Usuń kolumny**.
33. Ustaw typy pozostałych kolumn — `Faktura ID` → Tekst, `Data Dostawy` → Data, `Data Sprzedaży` → Data.
34. Zmień nazwę `Data faktury` na `Data Fakturowania` — klik: dwukrotne kliknięcie na nagłówek.
35. Usuń kolumnę `Numer hurtowni - Copy` — kopia była potrzebna tylko do wyciągnięcia cyfr, cel osiągnięty.
36. Zmień nazwy końcowe: `Imię i nazwisko kierownika` → `Kierownik`, `Wartość netto` → `Wartość Netto` — klik: dwukrotne kliknięcie na nagłówki.

---

Tabela `fSprzedaż` jest gotowa — czyste dane, poprawne typy, wyliczone wartości finansowe i pełna informacja o każdej transakcji.
