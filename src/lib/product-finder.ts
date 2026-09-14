import * as XLSX from "xlsx";
import { RawPricingRow } from "./types";

export interface FinderFilter {
  productCode: string;
  colour: string;
  productName: string;
}

export interface ClientProductMatch {
  id: string; // client + ':::' + productName + ':::' + colour
  client: string;
  productName: string;
  colour: string;
  productCodes: string[];
  sizes: string[];
  variantCount: number;
  minBexioPrice: number;
  maxBexioPrice: number;
  minCustomerPrice: number;
  maxCustomerPrice: number;
  avgDiscountPercent: number;
  sampleProductCode: string;
}

export interface ProductFinderSummary {
  affectedClientsCount: number;
  totalMatchingVariants: number;
  minCustomerPrice: number;
  maxCustomerPrice: number;
  avgDiscountPercent: number;
}

const STANDARD_SIZE_ORDER = [
  "4XS", "3XS", "2XS", "XXS", "XS", "S", "M", "L", "XL",
  "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "6XL", "7XL", "8XL",
  "ONE SIZE", "ONESIZE", "UNISIZE"
];

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const aNorm = a.trim().toUpperCase();
    const bNorm = b.trim().toUpperCase();

    const aIdx = STANDARD_SIZE_ORDER.indexOf(aNorm);
    const bIdx = STANDARD_SIZE_ORDER.indexOf(bNorm);

    if (aIdx !== -1 && bIdx !== -1) {
      return aIdx - bIdx;
    }
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;

    // Check if both are numeric (e.g. German trouser sizes 46, 48, 50, 52)
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }

    return a.localeCompare(b);
  });
}

/**
 * Filter raw pricing rows and aggregate matches by client + productName + colour.
 */
export function findClientProducts(
  rawRows: RawPricingRow[],
  filter: FinderFilter,
  manualPrices?: Record<string, number>
): ClientProductMatch[] {
  const codeQuery = (filter.productCode || "").trim().toLowerCase();
  const colourQuery = (filter.colour || "").trim().toLowerCase();
  const nameQuery = (filter.productName || "").trim().toLowerCase();

  // If no filter is active, return empty to avoid showing all 55k rows at once
  if (!codeQuery && !colourQuery && !nameQuery) {
    return [];
  }

  // Grouping map: client + ':::' + productName + ':::' + colour
  const groups = new Map<
    string,
    {
      client: string;
      productName: string;
      colour: string;
      productCodes: Set<string>;
      sizes: Set<string>;
      bexioPrices: number[];
      customerPrices: number[];
      discounts: number[];
      sampleProductCode: string;
    }
  >();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    // Check product code filter
    if (codeQuery) {
      const code = (row.productCode || "").toLowerCase();
      if (!code.includes(codeQuery)) {
        continue;
      }
    }

    // Check colour filter
    if (colourQuery) {
      const col = (row.colour || "").toLowerCase();
      if (!col.includes(colourQuery)) {
        continue;
      }
    }

    // Check product name filter
    if (nameQuery) {
      const name = (row.productName || "").toLowerCase();
      if (!name.includes(nameQuery)) {
        continue;
      }
    }

    // Build unique group key
    const key = `${row.client}:::${row.productName}:::${row.colour || "Standard"}`;

    // Effective customer price (check manual overrides if any)
    const productId = `${row.client}:::${row.productName}`;
    let effectivePrice = row.discountedPrice;
    if (manualPrices && manualPrices[row.productCode] !== undefined) {
      effectivePrice = manualPrices[row.productCode];
    } else if (manualPrices && manualPrices[productId] !== undefined) {
      effectivePrice = manualPrices[productId];
    }

    const bexio = row.bexioPrice || effectivePrice;
    const discountPct = bexio > 0 ? ((bexio - effectivePrice) / bexio) * 100 : 0;

    let group = groups.get(key);
    if (!group) {
      group = {
        client: row.client,
        productName: row.productName,
        colour: row.colour || "Standard",
        productCodes: new Set<string>(),
        sizes: new Set<string>(),
        bexioPrices: [],
        customerPrices: [],
        discounts: [],
        sampleProductCode: row.productCode || ""
      };
      groups.set(key, group);
    }

    if (row.productCode) {
      group.productCodes.add(row.productCode);
      if (!group.sampleProductCode) group.sampleProductCode = row.productCode;
    }
    if (row.size) {
      group.sizes.add(row.size);
    }
    group.bexioPrices.push(bexio);
    group.customerPrices.push(effectivePrice);
    group.discounts.push(discountPct);
  }

  // Convert grouped matches
  const results: ClientProductMatch[] = [];

  groups.forEach((g, key) => {
    const minBexio = Math.min(...g.bexioPrices);
    const maxBexio = Math.max(...g.bexioPrices);
    const minCust = Math.min(...g.customerPrices);
    const maxCust = Math.max(...g.customerPrices);
    const avgDisc = g.discounts.reduce((sum, d) => sum + d, 0) / (g.discounts.length || 1);

    results.push({
      id: key,
      client: g.client,
      productName: g.productName,
      colour: g.colour,
      productCodes: Array.from(g.productCodes),
      sizes: sortSizes(Array.from(g.sizes)),
      variantCount: g.bexioPrices.length,
      minBexioPrice: Number(minBexio.toFixed(2)),
      maxBexioPrice: Number(maxBexio.toFixed(2)),
      minCustomerPrice: Number(minCust.toFixed(2)),
      maxCustomerPrice: Number(maxCust.toFixed(2)),
      avgDiscountPercent: Number(avgDisc.toFixed(1)),
      sampleProductCode: g.sampleProductCode
    });
  });

  // Default sort by client ascending, then product name
  return results.sort((a, b) => {
    const clientCmp = a.client.localeCompare(b.client);
    if (clientCmp !== 0) return clientCmp;
    return a.productName.localeCompare(b.productName);
  });
}

/**
 * Calculate KPI summary over all matching items.
 */
export function calculateFinderSummary(matches: ClientProductMatch[]): ProductFinderSummary {
  if (matches.length === 0) {
    return {
      affectedClientsCount: 0,
      totalMatchingVariants: 0,
      minCustomerPrice: 0,
      maxCustomerPrice: 0,
      avgDiscountPercent: 0
    };
  }

  const clients = new Set<string>();
  let totalVariants = 0;
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let sumDiscount = 0;

  for (const m of matches) {
    clients.add(m.client);
    totalVariants += m.variantCount;
    if (m.minCustomerPrice < minPrice) minPrice = m.minCustomerPrice;
    if (m.maxCustomerPrice > maxPrice) maxPrice = m.maxCustomerPrice;
    sumDiscount += m.avgDiscountPercent;
  }

  return {
    affectedClientsCount: clients.size,
    totalMatchingVariants: totalVariants,
    minCustomerPrice: minPrice === Infinity ? 0 : minPrice,
    maxCustomerPrice: maxPrice === -Infinity ? 0 : maxPrice,
    avgDiscountPercent: Number((sumDiscount / matches.length).toFixed(1))
  };
}

/**
 * Extract distinct colours from the raw dataset, sorted alphabetically.
 */
export function extractUniqueColours(rawRows: RawPricingRow[]): string[] {
  const colours = new Set<string>();
  for (let i = 0; i < rawRows.length; i++) {
    const c = rawRows[i].colour;
    if (c && c.trim()) {
      colours.add(c.trim());
    }
  }
  return Array.from(colours).sort((a, b) => a.localeCompare(b));
}

/**
 * Export matching items and clients to an Excel file for marketing/sales/Bexio notifications.
 */
export function exportMatchingClientsToExcel(
  matches: ClientProductMatch[],
  filter: FinderFilter
): void {
  if (matches.length === 0) {
    alert("Keine Treffer für den Export vorhanden.");
    return;
  }

  const exportRows = matches.map((m) => {
    const priceText =
      m.minCustomerPrice === m.maxCustomerPrice
        ? m.minCustomerPrice.toFixed(2)
        : `${m.minCustomerPrice.toFixed(2)} - ${m.maxCustomerPrice.toFixed(2)}`;

    const bexioText =
      m.minBexioPrice === m.maxBexioPrice
        ? m.minBexioPrice.toFixed(2)
        : `${m.minBexioPrice.toFixed(2)} - ${m.maxBexioPrice.toFixed(2)}`;

    return {
      "Kunde / Unternehmen": m.client,
      "Produktname": m.productName,
      "Farbe": m.colour,
      "Geführte Grössen": m.sizes.join(", "),
      "Anzahl Varianten": m.variantCount,
      "Artikelnummern": m.productCodes.join(", "),
      "Katalogpreis Bexio (CHF)": bexioText,
      "Kundenpreis (CHF)": priceText,
      "Rabatt / Abschlag (%)": `-${m.avgDiscountPercent.toFixed(1)} %`,
      "Suchkriterien": [
        filter.productCode ? `Code: ${filter.productCode}` : "",
        filter.colour ? `Farbe: ${filter.colour}` : "",
        filter.productName ? `Produkt: ${filter.productName}` : ""
      ]
        .filter(Boolean)
        .join(" | "),
      "Exportdatum": new Date().toISOString().split("T")[0]
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Betroffene Kunden");

  const filterSuffix = [filter.productCode, filter.colour, filter.productName]
    .filter(Boolean)
    .join("_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const safeSuffix = filterSuffix ? `_${filterSuffix}` : "";
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `Ernesto_Vargas_Auslaufartikel_Kunden${safeSuffix}_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
