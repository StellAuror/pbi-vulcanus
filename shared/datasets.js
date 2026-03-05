/* ============================================================
   SHARED DATASETS — used by all 3 modules
   Each preset has: merge, append, dax variants

   All presets are from the same store context but cover
   different domains with genuinely different data & structures.
   ============================================================ */
var DATASETS = {

  /* ---------------------------------------------------------
     1. Zam\u00f3wienia klient\u00f3w
     Merge: klucze unikalne, czyste dopasowanie 1:1
     Append: identyczne kolumny (miesi\u0119czne raporty)
     DAX: Klient \u00d7 Miasto \u2192 Kwota
     --------------------------------------------------------- */
  orders: {
    name: "Zam\u00f3wienia klient\u00f3w",

    merge: {
      A: [
        { Klient: "Kowalski",    Nr: "ZAM-001", Kwota: 250 },
        { Klient: "Nowak",       Nr: "ZAM-002", Kwota: 180 },
        { Klient: "Wi\u015bniewski",  Nr: "ZAM-003", Kwota: 320 },
        { Klient: "W\u00f3jcik",      Nr: "ZAM-004", Kwota: 95 },
        { Klient: "Kowalczyk",   Nr: "ZAM-005", Kwota: 410 },
      ],
      B: [
        { Klient: "Kowalski",    Miasto: "Warszawa",  Telefon: "500-100-200" },
        { Klient: "Nowak",       Miasto: "Krak\u00f3w",    Telefon: "500-200-300" },
        { Klient: "Wi\u015bniewski",  Miasto: "Gda\u0144sk",    Telefon: "500-300-400" },
        { Klient: "Zieli\u0144ski",   Miasto: "Wroc\u0142aw",   Telefon: "500-400-500" },
        { Klient: "Lewandowski", Miasto: "Pozna\u0144",    Telefon: "500-500-600" },
      ],
      keyCol: "Klient",
    },

    append: {
      tables: [
        { label: "Stycze\u0144", tag: "a", data: [
          { Klient: "Kowalski",  Zam\u00f3wie\u0144: 5, Kwota: 1250 },
          { Klient: "Nowak",     Zam\u00f3wie\u0144: 3, Kwota: 540 },
          { Klient: "Wi\u015bniewski", Zam\u00f3wie\u0144: 7, Kwota: 2240 },
        ]},
        { label: "Luty", tag: "b", data: [
          { Klient: "Kowalski",  Zam\u00f3wie\u0144: 4, Kwota: 960 },
          { Klient: "W\u00f3jcik",    Zam\u00f3wie\u0144: 2, Kwota: 190 },
          { Klient: "Kowalczyk", Zam\u00f3wie\u0144: 6, Kwota: 2460 },
        ]},
        { label: "Marzec", tag: "c", data: [
          { Klient: "Nowak",       Zam\u00f3wie\u0144: 4, Kwota: 720 },
          { Klient: "Lewandowski", Zam\u00f3wie\u0144: 1, Kwota: 85 },
          { Klient: "Zieli\u0144ski",  Zam\u00f3wie\u0144: 3, Kwota: 570 },
        ]},
      ],
    },

    dax: {
      data: [
        { Klient: "Kowalski",   Miasto: "Warszawa", Kwota: 1250 },
        { Klient: "Kowalski",   Miasto: "Krak\u00f3w",   Kwota: 400 },
        { Klient: "Nowak",      Miasto: "Warszawa", Kwota: 800 },
        { Klient: "Nowak",      Miasto: "Krak\u00f3w",   Kwota: 540 },
        { Klient: "Wi\u015bniewski", Miasto: "Warszawa", Kwota: 1500 },
        { Klient: "Wi\u015bniewski", Miasto: "Gda\u0144sk",   Kwota: 740 },
        { Klient: "W\u00f3jcik",     Miasto: "Gda\u0144sk",   Kwota: 190 },
        { Klient: "W\u00f3jcik",     Miasto: "Pozna\u0144",   Kwota: 310 },
      ],
      measureCol: "Kwota",
    },
  },

  /* ---------------------------------------------------------
     2. Produkty i sprzeda\u017c
     Merge: duplikaty w LEWEJ (Laptop 3\u00d7, Telefon 2\u00d7)
     Append: cz\u0119\u015bciowo r\u00f3\u017cne kolumny (Cena vs Rabat vs Dostawca)
     DAX: Kategoria \u00d7 Kwarta\u0142 \u2192 Przych\u00f3d
     --------------------------------------------------------- */
  products: {
    name: "Produkty i sprzeda\u017c",

    merge: {
      A: [
        { Produkt: "Laptop",     Data: "2024-01-05", Ilo\u015b\u0107: 2 },
        { Produkt: "Laptop",     Data: "2024-01-12", Ilo\u015b\u0107: 1 },
        { Produkt: "Laptop",     Data: "2024-02-03", Ilo\u015b\u0107: 3 },
        { Produkt: "Telefon",    Data: "2024-01-08", Ilo\u015b\u0107: 5 },
        { Produkt: "Telefon",    Data: "2024-01-20", Ilo\u015b\u0107: 2 },
        { Produkt: "Tablet",     Data: "2024-02-10", Ilo\u015b\u0107: 1 },
        { Produkt: "S\u0142uchawki",  Data: "2024-01-15", Ilo\u015b\u0107: 4 },
      ],
      B: [
        { Produkt: "Laptop",     Cena: 3499, Kategoria: "Komputery" },
        { Produkt: "Telefon",    Cena: 1999, Kategoria: "Mobilne" },
        { Produkt: "Tablet",     Cena: 2199, Kategoria: "Mobilne" },
        { Produkt: "Monitor",    Cena: 1299, Kategoria: "Komputery" },
      ],
      keyCol: "Produkt",
    },

    append: {
      tables: [
        { label: "Sklep online", tag: "a", data: [
          { Produkt: "Laptop",   Ilo\u015b\u0107: 12, Cena: 3499 },
          { Produkt: "Telefon",  Ilo\u015b\u0107: 25, Cena: 1999 },
          { Produkt: "Tablet",   Ilo\u015b\u0107: 8,  Cena: 2199 },
        ]},
        { label: "Sklep stacjonarny", tag: "b", data: [
          { Produkt: "Laptop",   Ilo\u015b\u0107: 6,  Rabat: "5%" },
          { Produkt: "Monitor",  Ilo\u015b\u0107: 10, Rabat: "10%" },
          { Produkt: "S\u0142uchawki", Ilo\u015b\u0107: 30, Rabat: "0%" },
        ]},
        { label: "Hurtownia", tag: "c", data: [
          { Produkt: "Laptop",   Dostawca: "TechPL",  Cena: 2800 },
          { Produkt: "Telefon",  Dostawca: "MobiCo",  Cena: 1500 },
        ]},
      ],
    },

    dax: {
      data: [
        { Kategoria: "Komputery", Kwarta\u0142: "Q1", Przych\u00f3d: 35000 },
        { Kategoria: "Komputery", Kwarta\u0142: "Q2", Przych\u00f3d: 28000 },
        { Kategoria: "Komputery", Kwarta\u0142: "Q3", Przych\u00f3d: 41000 },
        { Kategoria: "Mobilne",   Kwarta\u0142: "Q1", Przych\u00f3d: 19000 },
        { Kategoria: "Mobilne",   Kwarta\u0142: "Q2", Przych\u00f3d: 24000 },
        { Kategoria: "Mobilne",   Kwarta\u0142: "Q3", Przych\u00f3d: 21500 },
        { Kategoria: "Audio",     Kwarta\u0142: "Q1", Przych\u00f3d: 8200 },
        { Kategoria: "Audio",     Kwarta\u0142: "Q2", Przych\u00f3d: 9500 },
        { Kategoria: "Audio",     Kwarta\u0142: "Q3", Przych\u00f3d: 11000 },
      ],
      measureCol: "Przych\u00f3d",
    },
  },

  /* ---------------------------------------------------------
     3. Dostawcy i magazyn
     Merge: duplikaty w PRAWEJ (FreshCo 2\u00d7, MilkTop 2\u00d7) + braki
     Append: zupe\u0142nie r\u00f3\u017cne kolumny (Dostawy, Zwroty, Inwentaryzacja)
     DAX: Dostawca \u00d7 Towar \u2192 Kwota
     --------------------------------------------------------- */
  suppliers: {
    name: "Dostawcy i magazyn",

    merge: {
      A: [
        { Dostawca: "FreshCo",  Towar: "Owoce",    Nr: "PO-301" },
        { Dostawca: "GrainPL",  Towar: "Zbo\u017ca",    Nr: "PO-302" },
        { Dostawca: "MilkTop",  Towar: "Nabia\u0142",   Nr: "PO-303" },
        { Dostawca: "BakePro",  Towar: "Pieczywo",  Nr: "PO-304" },
      ],
      B: [
        { Dostawca: "FreshCo",  Cena: 4500, Termin: "3 dni" },
        { Dostawca: "FreshCo",  Cena: 4200, Termin: "7 dni" },
        { Dostawca: "GrainPL",  Cena: 3200, Termin: "5 dni" },
        { Dostawca: "MilkTop",  Cena: 2800, Termin: "2 dni" },
        { Dostawca: "MilkTop",  Cena: 3100, Termin: "4 dni" },
        { Dostawca: "VegaFarm", Cena: 1900, Termin: "3 dni" },
      ],
      keyCol: "Dostawca",
    },

    append: {
      tables: [
        { label: "Dostawy", tag: "a", data: [
          { Dostawca: "FreshCo",  Towar: "Owoce",   Ilo\u015b\u0107: 200 },
          { Dostawca: "GrainPL",  Towar: "Zbo\u017ca",   Ilo\u015b\u0107: 150 },
          { Dostawca: "MilkTop",  Towar: "Nabia\u0142",  Ilo\u015b\u0107: 300 },
        ]},
        { label: "Zwroty", tag: "b", data: [
          { Nr: "ZW-01", Pow\u00f3d: "Uszkodzenie",  Data: "2024-03-01" },
          { Nr: "ZW-02", Pow\u00f3d: "Termin",       Data: "2024-03-05" },
          { Nr: "ZW-03", Pow\u00f3d: "B\u0142\u0105d zam\u00f3wienia", Data: "2024-03-12" },
        ]},
        { label: "Inwentaryzacja", tag: "c", data: [
          { SKU: "FRC-001", Stan: 150, Lokalizacja: "Hala A" },
          { SKU: "GRP-002", Stan: 80,  Lokalizacja: "Hala B" },
        ]},
      ],
    },

    dax: {
      data: [
        { Dostawca: "FreshCo",  Towar: "Jab\u0142ka",  Kwota: 4500 },
        { Dostawca: "FreshCo",  Towar: "Banany",  Kwota: 3200 },
        { Dostawca: "GrainPL",  Towar: "Ry\u017c",     Kwota: 2800 },
        { Dostawca: "GrainPL",  Towar: "M\u0105ka",    Kwota: 3100 },
        { Dostawca: "MilkTop",  Towar: "Mleko",   Kwota: 5200 },
        { Dostawca: "MilkTop",  Towar: "Ser",     Kwota: 2900 },
      ],
      measureCol: "Kwota",
    },
  },
};
