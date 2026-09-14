"use client";

import React, { useState, useMemo, useCallback } from "react";
import { RawPricingRow } from "@/lib/types";
import {
  findClientProducts,
  calculateFinderSummary,
  extractUniqueColours,
  exportMatchingClientsToExcel,
  ClientProductMatch,
  FinderFilter
} from "@/lib/product-finder";
import {
  Search,
  Filter,
  Download,
  Copy,
  Check,
  RotateCcw,
  Users,
  Layers,
  Tag,
  Percent,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Shirt
} from "lucide-react";

interface ProductClientFinderProps {
  rawRows: RawPricingRow[];
  manualPrices: Record<string, number>;
  onOpenClient: (clientName: string, tab: "pricing" | "communication") => void;
}

type SortField = "client" | "productName" | "price" | "discount" | "variants";
type SortOrder = "asc" | "desc";

export const ProductClientFinder: React.FC<ProductClientFinderProps> = ({
  rawRows,
  manualPrices,
  onOpenClient
}) => {
  // Filters
  const [productCodeInput, setProductCodeInput] = useState("");
  const [colourInput, setColourInput] = useState("");
  const [productNameInput, setProductNameInput] = useState("");

  // Table sorting
  const [sortField, setSortField] = useState<SortField>("client");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Copy feedback
  const [copiedClients, setCopiedClients] = useState(false);

  // Extract unique colours for autocomplete datalist
  const uniqueColours = useMemo(() => {
    return extractUniqueColours(rawRows);
  }, [rawRows]);

  // Active filter object
  const activeFilter: FinderFilter = useMemo(
    () => ({
      productCode: productCodeInput,
      colour: colourInput,
      productName: productNameInput
    }),
    [productCodeInput, colourInput, productNameInput]
  );

  const hasActiveFilter = Boolean(
    productCodeInput.trim() || colourInput.trim() || productNameInput.trim()
  );

  // Matches
  const matches = useMemo(() => {
    return findClientProducts(rawRows, activeFilter, manualPrices);
  }, [rawRows, activeFilter, manualPrices]);

  // Summary KPIs
  const summary = useMemo(() => {
    return calculateFinderSummary(matches);
  }, [matches]);

  // Distinct clients list among matches
  const matchingClientNames = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => set.add(m.client));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [matches]);

  // Sort matches
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "client":
          cmp = a.client.localeCompare(b.client);
          break;
        case "productName":
          cmp = a.productName.localeCompare(b.productName);
          break;
        case "price":
          cmp = a.minCustomerPrice - b.minCustomerPrice;
          break;
        case "discount":
          cmp = a.avgDiscountPercent - b.avgDiscountPercent;
          break;
        case "variants":
          cmp = a.variantCount - b.variantCount;
          break;
        default:
          cmp = 0;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [matches, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleResetFilters = () => {
    setProductCodeInput("");
    setColourInput("");
    setProductNameInput("");
  };

  const handleCopyClientNames = useCallback(() => {
    if (matchingClientNames.length === 0) return;
    const text = matchingClientNames.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedClients(true);
      setTimeout(() => setCopiedClients(false), 2500);
    });
  }, [matchingClientNames]);

  const handleExportExcel = useCallback(() => {
    exportMatchingClientsToExcel(matches, activeFilter);
  }, [matches, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Intro & Search Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-[#53565A] text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-[#fe5600]/20 text-[#ff833e] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#fe5600]/30">
                <Search className="w-3.5 h-3.5" />
                <span>Sortiments- &amp; Auslaufartikel-Finder</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Artikelsuche &amp; Kunden-Identifikation
              </h1>
              <p className="text-sm text-gray-300 mt-1 max-w-3xl">
                Finden Sie auf Knopfdruck heraus, welche Kunden spezifische Artikelnummern oder Farben im Sortiment führen. Ideal zur proaktiven Kundenansprache bei Modellwechseln oder Auslaufprodukten.
              </p>
            </div>

            {hasActiveFilter && (
              <button
                onClick={handleResetFilters}
                className="self-start md:self-auto inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all border border-white/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filter zurücksetzen</span>
              </button>
            )}
          </div>

          {/* Search Inputs Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10">
            {/* 1. Article / Product Code */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Artikelnummer / Code
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productCodeInput}
                  onChange={(e) => setProductCodeInput(e.target.value)}
                  placeholder="z. B. 1410, ANT-001, CRG-PRO"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#1f2124] border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#fe5600] focus:border-transparent font-mono"
                />
              </div>
            </div>

            {/* 2. Colour / Colourway */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Farbe / Ausführung
              </label>
              <div className="relative">
                <Shirt className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  list="colours-datalist"
                  value={colourInput}
                  onChange={(e) => setColourInput(e.target.value)}
                  placeholder="z. B. Anthrazit, Schwarz, Orange"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#1f2124] border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#fe5600] focus:border-transparent"
                />
                <datalist id="colours-datalist">
                  {uniqueColours.map((col) => (
                    <option key={col} value={col} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* 3. Product Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Basis-Produktname (optional)
              </label>
              <div className="relative">
                <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productNameInput}
                  onChange={(e) => setProductNameInput(e.target.value)}
                  placeholder="z. B. Antonio, Softshell, Galaxy"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#1f2124] border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#fe5600] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Colour Chips for one-click filtering */}
        {uniqueColours.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-gray-500 font-medium whitespace-nowrap">
              Häufige Farben:
            </span>
            <div className="flex items-center gap-1.5">
              {uniqueColours.slice(0, 8).map((col) => (
                <button
                  key={col}
                  onClick={() => setColourInput(colourInput === col ? "" : col)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                    colourInput.toLowerCase() === col.toLowerCase()
                      ? "bg-[#fe5600] text-white border-[#fe5600] shadow-xs"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPI Overview Banner (Visible when filters are set) */}
      {hasActiveFilter && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Betroffene Kunden
              </span>
              <Users className="w-4 h-4 text-[#fe5600]" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.affectedClientsCount}{" "}
              <span className="text-sm font-normal text-gray-500">
                {summary.affectedClientsCount === 1 ? "Kunde" : "Kunden"}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Führen diesen Artikel im Sortiment
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Gefundene Positionen
              </span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.totalMatchingVariants}{" "}
              <span className="text-sm font-normal text-gray-500">
                Grössen-/Farbausführungen
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              über {matches.length} Produkt-Farbkombinationen
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Kundenpreis-Spanne
              </span>
              <Tag className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.minCustomerPrice > 0 ? (
                <>
                  <span className="text-xs text-gray-400 font-normal">CHF </span>
                  {summary.minCustomerPrice.toFixed(2)}
                  {summary.minCustomerPrice !== summary.maxCustomerPrice && (
                    <>
                      <span className="text-xs text-gray-400 font-normal"> – </span>
                      {summary.maxCustomerPrice.toFixed(2)}
                    </>
                  )}
                </>
              ) : (
                "-"
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Günstigster bis teuerster Kundenpreis
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Ø-Abschlag auf Bexio
              </span>
              <Percent className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.avgDiscountPercent > 0 ? `-${summary.avgDiscountPercent.toFixed(1)} %` : "0.0 %"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Durchschnittlicher Kundenrabatt
            </div>
          </div>
        </div>
      )}

      {/* Results Table Section */}
      {hasActiveFilter ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Action Bar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-gray-900">
                Gefundene Kunden &amp; Konditionen
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fe5600]/10 text-[#fe5600] border border-[#fe5600]/20">
                {matches.length} {matches.length === 1 ? "Treffer" : "Treffer"} ({matchingClientNames.length} {matchingClientNames.length === 1 ? "Kunde" : "Kunden"})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Copy Client Names */}
              <button
                onClick={handleCopyClientNames}
                disabled={matches.length === 0}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all disabled:opacity-50"
                title="Kopiert alle Kundennamen in die Zwischenablage"
              >
                {copiedClients ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>Kundenliste kopieren</span>
                  </>
                )}
              </button>

              {/* Export Excel */}
              <button
                onClick={handleExportExcel}
                disabled={matches.length === 0}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#53565A] hover:bg-[#43464a] text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Excel-Export</span>
              </button>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800">
                Keine passenden Kunden gefunden
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                Für die eingegebenen Suchkriterien (Artikelnummer, Farbe oder Produktname) wurden im aktuellen Datensatz keine Treffer ermittelt.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filter zurücksetzen</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 cursor-pointer hover:text-gray-900"
                      onClick={() => handleSort("client")}
                    >
                      Kunde / Unternehmen {sortField === "client" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Artikelnummer(n)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 cursor-pointer hover:text-gray-900"
                      onClick={() => handleSort("productName")}
                    >
                      Produkt &amp; Farbe {sortField === "productName" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Geführte Grössen
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Bexio (CHF)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right cursor-pointer hover:text-gray-900"
                      onClick={() => handleSort("price")}
                    >
                      Kundenpreis {sortField === "price" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right cursor-pointer hover:text-gray-900"
                      onClick={() => handleSort("discount")}
                    >
                      Abschlag % {sortField === "discount" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Aktion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedMatches.map((m) => {
                    const priceDisplay =
                      m.minCustomerPrice === m.maxCustomerPrice
                        ? `CHF ${m.minCustomerPrice.toFixed(2)}`
                        : `CHF ${m.minCustomerPrice.toFixed(2)} – ${m.maxCustomerPrice.toFixed(2)}`;

                    const bexioDisplay =
                      m.minBexioPrice === m.maxBexioPrice
                        ? `CHF ${m.minBexioPrice.toFixed(2)}`
                        : `CHF ${m.minBexioPrice.toFixed(2)} – ${m.maxBexioPrice.toFixed(2)}`;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Client */}
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span>{m.client}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-medium">
                              {m.variantCount} {m.variantCount === 1 ? "Var." : "Var."}
                            </span>
                          </div>
                        </td>

                        {/* 2. Product Codes */}
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                          {m.productCodes.length <= 2 ? (
                            <div className="flex flex-wrap gap-1">
                              {m.productCodes.map((code) => (
                                <span
                                  key={code}
                                  className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200">
                                {m.productCodes[0]}
                              </span>
                              <span
                                className="text-[11px] text-gray-500 font-sans cursor-help"
                                title={m.productCodes.join(", ")}
                              >
                                +{m.productCodes.length - 1} weitere
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 3. Product & Colour */}
                        <td className="px-4 py-3 text-gray-800">
                          <div className="font-medium">{m.productName}</div>
                          <div className="inline-flex items-center space-x-1 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-[#fe5600]/80" />
                            <span className="text-xs text-gray-500">{m.colour}</span>
                          </div>
                        </td>

                        {/* 4. Sizes */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {m.sizes.map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 5. Bexio Price */}
                        <td className="px-4 py-3 text-right text-xs text-gray-500 font-mono">
                          {bexioDisplay}
                        </td>

                        {/* 6. Customer Price */}
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 font-mono text-xs">
                          {priceDisplay}
                        </td>

                        {/* 7. Discount % */}
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-mono ${
                              m.avgDiscountPercent > 20
                                ? "bg-amber-100 text-amber-800"
                                : m.avgDiscountPercent > 0
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {m.avgDiscountPercent > 0 ? `-${m.avgDiscountPercent.toFixed(1)} %` : "0.0 %"}
                          </span>
                        </td>

                        {/* 8. Action Direct Jump */}
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => onOpenClient(m.client, "pricing")}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-[#fe5600] hover:text-white text-gray-700 rounded border border-gray-300 text-xs font-medium transition-all shadow-2xs"
                              title="Preise dieses Kunden bearbeiten"
                            >
                              <span>Bearbeiten</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onOpenClient(m.client, "communication")}
                              className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
                              title="Konditionsblatt &amp; E-Mail öffnen"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Empty Guidance State when no filter is active */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-orange-50 text-[#fe5600] flex items-center justify-center mx-auto mb-4 border border-orange-100">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Gezielte Sortimentssuche starten
          </h2>
          <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">
            Geben Sie oben eine <strong>Artikelnummer</strong> (z. B. <code>1410</code>, <code>ANT</code>), eine <strong>Farbe</strong> (z. B. <code>Anthrazit</code>, <code>Navy</code>) oder einen <strong>Produktnamen</strong> ein, um sofort alle betroffenen Kunden samt Konditionen aufzulisten.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
            <span className="text-gray-400 py-1 font-medium">Beispiele zum Ausprobieren:</span>
            <button
              onClick={() => setProductCodeInput("ANT")}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-mono transition-colors"
            >
              ANT
            </button>
            <button
              onClick={() => setProductCodeInput("CRG")}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-mono transition-colors"
            >
              CRG
            </button>
            <button
              onClick={() => setColourInput("Anthrazit")}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors"
            >
              Farbe: Anthrazit
            </button>
            <button
              onClick={() => setProductNameInput("Softshell")}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors"
            >
              Softshell
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
