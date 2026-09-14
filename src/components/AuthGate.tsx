"use client";

import React, { useState } from "react";
import { Lock, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";

interface AuthGateProps {
  onLogin: (password: string) => boolean;
  error: string | null;
  dashboardUrl: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onLogin,
  error,
  dashboardUrl
}) => {
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setLocalError("Bitte geben Sie das Zugriffspasswort ein.");
      return;
    }

    setLocalError(null);
    const success = onLogin(password.trim());
    if (!success) {
      setPassword("");
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      {/* Top Accent Line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#fe5600] via-[#ff7728] to-[#53565A]" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/30">
        {/* Header */}
        <div className="p-8 text-center bg-gradient-to-b from-slate-900 to-[#191A1B] text-white relative">
          <div className="mx-auto w-16 h-16 bg-[#fe5600] text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20 border border-white/10">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#fe5600]" />
            <span>Ernesto Vargas Workspace</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase">
            B2B Pricing Suite
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Geschützter interner Bereich • Embrach ZH
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Zugangspasswort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#fe5600] focus:ring-2 focus:ring-[#fe5600]/20 transition-all outline-none text-sm text-gray-900"
                placeholder="Passwort eingeben"
                autoFocus
              />
            </div>

            {displayError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#fe5600] hover:bg-[#e04c00] text-white rounded-xl font-semibold transition-colors duration-200 shadow-sm text-sm"
            >
              Applikation freischalten
            </button>
          </form>

          {/* Central Dashboard Redirect */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <a
              href={dashboardUrl}
              className="inline-flex items-center space-x-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zurück zum zentralen EV Dashboard</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
