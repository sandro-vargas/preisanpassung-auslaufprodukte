# PROJECT_CONTEXT.md

## 1. System & Tech Stack
- **Framework & Runtime:** Next.js 16.3.5 (App Router, Turbopack), React 19.2.8, TypeScript 5.
- **UI & Styling:** Tailwind CSS 4 (`@tailwindcss/postcss`), Lucide Icons (`lucide-react`), `canvas-confetti`.
- **Branding Tokens:** Ernesto Vargas B2B — Orange: `#fe5600`, Anthracite: `#53565A`, Dark: `#191A1B` / `#101112`.
- **Storage & Engine:** 100% Client-Side SPA. Zero server DB/ORM. Persistence: IndexedDB (`idb-keyval`). Sheets: SheetJS (`xlsx`).
- **Deployment:** Vercel (static/SPA client build), stateless.

## 2. Directory Mapping
```text
/
├── public/                 # Static public assets
├── src/
│   ├── app/                # App Router (layout.tsx, page.tsx, globals.css)
│   ├── components/         # Feature UI
│   │   ├── AnalysisDashboard.tsx     # Primary pricing table, sort, batch/single overrides
│   │   ├── CustomerCommunication.tsx # B2B-Shop Upload («Import Client Prices»), PDF, Email
│   │   ├── DataImport.tsx            # Drag & drop Excel upload with progress feedback
│   │   ├── ProductClientFinder.tsx   # Cross-client variant/color catalog search
│   │   ├── Header.tsx / AuthGate.tsx # Top navigation bar and password protection gate
│   │   └── SearchableClientSelect.tsx# Client selector dropdown
│   ├── hooks/
│   │   └── useAuth.ts      # Client auth token & session gate
│   └── lib/                # Core calculation & business logic
│       ├── types.ts        # Domain interfaces (RawPricingRow, AggregatedProduct, etc.)
│       ├── aggregator.ts   # Grouping 55k+ rows by Client:::ProductName & anomaly detection
│       ├── excel-parser.ts # In-browser Excel parser (.xlsx/.xls) with header fuzzy matching
│       ├── export.ts       # XLSX/CSV generation for Ernesto Vargas B2B-Shop
│       ├── db.ts           # IndexedDB caching wrappers (idb-keyval)
│       ├── simulator.ts    # Rule calculation engine (discount caps, gross adjustments)
│       ├── product-finder.ts# Search indexing across products and variants
│       ├── mock-data.ts    # Seed dataset generator (1'200 standard items)
│       └── utils.ts        # Currency (CHF) & percentage formatting helpers
```

## 3. Core Data Contracts & Interfaces (`src/lib/types.ts`)
```ts
export interface RawPricingRow {
  clientId?: string; client: string; articleId?: string; productCode: string;
  productName: string; colour: string; size: string; bexioPrice: number;
  discountType: string; discountedPrice: number; platformPriceInclVat: number;
}
export interface VariantDetail {
  articleId?: string; productCode: string; colour: string; size: string;
  bexioPrice: number; discountedPrice: number; discountCHF: number;
  discountPercent: number; platformPriceInclVat: number; discountType: string;
  newPrice?: number; isManualOverride?: boolean;
}
export interface AggregatedProduct {
  id: string; clientId?: string; client: string; productName: string;
  variantCount: number; sizes: string[]; colours: string[];
  baseBexioPrice: number; baseDiscountedPrice: number; baseDiscountCHF: number;
  baseDiscountPercent: number; hasVaryingPrices: boolean;
  minDiscountedPrice: number; maxDiscountedPrice: number;
  anomalyType: "none" | "negative_discount" | "zero_discount" | "extreme_discount";
  variants: VariantDetail[];
}
export interface ExportOptions {
  clientName?: string; targetSystem: "b2b_shop" | "bexio" | "odoo" | "standard";
  format: "xlsx" | "csv"; effectiveDate?: string; manualPrices?: Record<string, number>;
}
```

## 4. Architectural Conventions & Rules
- **Client-Side Invariant:** No server API routes or server DB. All mutations occur in React state (`manualPrices`) and persist to IndexedDB via `src/lib/db.ts`.
- **Domain Flow:** B2B-Shop Export *«Export Company Products with Discounts»* $\rightarrow$ `excel-parser.ts` $\rightarrow$ `aggregator.ts` $\rightarrow$ `AnalysisDashboard` $\rightarrow$ `export.ts` (*«Import Client Prices»*).
- **Price Semantics:** `bexioPrice` = Katalogpreis (excl. VAT). `discountedPrice` / `newPrice` = Kundenpreis (excl. VAT). Platform price = incl. 8.1% VAT.
- **B2B-Shop Upload Columns:** Must strictly produce `Kunde`, `Artikelnummer`, `Katalogpreis CHF`, and `Kundenpreis CHF` (with optional `Client ID` / `Article ID`). All lines populated.

## 5. Agent Operating Instructions
1. **Read this file first:** Do not scan the workspace or search for backend systems.
2. **Direct Targeting:** Target only relevant components in `src/components/` or logic in `src/lib/`.
3. **Maintain Constraints:** Keep imports client-safe (`use client`), enforce `#fe5600` / `#53565A` branding, avoid server dependencies.
4. **Keep Updated:** Update `PROJECT_CONTEXT.md` if data models in `types.ts` or target flows change.
