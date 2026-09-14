"use client";

import { useEffect, useState } from "react";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const secret = process.env.NEXT_PUBLIC_APP_SECRET;
  const dashboardUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://ev-dashboard.vercel.app";

  useEffect(() => {
    // In local development, bypass authentication
    if (process.env.NODE_ENV === "development") {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // If no secret is configured yet on Vercel, allow access so user is not locked out
    if (!secret) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("ev_token");

    if (urlToken) {
      if (urlToken === secret) {
        sessionStorage.setItem("ev_auth_token", urlToken);
        // Remove token parameter from URL for security and clean display
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      } else {
        // Invalid token passed -> redirect to central dashboard
        window.location.href = dashboardUrl;
        return;
      }
    }

    // Check existing session token
    const storedToken = sessionStorage.getItem("ev_auth_token");
    if (storedToken && storedToken === secret) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    setIsLoading(false);
  }, [secret, dashboardUrl]);

  const loginWithPassword = (inputPassword: string): boolean => {
    if (!secret || inputPassword === secret) {
      sessionStorage.setItem("ev_auth_token", inputPassword);
      setIsAuthenticated(true);
      setAuthError(null);
      return true;
    } else {
      setAuthError("Ungültiges Passwort. Bitte erneut versuchen.");
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem("ev_auth_token");
    setIsAuthenticated(false);
    window.location.href = dashboardUrl;
  };

  return {
    isAuthenticated,
    isLoading,
    authError,
    loginWithPassword,
    logout,
    dashboardUrl
  };
}
