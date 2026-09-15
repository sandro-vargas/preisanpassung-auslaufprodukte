"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle2,
  RotateCcw,
  Search,
  ArrowUpDown,
  Tag,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Percent,
  Sparkles,
  TrendingUp,
  SlidersHorizontal
} from "lucide-react";
import { AggregatedProduct, ClientKpi } from "@/lib/types";
import { formatCHF, formatPercent } from "@/lib/utils";
import { SearchableClientSelect } from "./SearchableClientSelect";

interface AnalysisDashboardProps {
  products: AggregatedProduct[];
  clientKpis: Map<string, ClientKpi>;
  clients: string[];
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  manualPrices: Record<string, number>;
  onUpdatePrice: (productId: string, newPrice: number | null) => void;
  onApplyBatchPercentToClient: (client: string, percent: number) => void;
  onResetClientPrices: (client: string) => void;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  products,
  clientKpis,
  clients,
  selectedClient,
  setSelectedClient,
  manualPrices,
  onUpdatePrice,
  onApplyBatchPercentToClient,
  onResetClientPrices
}) => {
  // Search and view filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChangedOnly, setFilterChangedOnly] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Batch percent tool state
  const [batchPercentInput, setBatchPercentInput] = useState<number>(4.5);
  const [showBatchTool, setShowBatchTool] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>("productName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Local draft inputs so fields can be completely cleared during typing
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});

  const getDisplayValue = (id: string, fallback: number): string => {
    if (inputDrafts[id] !== undefined) {
      return inputDrafts[id];
    }
    if (manualPrices[id] !== undefined) {
      return String(manualPrices[id]);
    }
    return String(fallback);
  };

  const handlePriceInputChange = (id: string, rawValue: string) => {
    setInputDrafts((prev) => ({ ...prev, [id]: rawValue }));

    const trimmed = rawValue.trim();
    if (trimmed === "") {
      onUpdatePrice(id, null);
      return;
    }

    const cleaned = trimmed.replace(",", ".");
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 0) {
      onUpdatePrice(id, num);
    }
  };

  const handlePriceInputBlur = (id: string) => {
    setInputDrafts((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Client Index for step-by-step navigation
  const currentClientIndex = clients.indexOf(selectedClient);
  const hasPreviousClient = currentClientIndex > 0;
  const hasNextClient = currentClientIndex !== -1 && currentClientIndex < clients.length - 1;

  const handlePrevClient = () => {
    if (hasPreviousClient) {
      setSelectedClient(clients[currentClientIndex - 1]);
    }
  };

  const handleNextClient = () => {
    if (hasNextClient) {
      setSelectedClient(clients[currentClientIndex + 1]);
    }
  };

  // Map product counts for the searchable dropdown
  const clientProductCounts = useMemo(() => {
    const map = new Map<string, number>();
    clientKpis.forEach((kpi, cName) => {
      map.set(cName, kpi.productCount);
    });
    return map;
  }, [clientKpis]);

  // Products belonging strictly to the selected client
  const clientProducts = useMemo(() => {
    return products.filter((p) => p.client === selectedClient);
  }, [products, selectedClient]);

  // Enriched products with new price, delta CHF and right-aligned delta percent
  const enrichedProducts = useMemo(() => {
    return clientProducts.map((p) => {
      const oldPrice = p.baseDiscountedPrice;
      const hasOverride = manualPrices[p.id] !== undefined;
      const newPrice = hasOverride ? manualPrices[p.id] : oldPrice;
      const deltaCHF = Number((newPrice - oldPrice).toFixed(2));
      const deltaPercent = oldPrice > 0 ? Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2)) : 0;

      // Variants with their respective new prices
      const variantsWithPrices = p.variants.map((v) => {
        const vOld = v.discountedPrice;
        const vHasOverride = manualPrices[v.productCode] !== undefined;
        let vNew = vOld;
        if (vHasOverride) {
          vNew = manualPrices[v.productCode];
        } else if (hasOverride && oldPrice > 0) {
          const ratio = newPrice / oldPrice;
          vNew = Number((vOld * ratio).toFixed(2));
        }
        const vDelta = Number((vNew - vOld).toFixed(2));
        const vDeltaPct = vOld > 0 ? Number((((vNew - vOld) / vOld) * 100).toFixed(2)) : 0;

        return {
          ...v,
          newPrice: vNew,
          deltaCHF: vDelta,
          deltaPercent: vDeltaPct,
          isManualOverride: vHasOverride
        };
      });

      return {
        ...p,
        effectiveNewPrice: newPrice,
        deltaCHF,
        deltaPercent,
        isChanged: hasOverride && Math.abs(deltaCHF) > 0.001,
        variantsWithPrices
      };
    });
  }, [clientProducts, manualPrices]);

  // Client Summary Metrics with transparent mathematical calculation
  const clientMetrics = useMemo(() => {
    let oldSum = 0;
    let newSum = 0;

    enrichedProducts.forEach((p) => {
      oldSum += p.baseDiscountedPrice;
      newSum += p.effectiveNewPrice;
    });

    const changedProducts = enrichedProducts.filter((p) => p.isChanged);
    const changedCount = changedProducts.length;

    // 1. Arithmetischer Mittelwert der tatsächlich angepassten Artikel
    // (Z. B. 1 Artikel +4%, 1 Artikel +6% = Ø +5.0%)
    const avgDeltaPercentOfChanged = changedCount > 0
      ? Number((changedProducts.reduce((acc, p) => acc + p.deltaPercent, 0) / changedCount).toFixed(1))
      : 0;

    // 2. Gesamter Portfolio-Effekt (Summe aller Preise)
    const totalDeltaCHF = Number((newSum - oldSum).toFixed(2));
    const totalPortfolioDeltaPercent = oldSum > 0 ? Number((((newSum - oldSum) / oldSum) * 100).toFixed(1)) : 0;

    return {
      totalArticles: enrichedProducts.length,
      oldSum: Number(oldSum.toFixed(2)),
      newSum: Number(newSum.toFixed(2)),
      totalDeltaCHF,
      avgDeltaPercentOfChanged,
      totalPortfolioDeltaPercent,
      changedCount
    };
  }, [enrichedProducts]);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    let list = [...enrichedProducts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.variants.some((v) => v.productCode.toLowerCase().includes(q) || v.colour.toLowerCase().includes(q))
      );
    }

    if (filterChangedOnly) {
      list = list.filter((p) => p.isChanged);
    }

    list.sort((a, b) => {
      let valA: string | number = a.productName;
      let valB: string | number = b.productName;

      if (sortField === "productName") {
        valA = a.productName;
        valB = b.productName;
      } else if (sortField === "baseBexioPrice") {
        valA = a.baseBexioPrice;
        valB = b.baseBexioPrice;
      } else if (sortField === "baseDiscountedPrice") {
        valA = a.baseDiscountedPrice;
        valB = b.baseDiscountedPrice;
      } else if (sortField === "baseDiscountPercent") {
        valA = a.baseDiscountPercent;
        valB = b.baseDiscountPercent;
      } else if (sortField === "effectiveNewPrice") {
        valA = a.effectiveNewPrice;
        valB = b.effectiveNewPrice;
      } else if (sortField === "deltaPercent") {
        valA = a.deltaPercent;
        valB = b.deltaPercent;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return list;
  }, [enrichedProducts, searchQuery, filterChangedOnly, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Step-by-Step Navigation Bar with SEARCHABLE DROPDOWN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Customer Selection with Next/Prev Buttons and Searchable Combobox */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full lg:w-auto">
            <button
              onClick={handlePrevClient}
              disabled={!hasPreviousClient}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-xs shrink-0"
              title="Vorherigen Kunden aufrufen"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Vorheriger Kunde</span>
            </button>

            {/* SEARCHABLE CLIENT DROPDOWN */}
            <SearchableClientSelect
              clients={clients}
              selectedClient={selectedClient}
              onSelectClient={setSelectedClient}
              clientProductCounts={clientProductCounts}
            />

            <button
              onClick={handleNextClient}
              disabled={!hasNextClient}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#53565A] hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-white transition-colors shadow-xs shrink-0"
              title="Nächsten Kunden aufrufen"
            >
              <span className="hidden sm:inline">Nächster Kunde</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg whitespace-nowrap hidden sm:inline-block">
              {currentClientIndex + 1} / {clients.length}
            </span>
          </div>

          {/* Quick Tools: Batch % Helper & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowBatchTool(!showBatchTool)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 text-[#fe5600] border border-orange-200 hover:bg-orange-100 text-xs font-bold transition-all shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Pauschal-% Assistent</span>
            </button>

            {clientMetrics.changedCount > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Alle individuellen Anpassungen für "${selectedClient}" zurücksetzen?`)) {
                    onResetClientPrices(selectedClient);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition-all"
                title="Kundenpreise auf Ausgangswerte zurücksetzen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Zurücksetzen</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Batch % Helper Drawer */}
        {showBatchTool && (
          <div className="mt-4 pt-4 border-t border-slate-100 bg-orange-50/50 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#fe5600]" />
              <span className="font-bold text-slate-800">
                Pauschale Vorbelegung für {selectedClient}:
              </span>
              <span className="text-slate-500">
                Erhöht alle Artikel dieses Kunden um einen %-Satz (bleibt danach zeilenweise editierbar).
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                value={batchPercentInput}
                onChange={(e) => setBatchPercentInput(parseFloat(e.target.value) || 0)}
                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-800"
              />
              <span className="font-bold text-slate-700">%</span>
              <button
                onClick={() => {
                  onApplyBatchPercentToClient(selectedClient, batchPercentInput);
                  setShowBatchTool(false);
                }}
                className="px-3 py-1.5 rounded-md bg-[#fe5600] hover:bg-[#e04c00] text-white font-bold transition-colors shadow-xs"
              >
                Auf alle {clientProducts.length} Artikel anwenden
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer KPI Bar with Transparent Average % Change */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Product Count */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Zugeordnete Artikel
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{clientMetrics.totalArticles}</span>
            <span className="text-xs text-slate-500">Produkte</span>
          </div>
        </div>

        {/* Metric 2: Bisheriges Volumen */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Bisheriges Volumen
          </span>
          <div className="text-xl font-bold text-slate-600 mt-1">
            {formatCHF(clientMetrics.oldSum)}
          </div>
          <span className="text-[11px] text-slate-400">Summe Abgabepreise</span>
        </div>

        {/* Metric 3: Neues Volumen */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Neues Kundenvolumen
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCHF(clientMetrics.newSum)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {clientMetrics.totalDeltaCHF >= 0 ? "+" : ""}
            {formatCHF(clientMetrics.totalDeltaCHF)}
          </span>
        </div>

        {/* Metric 4: Ø-Veränderung in % (Transparent!) */}
        <div className="bg-white p-4 rounded-xl border-2 border-[#fe5600] shadow-sm bg-orange-50/20">
          <span className="text-[11px] font-black text-[#fe5600] uppercase tracking-wider block">
            Ø-Veränderung (angepasst)
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={`text-2xl font-black ${
                clientMetrics.avgDeltaPercentOfChanged >= 0 ? "text-[#fe5600]" : "text-red-600"
              }`}
            >
              {clientMetrics.avgDeltaPercentOfChanged >= 0 ? "+" : ""}
              {formatPercent(clientMetrics.avgDeltaPercentOfChanged)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            {clientMetrics.changedCount > 0
              ? `Mittelwert über ${clientMetrics.changedCount} angepasste Artikel`
              : "Noch keine Anpassungen"}
          </span>
        </div>

        {/* Metric 5: Anpassungsstatus */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Bearbeitungsstatus
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-black text-slate-900">
              {clientMetrics.changedCount} / {clientMetrics.totalArticles}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {clientMetrics.changedCount === clientMetrics.totalArticles
              ? "Alle Preise neu erfasst"
              : `${clientMetrics.totalArticles - clientMetrics.changedCount} noch unverändert`}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Artikel oder Grösse suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-2 w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#fe5600] focus:border-[#fe5600]"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filterChangedOnly}
            onChange={(e) => setFilterChangedOnly(e.target.checked)}
            className="rounded text-[#fe5600] focus:ring-[#fe5600]"
          />
          <span>Nur geänderte Artikel anzeigen ({clientMetrics.changedCount})</span>
        </label>
      </div>

      {/* Individual Price Editing Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#191A1B] text-white text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-8"></th>
                <th
                  onClick={() => handleSort("productName")}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#fe5600] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Artikel / Basisprodukt</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Grössen &amp; Farben</th>
                <th
                  onClick={() => handleSort("baseBexioPrice")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-[#fe5600] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Katalogpreis (CHF)</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("baseDiscountedPrice")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-[#fe5600] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Bisher (CHF)</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("baseDiscountPercent")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-[#fe5600] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Abschlag %</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right bg-[#2A2B2D] text-[#fe5600] w-48">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Neuer Preis (CHF)</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Differenz CHF</th>
                <th
                  onClick={() => handleSort("deltaPercent")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-[#fe5600] transition-colors bg-[#2A2B2D]/80 text-white w-32"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Veränderung %</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#fe5600]" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                    Keine Artikel für diesen Kunden gefunden.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isExpanded = expandedRowId === prod.id;
                  const isCustom = prod.isChanged;

                  return (
                    <React.Fragment key={prod.id}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors ${
                          isCustom ? "bg-orange-50/20" : ""
                        }`}
                      >
                        {/* Expand variants toggle */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : prod.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                            title="Einzelvarianten anzeigen"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Product Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{prod.productName}</div>
                          <div className="text-xs text-slate-400">
                            {prod.variantCount} Varianten im Kundenstamm
                          </div>
                        </td>

                        {/* Sizes & Colors */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 mb-0.5">
                            {prod.sizes.slice(0, 5).map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                              >
                                {s}
                              </span>
                            ))}
                            {prod.sizes.length > 5 && (
                              <span className="text-[11px] text-slate-400 self-center">
                                +{prod.sizes.length - 5}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {prod.colours.join(", ")}
                          </span>
                        </td>

                        {/* Bexio List Price */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                          {formatCHF(prod.baseBexioPrice)}
                        </td>

                        {/* Old Client Price */}
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                          {formatCHF(prod.baseDiscountedPrice)}
                        </td>

                        {/* Abschlag % on Bexio Price (Separate Column) */}
                        <td className="py-3.5 px-4 text-right font-bold">
                          <span
                            className={
                              prod.baseDiscountPercent < 0
                                ? "text-red-600"
                                : prod.baseDiscountPercent === 0
                                ? "text-slate-400"
                                : prod.baseDiscountPercent > 50
                                ? "text-[#fe5600]"
                                : "text-emerald-700"
                            }
                          >
                            -{formatPercent(prod.baseDiscountPercent)}
                          </span>
                        </td>

                        {/* NEW PRICE INPUT FIELD (Immediate Editing) */}
                        <td className="py-3.5 px-4 text-right bg-orange-50/30">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs font-bold text-slate-500">CHF</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getDisplayValue(prod.id, prod.baseDiscountedPrice)}
                              onChange={(e) => handlePriceInputChange(prod.id, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handlePriceInputBlur(prod.id)}
                              placeholder={prod.baseDiscountedPrice.toFixed(2)}
                              className={`w-28 text-right font-bold text-sm px-2.5 py-1 rounded border transition-all ${
                                isCustom
                                  ? "border-[#fe5600] bg-white text-[#fe5600] shadow-xs"
                                  : "border-slate-300 bg-white text-slate-900 focus:border-[#fe5600]"
                              } focus:outline-none focus:ring-1 focus:ring-[#fe5600]`}
                            />
                          </div>
                        </td>

                        {/* Delta CHF */}
                        <td className="py-3.5 px-4 text-right font-semibold text-xs">
                          <span
                            className={
                              prod.deltaCHF > 0
                                ? "text-[#fe5600]"
                                : prod.deltaCHF < 0
                                ? "text-red-600"
                                : "text-slate-400"
                            }
                          >
                            {prod.deltaCHF > 0 ? "+" : ""}
                            {formatCHF(prod.deltaCHF)}
                          </span>
                        </td>

                        {/* PERCENTAGE CHANGE (RIGHT COLUMN!) */}
                        <td className="py-3.5 px-4 text-right font-black text-sm bg-slate-50/60">
                          <span
                            className={
                              prod.deltaPercent > 0
                                ? "text-[#fe5600]"
                                : prod.deltaPercent < 0
                                ? "text-red-600"
                                : "text-slate-400"
                            }
                          >
                            {prod.deltaPercent > 0 ? "+" : ""}
                            {formatPercent(prod.deltaPercent)}
                          </span>
                        </td>

                        {/* Status & Reset Action */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isCustom ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-[#fe5600]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Angepasst</span>
                                </span>
                                <button
                                  onClick={() => onUpdatePrice(prod.id, null)}
                                  className="text-slate-400 hover:text-red-600 p-0.5 transition-colors"
                                  title="Diesen Preis auf bisherigen Wert zurücksetzen"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400">Unverändert</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Variants Row for Granular Control */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={10} className="py-4 px-8">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#53565A]">
                                  Varianten &amp; Grössenaufschläge für {prod.productName}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Hier können Einzelvarianten (z. B. Übergrössen 3XL+) bei Bedarf separat bepreist werden.
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {prod.variantsWithPrices.map((v) => (
                                  <div
                                    key={v.productCode}
                                    className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800">{v.size}</span>
                                      <span className="text-slate-400 mx-1">•</span>
                                      <span className="text-slate-600">{v.colour}</span>
                                      <span className="block text-[10px] text-slate-400 font-mono">
                                        Bisher: {formatCHF(v.discountedPrice)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-slate-400">CHF</span>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getDisplayValue(v.productCode, v.discountedPrice)}
                                        onChange={(e) => handlePriceInputChange(v.productCode, e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        onBlur={() => handlePriceInputBlur(v.productCode)}
                                        placeholder={v.discountedPrice.toFixed(2)}
                                        className="w-20 text-right font-bold text-xs px-1.5 py-1 bg-white border border-slate-300 rounded focus:border-[#fe5600] focus:outline-none"
                                      />
                                      <span
                                        className={`text-[10px] font-bold w-12 text-right ${
                                          v.deltaPercent >= 0 ? "text-[#fe5600]" : "text-red-600"
                                        }`}
                                      >
                                        {v.deltaPercent >= 0 ? "+" : ""}
                                        {formatPercent(v.deltaPercent)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
