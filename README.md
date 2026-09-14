# Ernesto Vargas – B2B Preisanpassungen & Sortimentsanalyse

Professionelle B2B-Webapplikation für **Ernesto Vargas** (Corporate Fashion & Workwear, Lochackerstrasse 4, CH-8424 Embrach) zur kundenindividuellen Preisanpassung, Konditionsblatt-Erstellung, ERP-Re-Import (Bexio / Odoo) und gezielten Sortimentsanalyse (z. B. bei Auslaufartikeln).

---

## Kernfunktionen

### 1. Excel-Datenbasis & Import
- Verarbeitung grosser Excel-Dateien mit über 55'000 Zeilen direkt im Client.
- Optimiert für den Export **«Export Company Products with Discounts»** aus dem B2B-Shop.
- Automatische Aggregation von Grössen- und Farbvarianten auf Kunden- und Produktebene.
- Lokale Datenspeicherung im Browser via IndexedDB (keine Übertragung vertraulicher Preisdaten an externe Server).

### 2. Kundenpreise & Preisanpassung (Workflow-Schritt 1)
- **Kundenweises Vorgehen**: Schnelle Auswahl und Durchschaltung aller Kunden via suchbarem Dropdown und Vor-/Zurück-Navigation.
- **Einzelpreisanpassung**: Direkteingabe neuer Abgabepreise (CHF) pro Produkt mit automatischer Übernahme und Grössenaufpreis-Kalkulation.
- **Pauschal-% Assistent**: Prozentuale Anpassung aller Artikel eines Kunden mit Rundung auf Rappen.
- **Transparente Rabattspalte**: Separate, sortierbare Anzeige des prozentualen Abschlags auf den offiziellen Bexio-Katalogpreis.
- **Exakte Durchschnittsberechnung**: Arithmetischer Mittelwert (`Ø-Veränderung`) ausschliesslich über tatsächlich angepasste Produkte.

### 3. Kundenkommunikation & Dokumente (Workflow-Schritt 2)
- **Isoliertes Konditionsblatt**: 1-Klick PDF-Druck (`Ctrl+P`), der ausschliesslich das Konditionsblatt für den gewählten Kunden ausgibt (Kopfzeilen, Importbox und Web-Bedienelemente werden im Druck ausgeblendet).
- **E-Mail-Textbaustein**: Formulierter Ankündigungstext mit tabellarischer Preisübersicht und formatiertem HTML-Kopieren für Outlook/Mail.
- **ERP-Re-Import (Bexio & Odoo)**: Strukturierter Excel- und CSV-Export der neu angepassten Preise für den direkten Re-Import in Bexio oder Odoo.

### 4. Artikelsuche & Kunden-Finder (Sortimentsanalyse)
- **Schnellsuche**: Nach Artikelnummer / Code (z. B. `1410`, `ANT`), Farbe (z. B. `Anthrazit`, `Vargas Orange`) oder Modellname.
- **Echtzeit-KPIs**: Anzeige betroffener Kunden, Positionen im Markt, Kundenpreis-Spanne und durchschnittlichem Bexio-Abschlag.
- **Direktsprung**: 1-Klick Weiterleitung («Bearbeiten →») in die Preisanpassung des jeweiligen Kunden.
- **Kampagnen-Export**: Excel-Export aller betroffenen Kunden für Serienmails bei Modellwechseln oder Auslaufartikeln.

---

## Tech-Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI-Bibliothek**: React 19, TypeScript
- **Styling**: Tailwind CSS v4 (Ernesto Vargas CI: Orange `#fe5600`, Anthrazit `#53565A`)
- **Excel-Verarbeitung**: SheetJS (`xlsx`)
- **Client-Speicher**: IndexedDB (`idb-keyval`)
- **Icons**: Lucide React

---

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Die Anwendung ist anschliessend unter [http://localhost:3000](http://localhost:3000) erreichbar.

---

## Deployment auf Vercel

Dieses Projekt ist für das Deployment auf **Vercel** optimiert:

1. Repository auf GitHub pushen:
   ```bash
   git remote add origin https://github.com/sandro-vargas/preisanpassung-auslaufprodukte.git
   git branch -M main
   git push -u origin main
   ```

2. Auf [vercel.com](https://vercel.com) ein neues Projekt importieren:
   - Repository `sandro-vargas/preisanpassung-auslaufprodukte` auswählen.
   - Framework Preset: **Next.js** (wird automatisch erkannt).
   - Build Command: Standard (`npm run build`).
   - Output Directory: Standard (`.next`).
   - Keine zusätzlichen Umgebungsvariablen erforderlich.

3. **Deploy** klicken – Vercel erstellt den Produktions-Build und stellt die Web-Applikation bereit.
