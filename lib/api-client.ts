export interface ApiFetchOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const headers = new Headers(options.headers || {});
  if (options.body && options.body instanceof FormData) {
    // Let browser set the multipart/form-data content type with boundary
  } else {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Extract skipAuthRedirect to prevent passing it to native fetch
  const { skipAuthRedirect, ...fetchOptions } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    if (skipAuthRedirect) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.message || "Invalid credentials");
      (error as any).status = 401;
      throw error;
    }
    // If unauthorized, clean tokens and redirect to sign-in
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
      if (window.caches) {
        window.caches.delete("proctor-video-cache").catch(() => {});
      }
      window.location.href = "/sign-in?error=session_expired";
    }
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.message || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

