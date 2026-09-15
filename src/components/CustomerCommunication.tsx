"use client";

import React, { useState, useMemo } from "react";
import {
  Printer,
  Mail,
  Download,
  Copy,
  Check,
  Calendar,
  Building2,
  FileText,
  FileSpreadsheet,
  Layers,
  Sparkles,
  TrendingUp,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { AggregatedProduct } from "@/lib/types";
import { formatCHF, formatPercent } from "@/lib/utils";
import { exportPricingData } from "@/lib/export";
import { SearchableClientSelect } from "./SearchableClientSelect";

interface CustomerCommunicationProps {
  products: AggregatedProduct[];
  clients: string[];
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  manualPrices: Record<string, number>;
}

export const CustomerCommunication: React.FC<CustomerCommunicationProps> = ({
  products,
  clients,
  selectedClient,
  setSelectedClient,
  manualPrices
}) => {
  // Sub-tabs: "condition_sheet" | "email_generator" | "erp_export"
  const [activeSubTab, setActiveSubTab] = useState<"condition_sheet" | "email_generator" | "erp_export">(
    "condition_sheet"
  );

  // Document Settings
  const [effectiveDate, setEffectiveDate] = useState<string>("01.01.2027");
  const [contactPerson, setContactPerson] = useState<string>("Kundenbetreuung / Ernesto Vargas");
  const [clientContactName, setClientContactName] = useState<string>("Sehr geehrte Damen und Herren");
  const [customJustification, setCustomJustification] = useState<string>(
    "aufgrund der anhaltenden Entwicklungen bei Rohstoff-, Energie- und Transportkosten passen wir unsere Konditionen per oben genanntem Datum moderat an."
  );

  // Feedback states
  const [copiedRichText, setCopiedRichText] = useState(false);
  const [copiedPlainText, setCopiedPlainText] = useState(false);

  // STRICT CLIENT ISOLATION:
  // Only products historically assigned to this customer!
  const clientProducts = useMemo(() => {
    return products.filter((p) => p.client === selectedClient);
  }, [products, selectedClient]);

  // Generate aggregated size groups for condition sheet
  // Bundles standard sizes (XS-XXL) vs over-sizes (3XL+) with surcharges
  // Incorporates individual manual prices entered by user
  const conditionSheetItems = useMemo(() => {
    return clientProducts.map((p) => {
      const oldBase = p.baseDiscountedPrice;
      const hasBaseOverride = manualPrices[p.id] !== undefined;
      const newBase = hasBaseOverride ? manualPrices[p.id] : oldBase;

      const standardVariants = p.variants.filter((v) => !["3XL", "XXXL", "4XL", "5XL", "6XL"].includes(v.size.toUpperCase()));
      const overSizeVariants = p.variants.filter((v) => ["3XL", "XXXL", "4XL", "5XL", "6XL"].includes(v.size.toUpperCase()));

      const items: {
        productName: string;
        variantRange: string;
        colours: string;
        oldPrice: number;
        newPrice: number;
        deltaCHF: number;
        deltaPercent: number;
      }[] = [];

      // 1. Standard sizes row
      if (standardVariants.length > 0) {
        const stdSizes = Array.from(new Set(standardVariants.map((v) => v.size)));
        const oldStdPrice = standardVariants[0].discountedPrice;
        const newStdPrice = newBase;
        const delta = Number((newStdPrice - oldStdPrice).toFixed(2));
        const deltaPct = oldStdPrice > 0 ? Number((((newStdPrice - oldStdPrice) / oldStdPrice) * 100).toFixed(2)) : 0;

        items.push({
          productName: p.productName,
          variantRange: stdSizes.length > 3 ? `Standardgrössen (${stdSizes[0]}–${stdSizes[stdSizes.length - 1]})` : stdSizes.join(", "),
          colours: p.colours.join(", "),
          oldPrice: oldStdPrice,
          newPrice: newStdPrice,
          deltaCHF: delta,
          deltaPercent: deltaPct
        });
      } else {
        const delta = Number((newBase - oldBase).toFixed(2));
        const deltaPct = oldBase > 0 ? Number((((newBase - oldBase) / oldBase) * 100).toFixed(2)) : 0;
        items.push({
          productName: p.productName,
          variantRange: "Standard",
          colours: p.colours.join(", "),
          oldPrice: oldBase,
          newPrice: newBase,
          deltaCHF: delta,
          deltaPercent: deltaPct
        });
      }

      // 2. Oversize surcharges row if present
      if (overSizeVariants.length > 0) {
        const priceMap = new Map<string, { sizes: string[]; oldPrice: number; newPrice: number }>();

        overSizeVariants.forEach((v) => {
          const oldP = v.discountedPrice;
          let newP = oldP;
          if (manualPrices[v.productCode] !== undefined) {
            newP = manualPrices[v.productCode];
          } else if (hasBaseOverride && oldBase > 0) {
            newP = Number((oldP * (newBase / oldBase)).toFixed(2));
          }

          const key = `${oldP}_${newP}`;
          if (!priceMap.has(key)) {
            priceMap.set(key, { sizes: [], oldPrice: oldP, newPrice: newP });
          }
          if (!priceMap.get(key)!.sizes.includes(v.size)) {
            priceMap.get(key)!.sizes.push(v.size);
          }
        });

        priceMap.forEach((val) => {
          const delta = Number((val.newPrice - val.oldPrice).toFixed(2));
          const deltaPct = val.oldPrice > 0 ? Number((((val.newPrice - val.oldPrice) / val.oldPrice) * 100).toFixed(2)) : 0;
          items.push({
            productName: `${p.productName} (Übergrösse)`,
            variantRange: `Grössen ${val.sizes.join(", ")}`,
            colours: p.colours.join(", "),
            oldPrice: val.oldPrice,
            newPrice: val.newPrice,
            deltaCHF: delta,
            deltaPercent: deltaPct
          });
        });
      }

      return items;
    }).flat();
  }, [clientProducts, manualPrices]);

  // Actually adjusted items
  const adjustedItems = useMemo(() => {
    return conditionSheetItems.filter((i) => Math.abs(i.deltaCHF) > 0.001);
  }, [conditionSheetItems]);

  // CALCULATE AVERAGE PERCENTAGE CHANGE (Arithmetischer Mittelwert der angepassten Artikel)
  const averagePercentageChange = useMemo(() => {
    if (adjustedItems.length === 0) return 0;
    const sumPct = adjustedItems.reduce((acc, i) => acc + i.deltaPercent, 0);
    return Number((sumPct / adjustedItems.length).toFixed(1));
  }, [adjustedItems]);

  // Copy Rich-Text HTML Table to Clipboard (Ready for Outlook / Gmail)
  const handleCopyRichText = async () => {
    const avgFormatted = `${averagePercentageChange >= 0 ? "+" : ""}${formatPercent(averagePercentageChange)}`;

    const tableHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 720px; line-height: 1.5;">
        <p>${clientContactName},</p>
        <p>wir schätzen die partnerschaftliche Zusammenarbeit mit Ihrem Hause sehr. Wie besprochen ${customJustification}</p>
        <p>Die durchschnittliche Preisanpassung über die betroffenen Artikel Ihres Sortiments beträgt moderat <strong>${avgFormatted}</strong>.</p>
        <p>Nachfolgend finden Sie die Übersicht Ihrer individuell angepassten Konditionen, <strong>gültig ab ${effectiveDate}</strong>:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
          <thead>
            <tr style="background-color: #53565A; color: #ffffff; text-align: left;">
              <th style="padding: 10px; border: 1px solid #53565A;">Artikel / Produkt</th>
              <th style="padding: 10px; border: 1px solid #53565A;">Ausführung / Grössen</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #53565A;">Bisher (CHF)</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #53565A; background-color: #fe5600;">Neu ab ${effectiveDate} (CHF)</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #53565A;">Differenz (CHF)</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #53565A; background-color: #2A2B2D;">Veränderung %</th>
            </tr>
          </thead>
          <tbody>
            ${conditionSheetItems
              .map(
                (item, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">${item.productName}</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #475569;">${item.variantRange} (${item.colours})</td>
                <td style="padding: 8px 10px; text-align: right; border: 1px solid #e2e8f0;">${formatCHF(item.oldPrice)}</td>
                <td style="padding: 8px 10px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: #fe5600;">${formatCHF(item.newPrice)}</td>
                <td style="padding: 8px 10px; text-align: right; border: 1px solid #e2e8f0; font-weight: 600;">${item.deltaCHF >= 0 ? "+" : ""}${formatCHF(item.deltaCHF)}</td>
                <td style="padding: 8px 10px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: #fe5600;">${item.deltaPercent >= 0 ? "+" : ""}${formatPercent(item.deltaPercent)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div style="background-color: #fff4ed; border-left: 4px solid #fe5600; padding: 12px; margin: 15px 0; font-size: 13px;">
          <strong>Zusammenfassung:</strong> Durchschnittliche prozentuale Anpassung: <strong>${avgFormatted}</strong>. Alle Preise verstehen sich in Schweizer Franken (CHF) exkl. MWST.
        </div>

        <p>Bei Fragen oder für eine persönliche Besprechung steht Ihnen Ihr Kundenberater jederzeit gerne zur Verfügung.</p>
        <p style="margin-top: 20px;">
          Freundliche Grüsse<br/>
          <strong>Ernesto Vargas</strong><br/>
          Lochackerstrasse 4 • CH-8424 Embrach<br/>
          E-Mail: <a href="mailto:beratung@ernesto-vargas.com" style="color: #fe5600; text-decoration: none;">beratung@ernesto-vargas.com</a>
        </p>
      </div>
    `;

    const plainText = `Guten Tag ${clientContactName},\n\n` +
      `Gültig ab ${effectiveDate}:\n` +
      `Durchschnittliche Anpassung: ${avgFormatted}\n\n` +
      conditionSheetItems
        .map(
          (i) =>
            `${i.productName} [${i.variantRange}]: Bisher ${formatCHF(i.oldPrice)} -> Neu ${formatCHF(i.newPrice)} (${i.deltaPercent >= 0 ? "+" : ""}${formatPercent(i.deltaPercent)})`
        )
        .join("\n") +
      `\n\nFreundliche Grüsse\nErnesto Vargas\nLochackerstrasse 4, CH-8424 Embrach\nberatung@ernesto-vargas.com`;

    try {
      const blobHtml = new Blob([tableHtml], { type: "text/html" });
      const blobText = new Blob([plainText], { type: "text/plain" });
      const clipboardItem = new ClipboardItem({
        "text/html": blobHtml,
        "text/plain": blobText
      });
      await navigator.clipboard.write([clipboardItem]);
      setCopiedRichText(true);
      setTimeout(() => setCopiedRichText(false), 2500);
    } catch {
      navigator.clipboard.writeText(plainText);
      setCopiedPlainText(true);
      setTimeout(() => setCopiedPlainText(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Customer Selection & Document View Navigation (Hidden on Print) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#fe5600] flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>Kundenindividuelle Dokumentenerstellung</span>
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Kommunikation &amp; Konditionsblätter
            </h2>
            <p className="text-xs text-slate-500">
              Strikt isoliert: Es werden ausschliesslich die {clientProducts.length} Artikel von &quot;{selectedClient}&quot; ausgegeben.
            </p>
          </div>

          {/* Searchable Customer Select */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <SearchableClientSelect
              clients={clients}
              selectedClient={selectedClient}
              onSelectClient={setSelectedClient}
            />
          </div>
        </div>

        {/* Sub-Navigation Buttons */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveSubTab("condition_sheet")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === "condition_sheet"
                ? "bg-[#53565A] text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Printer className="w-4 h-4 text-[#fe5600]" />
            <span>1. Kunden-Konditionsblatt (Druck / PDF)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("email_generator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === "email_generator"
                ? "bg-[#53565A] text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Mail className="w-4 h-4 text-[#fe5600]" />
            <span>2. E-Mail-Textbaustein &amp; HTML-Tabelle</span>
          </button>

          <button
            onClick={() => setActiveSubTab("erp_export")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === "erp_export"
                ? "bg-[#53565A] text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Download className="w-4 h-4 text-[#fe5600]" />
            <span>3. B2B-Shop Upload (Ernesto Vargas)</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: PRINTABLE CONDITION SHEET */}
      {activeSubTab === "condition_sheet" && (
        <div className="space-y-4">
          {/* Action Bar (strictly hidden during print) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-700">Gültig ab:</span>
                <input
                  type="text"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="border border-slate-300 rounded px-2.5 py-1 text-xs font-bold w-32 text-center"
                />
              </div>

              <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 text-[#fe5600] px-3 py-1 rounded-md text-xs font-bold border border-orange-200">
                <Percent className="w-3.5 h-3.5" />
                <span>
                  Ø-Preisanpassung: {averagePercentageChange >= 0 ? "+" : ""}
                  {formatPercent(averagePercentageChange)}
                </span>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#fe5600] hover:bg-[#e04c00] text-white text-xs font-bold transition-all shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Drucken / Als PDF speichern</span>
            </button>
          </div>

          {/* STRICT PRINTABLE CONTAINER: Only this element is printed! */}
          <div
            id="printable-condition-sheet"
            className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 sm:p-12 max-w-4xl mx-auto text-slate-900"
          >
            {/* Header with Updated Ernesto Vargas Embrach Address */}
            <div className="flex items-start justify-between border-b-2 border-[#fe5600] pb-6 mb-8">
              <div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded bg-[#fe5600] flex items-center justify-center font-black text-xl text-white">
                    EV
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-[#191A1B] uppercase">
                      Ernesto Vargas
                    </h1>
                    <p className="text-[11px] font-bold text-[#53565A]">
                      Corporate Fashion &amp; Workwear Schweiz
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 mt-2 font-medium">
                  Ernesto Vargas • Lochackerstrasse 4 • CH-8424 Embrach • beratung@ernesto-vargas.com
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded bg-[#53565A] text-white text-xs font-bold uppercase tracking-wider mb-2">
                  Kunden-Konditionsblatt
                </span>
                <p className="text-xs text-slate-500">
                  Ausstellungsdatum: {new Date().toLocaleDateString("de-CH")}
                </p>
                <p className="text-xs font-black text-[#fe5600] mt-0.5">
                  Gültig ab: {effectiveDate}
                </p>
              </div>
            </div>

            {/* Recipient & Average % Change Banner */}
            <div className="grid grid-cols-2 gap-6 mb-8 text-sm items-start">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Empfänger / Vertragspartner
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedClient}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vereinbarte Sonderkonditionen für Berufsbekleidung &amp; Textilien
                </p>
              </div>

              {/* Prominent Average Change Box with Clear Definition */}
              <div className="bg-orange-50/70 border border-orange-200 p-3.5 rounded-lg text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">
                    Durchschnittliche Preisanpassung:
                  </span>
                  <span className="text-base font-black text-[#fe5600]">
                    {averagePercentageChange >= 0 ? "+" : ""}
                    {formatPercent(averagePercentageChange)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  {adjustedItems.length > 0
                    ? `Arithmetischer Mittelwert über ${adjustedItems.length} angepasste Artikelpositionen.`
                    : "Noch keine Preisanpassungen für diesen Kunden erfasst."}
                  {" "}Preise in CHF exkl. MWST. Übergrössen ab 3XL sind transparent ausgewiesen.
                </p>
              </div>
            </div>

            {/* Products Table with Rightmost % Change */}
            <div className="mb-8">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#53565A] text-white font-bold">
                    <th className="py-2.5 px-3 border-r border-gray-600">Produktbezeichnung</th>
                    <th className="py-2.5 px-3 border-r border-gray-600">Ausführung &amp; Grössen</th>
                    <th className="py-2.5 px-3 text-right border-r border-gray-600">Bisher (CHF)</th>
                    <th className="py-2.5 px-3 text-right bg-[#fe5600] text-white border-r border-[#e04c00]">
                      Neu ab {effectiveDate} (CHF)
                    </th>
                    <th className="py-2.5 px-3 text-right border-r border-gray-600">Differenz (CHF)</th>
                    <th className="py-2.5 px-3 text-right bg-[#2A2B2D] text-white">Veränderung %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border border-slate-200">
                  {conditionSheetItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Keine Artikel für diesen Kunden hinterlegt.
                      </td>
                    </tr>
                  ) : (
                    conditionSheetItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100">
                          <span className="font-semibold">{item.variantRange}</span>
                          <span className="block text-[10px] text-slate-400">Farben: {item.colours}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-500 border-r border-slate-100">
                          {formatCHF(item.oldPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-orange-50/40 border-r border-slate-100">
                          {formatCHF(item.newPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-700 border-r border-slate-100">
                          {item.deltaCHF >= 0 ? "+" : ""}
                          {formatCHF(item.deltaCHF)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-slate-50/80">
                          {item.deltaPercent >= 0 ? "+" : ""}
                          {formatPercent(item.deltaPercent)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Footer with Embrach details */}
            <div className="border-t border-slate-200 pt-6 mt-8 text-xs text-slate-500 flex justify-between items-end">
              <div>
                <p className="font-bold text-slate-800">Ernesto Vargas</p>
                <p>Lochackerstrasse 4 • CH-8424 Embrach • beratung@ernesto-vargas.com</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Dieses Konditionsblatt wurde elektronisch erstellt und ist ohne Unterschrift verbindlich.
                </p>
              </div>

              <div className="text-right text-[11px] text-slate-400">
                Dokument-Referenz: EV-KP-{selectedClient.replace(/[^a-zA-Z0-9]/g, "").substring(0, 8)}-{effectiveDate.replace(/[^0-9]/g, "")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: EMAIL GENERATOR */}
      {activeSubTab === "email_generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls / Parameters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#fe5600]" />
              <span>E-Mail Parameter</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Anrede Kunde:</label>
              <input
                type="text"
                value={clientContactName}
                onChange={(e) => setClientContactName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded p-2"
                placeholder="Sehr geehrte Damen und Herren"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gültigkeitsdatum:</label>
              <input
                type="text"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded p-2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Begründungstext:</label>
              <textarea
                rows={3}
                value={customJustification}
                onChange={(e) => setCustomJustification(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded p-2"
              />
            </div>

            {/* Average % Change Callout */}
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg text-xs">
              <span className="font-bold text-[#fe5600] block mb-0.5">
                Ø-Veränderung (angepasste Artikel):
              </span>
              <span className="text-lg font-black text-slate-900">
                {averagePercentageChange >= 0 ? "+" : ""}
                {formatPercent(averagePercentageChange)}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Arithmetischer Mittelwert der angepassten Artikel für diesen Kunden.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleCopyRichText}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#fe5600] hover:bg-[#e04c00] text-white text-xs font-bold transition-all shadow-sm"
              >
                {copiedRichText ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>In Zwischenablage kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>E-Mail &amp; Tabelle kopieren (Outlook/Gmail)</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-1.5">
                Kopiert formatiertes Rich-Text-HTML zur direkten Verwendung in Ihrem Mailprogramm.
              </p>
            </div>
          </div>

          {/* Email Preview */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Vorschau E-Mail Anschreiben
              </span>
              <span className="text-xs text-slate-500">
                Betreff: <strong>Preisanpassung &amp; neue Konditionsübersicht per {effectiveDate} – Ernesto Vargas</strong>
              </span>
            </div>

            <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
              <p>{clientContactName},</p>
              <p>
                wir schätzen die partnerschaftliche Zusammenarbeit mit {selectedClient} sehr.
                Wie besprochen {customJustification}
              </p>
              <p>
                Die durchschnittliche Preisanpassung über die betroffenen Artikel Ihres Sortiments beträgt moderat{" "}
                <strong>
                  {averagePercentageChange >= 0 ? "+" : ""}
                  {formatPercent(averagePercentageChange)}
                </strong>
                .
              </p>
              <p>
                Nachfolgend finden Sie die Übersicht Ihrer kundenindividuellen Konditionen,{" "}
                <strong>gültig ab {effectiveDate}</strong>:
              </p>

              {/* Rendered HTML Table Preview */}
              <div className="overflow-x-auto my-4 border rounded-lg border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#53565A] text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Artikel / Produkt</th>
                      <th className="py-2.5 px-3">Ausführung / Grössen</th>
                      <th className="py-2.5 px-3 text-right">Bisher (CHF)</th>
                      <th className="py-2.5 px-3 text-right bg-[#fe5600] text-white">
                        Neu ab {effectiveDate} (CHF)
                      </th>
                      <th className="py-2.5 px-3 text-right">Differenz (CHF)</th>
                      <th className="py-2.5 px-3 text-right bg-[#2A2B2D]">Veränderung %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {conditionSheetItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="py-2 px-3 font-bold text-slate-900">{item.productName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.variantRange}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{formatCHF(item.oldPrice)}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#fe5600] bg-orange-50/40">
                          {formatCHF(item.newPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-700">
                          {item.deltaCHF >= 0 ? "+" : ""}
                          {formatCHF(item.deltaCHF)}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-slate-900 bg-slate-50">
                          {item.deltaPercent >= 0 ? "+" : ""}
                          {formatPercent(item.deltaPercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p>
                Alle Preise verstehen sich in Schweizer Franken (CHF) exkl. MWST. Für Rückfragen steht Ihnen unser Team in Embrach jederzeit gerne zur Verfügung.
              </p>
              <p className="pt-2 text-xs text-slate-600">
                Freundliche Grüsse<br />
                <strong className="text-slate-900">Ernesto Vargas</strong><br />
                Lochackerstrasse 4 • CH-8424 Embrach<br />
                E-Mail: <span className="text-[#fe5600] font-semibold">beratung@ernesto-vargas.com</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: B2B-SHOP UPLOAD */}
      {activeSubTab === "erp_export" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#fe5600]" />
                <h3 className="font-bold text-slate-900 text-lg">
                  Ernesto Vargas B2B-Shop Upload
                </h3>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-[#fe5600] px-2.5 py-0.5 rounded-full border border-orange-200">
                  Import Client Prices
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Generieren Sie die Re-Import-Datei für den Ernesto Vargas B2B-Shop mit allen Varianten und neuen Kundenpreisen.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700 font-semibold self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-[#fe5600]" />
              <span>Gültig ab: <strong>{effectiveDate}</strong></span>
            </div>
          </div>

          {/* Workflow Guide: 4 Steps */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#53565A] mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#fe5600]" />
              <span>Standard-Ablauf für Preisanpassungen im B2B-Shop</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-2xs relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Shop-Admin</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs mb-1">Export im Shop</h5>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Im Shop-Admin unter <em>«Export Company Products with Discounts»</em> die aktuellen Preise exportieren.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-2xs relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">B2B Suite</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs mb-1">Preise kalkulieren</h5>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Datei hier importieren und Preise anpassen (Pauschal-Aufschlag % oder individuelle Einzelpreise).
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-2xs relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#fe5600] font-bold text-xs flex items-center justify-center">
                      3
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-[#fe5600]">Exportieren</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs mb-1">Excel herunterladen</h5>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Unten die Excel-Datei für <strong>«{selectedClient}»</strong> oder <strong>alle Kunden</strong> herunterladen.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-2xs relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                      4
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-emerald-600">Live-Schaltung</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs mb-1">Import Client Prices</h5>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Im Shop-Admin hochladen, Vorschau prüfen &amp; bestätigen. Die neuen Preise sind sofort aktiv.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice & Technical Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <span className="font-bold block text-sm text-amber-950">
                  Wichtiger Hinweis zum Aktivierungszeitpunkt
                </span>
                <p className="leading-relaxed">
                  Neue Preise sind <strong>unmittelbar nach dem Upload</strong> im Ernesto Vargas B2B-Shop aktiv. Wenn neue Preise ab einem bestimmten Stichtag (z. B. <strong>01.01.2027</strong>) gelten sollen, laden Sie die fertige Excel-Datei erst an diesem Tag im Shop-Admin hoch.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 space-y-1">
                <span className="font-bold block text-sm text-slate-900">
                  Geprüftes Shop-Spaltenlayout
                </span>
                <p className="leading-relaxed">
                  Die Export-Datei enthält die vollständige Preisliste mit allen Positionen. Die Spalte <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold text-slate-900">Kundenpreis CHF</code> steuert die neuen Preise (exkl. MWST). <code className="bg-white px-1 py-0.5 rounded text-slate-700">Kunde</code>, <code className="bg-white px-1 py-0.5 rounded text-slate-700">Artikelnummer</code> und IDs sichern die exakte Zuordnung.
                </p>
              </div>
            </div>
          </div>

          {/* Export Action Card */}
          <div className="bg-gradient-to-br from-slate-900 via-[#1e2022] to-[#53565A] text-white rounded-xl p-6 shadow-md border border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                  Excel-Datei generieren
                </span>
                <h4 className="text-lg font-bold text-white mt-0.5">
                  Preise für Ernesto Vargas B2B-Shop bereitstellen
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Format: .xlsx (Excel Arbeitsmappe) mit allen Varianten und kalkulierten Kundenpreisen
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold self-start md:self-auto border border-white/10">
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                <span>Aktueller Filter: <strong className="text-white">{selectedClient}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={() =>
                  exportPricingData(products, {
                    clientName: selectedClient,
                    targetSystem: "b2b_shop",
                    format: "xlsx",
                    effectiveDate,
                    manualPrices
                  })
                }
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#fe5600] hover:bg-[#e04c00] text-white text-xs sm:text-sm font-bold shadow-lg transition-all transform active:scale-98 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Nur &quot;{selectedClient}&quot; für B2B-Shop exportieren (.xlsx)</span>
              </button>

              <button
                onClick={() =>
                  exportPricingData(products, {
                    targetSystem: "b2b_shop",
                    format: "xlsx",
                    effectiveDate,
                    manualPrices
                  })
                }
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 shadow-sm transition-all transform active:scale-98 cursor-pointer"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>Alle Kunden für B2B-Shop exportieren (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
