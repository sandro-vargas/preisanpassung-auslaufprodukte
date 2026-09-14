"use client";

import React from "react";
import { Edit3, Mail, RefreshCw, Search } from "lucide-react";

interface HeaderProps {
  activeTab: "pricing" | "finder" | "communication";
  setActiveTab: (tab: "pricing" | "finder" | "communication") => void;
  totalRows: number;
  totalProducts: number;
  totalClients: number;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalRows,
  totalClients,
  onResetData
}) => {
  return (
    <header className="bg-[#191A1B] text-white border-b border-[#2A2B2D] sticky top-0 z-40 shadow-md no-print">
      {/* Brand Accent Top Line */}
      <div className="h-1 bg-gradient-to-r from-[#fe5600] via-[#ff7728] to-[#53565A] w-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3 sm:gap-6">
          {/* Brand Logo & Title (Left, shrink-0 with nowrap) */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fe5600] to-[#d44800] flex items-center justify-center font-black text-lg tracking-wider text-white shadow-sm border border-white/10 shrink-0">
              EV
            </div>
            <div className="whitespace-nowrap">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white uppercase">
                  Ernesto Vargas
                </span>
                <span className="text-[10px] uppercase tracking-wider bg-[#53565A]/80 text-gray-200 px-1.5 py-0.5 rounded font-semibold border border-white/10">
                  B2B Suite
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Preisanpassungen &amp; Kundenanalyse • Embrach
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Preisanpassungs-Workflow Gruppe */}
            <div className="flex items-center bg-[#101112] p-1 rounded-xl border border-white/10 shadow-inner">
              <button
                onClick={() => setActiveTab("pricing")}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "pricing"
                    ? "bg-[#fe5600] text-white shadow-sm"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Kundenpreise</span>
              </button>

              <button
                onClick={() => setActiveTab("communication")}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "communication"
                    ? "bg-[#fe5600] text-white shadow-sm"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Kundenkommunikation</span>
              </button>
            </div>

            {/* Optischer Trenner zwischen Workflow und Sortimentssuche */}
            <div className="h-6 w-px bg-gray-700/80 mx-1" />

            {/* Separater Bereich: Artikelsuche & Sortiment */}
            <div className="flex items-center bg-[#101112] p-1 rounded-xl border border-white/10 shadow-inner">
              <button
                onClick={() => setActiveTab("finder")}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "finder"
                    ? "bg-[#fe5600] text-white shadow-sm"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
                title="Sortimentsabfrage nach Artikelnummer und Farbe"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Artikelsuche</span>
              </button>
            </div>
          </nav>

          {/* Data Status & Actions (Right, compact and sleek) */}
          <div className="hidden md:flex items-center space-x-3 shrink-0">
            {totalRows > 0 ? (
              <div className="flex items-center space-x-2.5 text-xs bg-[#242628] px-3 py-1.5 rounded-lg border border-gray-700/80 whitespace-nowrap">
                <div className="flex items-center space-x-1.5 text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    <strong className="text-white">{totalClients}</strong> Kunden
                  </span>
                </div>
                <span className="text-gray-600">•</span>
                <span className="text-gray-300">
                  <strong className="text-white">{totalRows.toLocaleString("de-CH")}</strong> Zeilen
                </span>
                <button
                  onClick={onResetData}
                  title="Datensatz auf Standard zurücksetzen"
                  className="ml-1 p-1 text-gray-400 hover:text-[#fe5600] hover:bg-white/5 rounded transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
