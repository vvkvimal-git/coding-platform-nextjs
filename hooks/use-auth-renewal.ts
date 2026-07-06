import { useEffect } from "react";
import { apiFetch } from "@/lib/api-client";

function decodeJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function useAuthRenewal() {
  useEffect(() => {
    let isRefreshing = false;

    const checkAndRefresh = async () => {
      if (typeof window === "undefined") return;

      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!accessToken || !refreshToken) return;

      const decoded = decodeJwt(accessToken);
      if (!decoded || !decoded.exp) return;

      const expiresAtMs = decoded.exp * 1000;
      const timeRemainingMs = expiresAtMs - Date.now();

      // Trigger refresh if token is within 5 minutes of expiring (5 * 60 * 1000 ms)
      const FIVE_MINUTES_MS = 5 * 60 * 1000;
      if (timeRemainingMs < FIVE_MINUTES_MS && !isRefreshing) {
        isRefreshing = true;
        try {
          // Double check if another tab has already refreshed the token
          const currentAccessToken = localStorage.getItem("accessToken");
          if (currentAccessToken && currentAccessToken !== accessToken) {
            const currentDecoded = decodeJwt(currentAccessToken);
            if (
              currentDecoded &&
              currentDecoded.exp &&
              currentDecoded.exp * 1000 - Date.now() >= FIVE_MINUTES_MS
            ) {
              isRefreshing = false;
              return;
            }
          }

          console.log("[Auth Renewal] Proactive silent refresh triggering...");
          const response = await apiFetch("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
          });

          if (response.accessToken) {
            localStorage.setItem("accessToken", response.accessToken);
            localStorage.setItem("refreshToken", response.refreshToken);
            console.log("[Auth Renewal] Tokens successfully renewed proactively.");
          }
        } catch (error) {
          console.error("[Auth Renewal] Proactive token refresh failed:", error);
        } finally {
          isRefreshing = false;
        }
      }
    };

    // Run initial check on mount
    checkAndRefresh();

    // Check periodically every 30 seconds to handle computer sleep/wake and backgrounding
    const interval = setInterval(checkAndRefresh, 30000);

    // Listen to storage changes in other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "accessToken" || e.key === "refreshToken") {
        checkAndRefresh();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
}
