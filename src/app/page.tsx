"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "@/components/Header";
import { DataImport } from "@/components/DataImport";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { CustomerCommunication } from "@/components/CustomerCommunication";
import { ProductClientFinder } from "@/components/ProductClientFinder";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { RawPricingRow } from "@/lib/types";
import { aggregateRawPricing, calculateClientKpis } from "@/lib/aggregator";
import { generateSampleData } from "@/lib/mock-data";
import {
  saveRawRows,
  loadRawRows,
  saveManualOverrides,
  loadManualOverrides,
  clearAllStoredData
} from "@/lib/db";
import { ShieldCheck } from "lucide-react";

export default function Home() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    authError,
    loginWithPassword,
    dashboardUrl
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"pricing" | "finder" | "communication">("pricing");
  const [isInitializing, setIsInitializing] = useState(true);

  // Data State
  const [rawRows, setRawRows] = useState<RawPricingRow[]>([]);
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});
  const [selectedClient, setSelectedClient] = useState<string>("");

  // Load from IndexedDB on startup or generate initial sample
  useEffect(() => {
    async function init() {
      try {
        const storedRows = await loadRawRows();
        const storedOverrides = await loadManualOverrides();

        if (storedOverrides) {
          setManualPrices(storedOverrides);
        }

        if (storedRows && storedRows.length > 0) {
          setRawRows(storedRows);
          setSelectedClient(storedRows[0].client);
        } else {
          // Initialize with standard Ernesto Vargas workwear dataset (1'200 rows)
          const initialSample = generateSampleData(1200);
          setRawRows(initialSample);
          setSelectedClient(initialSample[0].client);
          await saveRawRows(initialSample, "Ernesto_Vargas_Standard_Portfolio.xlsx");
        }
      } catch (err) {
        console.error("Initial load error:", err);
        const fallback = generateSampleData(1200);
        setRawRows(fallback);
        setSelectedClient(fallback[0].client);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  // Handler for uploading new Excel file or loading sample
  const handleDataLoaded = useCallback(async (rows: RawPricingRow[], filename?: string) => {
    setRawRows(rows);
    if (rows.length > 0) {
      setSelectedClient(rows[0].client);
    }
    await saveRawRows(rows, filename);
  }, []);

  // Reset/Clear Data
  const handleResetData = useCallback(async () => {
    if (confirm("Möchten Sie den aktuellen Datensatz wirklich auf das Standard-Portfolio zurücksetzen?")) {
      await clearAllStoredData();
      const freshSample = generateSampleData(1200);
      setRawRows(freshSample);
      setManualPrices({});
      setSelectedClient(freshSample[0].client);
      await saveRawRows(freshSample, "Ernesto_Vargas_Standard_Portfolio.xlsx");
    }
  }, []);

  // Update an individual product/variant price
  const handleUpdatePrice = useCallback(
    async (id: string, price: number | null) => {
      setManualPrices((prev) => {
        const updated = { ...prev };
        if (price === null) {
          delete updated[id];
        } else {
          updated[id] = price;
        }
        saveManualOverrides(updated);
        return updated;
      });
    },
    []
  );

  // Batch apply a percentage adjustment to all products of a client
  const handleApplyBatchPercentToClient = useCallback(
    async (client: string, percent: number) => {
      setManualPrices((prev) => {
        const updated = { ...prev };
        const multiplier = 1 + percent / 100;

        // Find all products of this client
        const clientProducts = aggregateRawPricing(rawRows).filter((p) => p.client === client);
        clientProducts.forEach((p) => {
          const newBase = Number((p.baseDiscountedPrice * multiplier).toFixed(2));
          updated[p.id] = newBase;
        });

        saveManualOverrides(updated);
        return updated;
      });
    },
    [rawRows]
  );

  // Reset all custom prices for a specific client
  const handleResetClientPrices = useCallback(
    async (client: string) => {
      setManualPrices((prev) => {
        const updated = { ...prev };
        const clientProducts = aggregateRawPricing(rawRows).filter((p) => p.client === client);
        clientProducts.forEach((p) => {
          delete updated[p.id];
          p.variants.forEach((v) => {
            delete updated[v.productCode];
          });
        });
        saveManualOverrides(updated);
        return updated;
      });
    },
    [rawRows]
  );

  // Jump handler from Finder to Pricing or Communication tab for a specific client
  const handleOpenClientFromFinder = useCallback(
    (clientName: string, tab: "pricing" | "communication") => {
      setSelectedClient(clientName);
      setActiveTab(tab);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    []
  );

  // Core Aggregations
  const aggregatedProducts = useMemo(() => {
    return aggregateRawPricing(rawRows);
  }, [rawRows]);

  const clientKpis = useMemo(() => {
    return calculateClientKpis(aggregatedProducts);
  }, [aggregatedProducts]);

  const clientsList = useMemo(() => {
    return Array.from(clientKpis.keys()).sort((a, b) => a.localeCompare(b));
  }, [clientKpis]);

  // Keep selectedClient valid
  useEffect(() => {
    if (clientsList.length > 0 && !clientsList.includes(selectedClient)) {
      setSelectedClient(clientsList[0]);
    }
  }, [clientsList, selectedClient]);

  const uniqueProductCount = useMemo(() => {
    const set = new Set(aggregatedProducts.map((p) => p.productName));
    return set.size;
  }, [aggregatedProducts]);

  if (isAuthLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-slate-700 border-t-[#fe5600] animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold">Ernesto Vargas B2B Pricing Suite</h2>
          <p className="text-xs text-gray-400 mt-1">
            Kundenpreise werden geladen...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGate
        onLogin={loginWithPassword}
        error={authError}
        dashboardUrl={dashboardUrl}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalRows={rawRows.length}
        totalProducts={uniqueProductCount}
        totalClients={clientsList.length}
        onResetData={handleResetData}
        dashboardUrl={dashboardUrl}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Excel Import & Dataset Control Bar (Always hidden in print mode) */}
        <div className="no-print">
          <DataImport
            onDataLoaded={handleDataLoaded}
            totalRows={rawRows.length}
            totalClients={clientsList.length}
            totalProducts={uniqueProductCount}
          />
        </div>

        {/* Dynamic Views */}
        {activeTab === "pricing" && (
          <AnalysisDashboard
            products={aggregatedProducts}
            clientKpis={clientKpis}
            clients={clientsList}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            manualPrices={manualPrices}
            onUpdatePrice={handleUpdatePrice}
            onApplyBatchPercentToClient={handleApplyBatchPercentToClient}
            onResetClientPrices={handleResetClientPrices}
          />
        )}

        {activeTab === "finder" && (
          <ProductClientFinder
            rawRows={rawRows}
            manualPrices={manualPrices}
            onOpenClient={handleOpenClientFromFinder}
          />
        )}

        {activeTab === "communication" && (
          <CustomerCommunication
            products={aggregatedProducts}
            clients={clientsList}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            manualPrices={manualPrices}
          />
        )}
      </main>

      {/* B2B Footer with Updated Embrach Address (Hidden in print) */}
      <footer className="bg-[#191A1B] text-gray-400 text-xs py-6 border-t border-[#2A2B2D] mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white uppercase tracking-wider">
              Ernesto Vargas
            </span>
            <span>• Corporate Fashion &amp; Workwear Schweiz</span>
          </div>
          <div className="flex items-center space-x-4 text-gray-500">
            <span>Standort: Lochackerstrasse 4, CH-8424 Embrach</span>
            <span>•</span>
            <span>beratung@ernesto-vargas.com</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-500">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Lokale Datenverarbeitung</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
