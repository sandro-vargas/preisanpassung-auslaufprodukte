"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import { parseExcelFile } from "@/lib/excel-parser";
import { RawPricingRow } from "@/lib/types";

interface DataImportProps {
  onDataLoaded: (rows: RawPricingRow[], filename?: string) => void;
  totalRows: number;
  totalClients: number;
  totalProducts: number;
}

export const DataImport: React.FC<DataImportProps> = ({
  onDataLoaded,
  totalRows,
  totalClients,
  totalProducts
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setErrorMessage("Bitte laden Sie eine gültige Excel-Datei (.xlsx oder .xls) hoch.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setProgress(5);
    setStatusText("Datei wird vorbereitet...");

    try {
      const rows = await parseExcelFile(file, (pct, msg) => {
        setProgress(pct);
        setStatusText(msg);
      });
      onDataLoaded(rows, file.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Einlesen der Excel-Datei.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 transition-all no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#fe5600]" />
            <span>Excel-Datenbasis &amp; Import</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Laden Sie den Export <strong className="text-slate-800 font-semibold">«Export Company Products with Discounts»</strong> aus dem B2B-Shop hoch (.xlsx oder .xls mit über 55&apos;000 Zeilen möglich).
          </p>
        </div>

        {totalRows > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              {totalRows.toLocaleString("de-CH")} Zeilen aktiv ({totalClients} Kunden, {totalProducts} Produkte)
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <div className="w-16 h-16 mx-auto mb-4 relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-[#fe5600] animate-spin" />
            <Database className="w-6 h-6 text-[#53565A] absolute" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">{statusText}</h3>
          <p className="text-xs text-slate-500 mb-4">
            Die Daten werden clientseitig im Hochgeschwindigkeitsspeicher aggregiert.
          </p>
          <div className="w-full max-w-md mx-auto bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-[#fe5600] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-600 mt-2 inline-block">{progress}%</span>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
            isDragging
              ? "border-[#fe5600] bg-orange-50/50"
              : "border-slate-300 hover:border-[#fe5600] hover:bg-slate-50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileProcess(e.target.files[0]);
              }
            }}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-[#fe5600] mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#fe5600] text-xs font-semibold mb-2">
            <span>B2B-Shop Datei:</span>
            <span className="text-slate-800 font-bold">«Export Company Products with Discounts»</span>
          </div>
          <p className="font-semibold text-slate-800 text-sm mb-1">
            Excel-Datei hierher ziehen oder durchsuchen
          </p>
          <p className="text-xs text-slate-500 max-w-xl">
            Unterstützt .xlsx und .xls mit Spalten wie <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">Client</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">Product Name</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">Size</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">Bexio Price</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">Discounted Price</code>.
          </p>
        </div>
      )}
    </div>
  );
};
