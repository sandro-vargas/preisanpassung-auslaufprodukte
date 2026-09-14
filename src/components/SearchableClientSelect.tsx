"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, Building2, X } from "lucide-react";

interface SearchableClientSelectProps {
  clients: string[];
  selectedClient: string;
  onSelectClient: (client: string) => void;
  clientProductCounts?: Map<string, number>;
  placeholder?: string;
}

export const SearchableClientSelect: React.FC<SearchableClientSelectProps> = ({
  clients,
  selectedClient,
  onSelectClient,
  clientProductCounts,
  placeholder = "Kunde suchen oder auswählen..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter clients by search query
  const filteredClients = clients.filter((c) =>
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (client: string) => {
    onSelectClient(client);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-[280px] sm:min-w-[340px]">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="w-full bg-slate-50 hover:bg-white border border-slate-300 text-slate-900 text-sm font-bold rounded-lg p-2.5 flex items-center justify-between shadow-xs transition-colors focus:ring-2 focus:ring-[#fe5600] focus:border-[#fe5600] text-left"
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <Building2 className="w-4 h-4 text-[#fe5600] shrink-0" />
          <span className="truncate">{selectedClient || placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu with Search */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kundenname eingeben..."
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none py-1"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Client List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {filteredClients.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Kein Kunde für &quot;{searchTerm}&quot; gefunden.
              </div>
            ) : (
              filteredClients.map((client, idx) => {
                const isSelected = client === selectedClient;
                const count = clientProductCounts ? clientProductCounts.get(client) : undefined;

                return (
                  <button
                    key={client}
                    type="button"
                    onClick={() => handleSelect(client)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-orange-50/80 text-[#fe5600] font-bold"
                        : "text-slate-700 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-[11px] text-slate-400 w-5 font-mono">{idx + 1}.</span>
                      <span className="truncate">{client}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {count !== undefined && (
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                          {count} Art.
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-[#fe5600]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
