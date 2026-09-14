import * as XLSX from "xlsx";
import { AggregatedProduct } from "./types";

export interface ExportOptions {
  clientName?: string; // if provided, only this client
  targetSystem: "bexio" | "odoo" | "standard";
  format: "xlsx" | "csv";
  effectiveDate?: string;
  manualPrices?: Record<string, number>;
}

export function exportPricingData(
  products: AggregatedProduct[],
  options: ExportOptions
): void {
  // Filter products by client if specified
  const filteredProducts = options.clientName
    ? products.filter((p) => p.client === options.clientName)
    : products;

  // Flatten to variant-level rows matching ERP re-import requirements
  const exportRows: Record<string, string | number>[] = [];

  filteredProducts.forEach((prod) => {
    const oldBase = prod.baseDiscountedPrice;
    const hasBaseOverride = options.manualPrices && options.manualPrices[prod.id] !== undefined;
    const newBase = hasBaseOverride ? options.manualPrices![prod.id] : oldBase;

    prod.variants.forEach((v) => {
      const oldPrice = v.discountedPrice;
      let newPrice = oldPrice;

      if (options.manualPrices && options.manualPrices[v.productCode] !== undefined) {
        newPrice = options.manualPrices[v.productCode];
      } else if (hasBaseOverride) {
        const isOverSize = ["3XL", "XXXL", "4XL", "5XL", "6XL"].includes(v.size.toUpperCase());
        if (isOverSize && oldBase > 0) {
          newPrice = Number((oldPrice * (newBase / oldBase)).toFixed(2));
        } else {
          newPrice = newBase;
        }
      } else if (v.newPrice !== undefined) {
        newPrice = v.newPrice;
      }

      const deltaCHF = Number((newPrice - oldPrice).toFixed(2));
      const deltaPercent = oldPrice > 0 ? Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2)) : 0;
      const platformPriceVat = Number((newPrice * 1.081).toFixed(2));

      if (options.targetSystem === "bexio") {
        // Standard Bexio customer pricing import format
        exportRows.push({
          "Kunde": prod.client,
          "Artikelnummer": v.productCode,
          "Artikelbezeichnung": `${prod.productName} (${v.colour}, ${v.size})`,
          "Katalogpreis CHF": v.bexioPrice,
          "Kundenpreis CHF": newPrice,
          "Bisheriger Kundenpreis CHF": oldPrice,
          "Differenz CHF": deltaCHF,
          "Anpassung %": deltaPercent,
          "Rabattart": v.discountType || "Fixed Price",
          "Gültig ab": options.effectiveDate || new Date().toISOString().split("T")[0]
        });
      } else if (options.targetSystem === "odoo") {
        // Standard Odoo pricelist item format
        exportRows.push({
          "Partner / Kunde": prod.client,
          "Internal Reference": v.productCode,
          "Product Template": prod.productName,
          "Attribute Colour": v.colour,
          "Attribute Size": v.size,
          "List Price": v.bexioPrice,
          "Fixed Price": newPrice,
          "Previous Price": oldPrice,
          "Delta %": deltaPercent,
          "Start Date": options.effectiveDate || new Date().toISOString().split("T")[0]
        });
      } else {
        // Full standard export
        exportRows.push({
          "Client": prod.client,
          "Product Code": v.productCode,
          "Product Name": prod.productName,
          "Colour": v.colour,
          "Size": v.size,
          "Bexio Price (CHF)": v.bexioPrice,
          "Previous Price (CHF)": oldPrice,
          "New Price (CHF)": newPrice,
          "Delta (CHF)": deltaCHF,
          "Delta (%)": deltaPercent,
          "Discount Type": v.discountType || "Percentage",
          "B2B Platform Price incl. VAT (CHF)": platformPriceVat,
          "Effective Date": options.effectiveDate || new Date().toISOString().split("T")[0]
        });
      }
    });
  });

  if (exportRows.length === 0) {
    alert("Keine Datensätze für den Export vorhanden.");
    return;
  }

  // Create sheet
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Preise");

  const cleanClient = options.clientName ? `_${options.clientName.replace(/[^a-zA-Z0-9]/g, "_")}` : "_Gesamt";
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `Ernesto_Vargas_Preise_${options.targetSystem}${cleanClient}_${dateStr}.${options.format}`;

  if (options.format === "csv") {
    // Generate CSV (semicolon separated for DACH/CH Excel compatibility)
    const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ";" });
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
  } else {
    // Write XLSX
    XLSX.writeFile(workbook, filename);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
