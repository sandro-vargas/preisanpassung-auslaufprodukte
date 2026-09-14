import * as XLSX from "xlsx";
import { RawPricingRow } from "./types";

export interface ParseProgressCallback {
  (progress: number, statusText: string): void;
}

/**
 * Normalizes an Excel column header to ease matching
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Parses uploaded Excel workbook array buffer into RawPricingRow array
 */
export async function parseExcelFile(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<RawPricingRow[]> {
  if (onProgress) onProgress(10, "Datei wird eingelesen...");

  const data = await file.arrayBuffer();
  if (onProgress) onProgress(30, "Tabellenstruktur wird verarbeitet...");

  const workbook = XLSX.read(data, {
    type: "array",
    dense: true,
    cellDates: false
  });

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error("Die Excel-Datei enthält keine Tabellenblätter.");
  }

  if (onProgress) onProgress(50, "Zeilen werden extrahiert...");

  // Convert sheet to JSON array of objects
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: ""
  });

  if (!rawJson || rawJson.length === 0) {
    throw new Error("Die Excel-Datei enthält keine Datenzeilen.");
  }

  if (onProgress) onProgress(70, `${rawJson.length.toLocaleString("de-CH")} Zeilen werden analysiert...`);

  // Detect column mapping based on first non-empty row keys
  const sampleRow = rawJson[0];
  const columnKeys = Object.keys(sampleRow);

  const findKey = (candidates: string[]): string | undefined => {
    const normalizedCandidates = candidates.map(normalizeHeader);
    return columnKeys.find((col) => {
      const norm = normalizeHeader(col);
      return normalizedCandidates.some((c) => norm.includes(c));
    });
  };

  const clientKey = findKey(["client", "kunde", "kundenname", "customer"]) || "Client";
  const productCodeKey = findKey(["productcode", "artikelnummer", "code", "sku", "artikelnr"]) || "Product Code";
  const productNameKey = findKey(["productname", "produktname", "artikelbezeichnung", "name", "produkt"]) || "Product Name";
  const colourKey = findKey(["colour", "color", "farbe", "farbbezeichnung"]) || "Colour";
  const sizeKey = findKey(["size", "grosse", "grösse", "groesse"]) || "Size";
  const bexioPriceKey = findKey(["bexioprice", "listenpreis", "bexiopreis", "bruttopreis", "price"]) || "Bexio Price (CHF)";
  const discountTypeKey = findKey(["discounttype", "rabattart", "rabatt-typ", "type"]) || "Discount Type";
  const discountedPriceKey = findKey(["discountedprice", "kundenpreis", "abgabepreis", "nettopreis"]) || "Discounted Price (CHF)";
  const platformPriceKey = findKey(["b2bplatformprice", "plattformpreis", "b2bpreis", "priceinclvat"]) || "B2B Platform Price incl. VAT (CHF)";

  const parsedRows: RawPricingRow[] = [];
  const total = rawJson.length;
  const chunkSize = 5000;

  for (let i = 0; i < total; i++) {
    const row = rawJson[i];
    const client = String(row[clientKey] || "").trim();
    const productName = String(row[productNameKey] || "").trim();

    // Skip empty lines without client or product name
    if (!client && !productName) continue;

    const productCode = String(row[productCodeKey] || `ART-${i + 1}`).trim();
    const colour = String(row[colourKey] || "Standard").trim();
    const size = String(row[sizeKey] || "M").trim();

    const parseNum = (val: unknown): number => {
      if (typeof val === "number") return isNaN(val) ? 0 : val;
      if (typeof val === "string") {
        const cleaned = val.replace(/[^0-9.-]+/g, "");
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      }
      return 0;
    };

    const bexioPrice = parseNum(row[bexioPriceKey]);
    const discountedPrice = parseNum(row[discountedPriceKey]);
    const platformPriceInclVat = parseNum(row[platformPriceKey]) || Number((discountedPrice * 1.081).toFixed(2));
    const discountType = String(row[discountTypeKey] || "Percentage").trim();

    parsedRows.push({
      client: client || "Unbekannter Kunde",
      productCode,
      productName: productName || "Unbenanntes Produkt",
      colour,
      size,
      bexioPrice,
      discountType,
      discountedPrice,
      platformPriceInclVat
    });

    if (onProgress && i % chunkSize === 0) {
      const pct = 70 + Math.round((i / total) * 25);
      onProgress(pct, `${i.toLocaleString("de-CH")} von ${total.toLocaleString("de-CH")} Datensätzen eingelesen...`);
      // Allow event loop to process
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (onProgress) onProgress(100, "Excel-Import erfolgreich abgeschlossen!");
  return parsedRows;
}
