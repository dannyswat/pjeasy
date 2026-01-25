interface RefreshTokenResponse {
  user: {
    id: number;
    loginId: string;
    name: string;
    profileImageUrl?: string;
  };
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getTokens() {
  return {
    sessionId: localStorage.getItem("session_id"),
    accessToken: localStorage.getItem("access_token"),
    refreshToken: localStorage.getItem("refresh_token"),
  };
}

/**
 * Clear session from localStorage
 */
function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("session_id");
  localStorage.removeItem("user");
}

async function refreshAccessToken(): Promise<string | null> {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { sessionId, refreshToken } = getTokens();

      if (!sessionId || !refreshToken) {
        return null;
      }

      const response = await fetch("/api/auth/refresh-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId,
          refreshToken: refreshToken,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data: RefreshTokenResponse = await response.json();

      // Update stored tokens
      localStorage.setItem("session_id", data.sessionId);
      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      return data.accessToken;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchApi<Type>(
  url: string,
  options?: RequestInit,
  secure?: boolean
): Promise<Type> {
  const { accessToken } = getTokens();

  const headers = new Headers(options?.headers || {});
  if (secure && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, requestOptions);

    if (response.status === 401 && secure) {
      const newAccessToken = await refreshAccessToken();

      if (!newAccessToken) {
        clearSession();
        window.location.href = "/login";
        throw new Error("Authentication failed. Please log in again.");
      }

      headers.set("Authorization", `Bearer ${newAccessToken}`);
      response = await fetch(url, {
        ...options,
        headers,
      });
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(errorData.message || "Request failed");
    }

    const resStr = await response.text();
    if (!resStr) return {} as Type;

    return JSON.parse(resStr);
  } catch (error) {
    console.error("Fetch failed:", error);
    throw error;
  }
}

export async function getApi<Type>(url: string): Promise<Type> {
  return fetchApi<Type>(url, {
    method: "GET",
  });
}

export async function postApi<Type>(
  url: string,
  data?: unknown
): Promise<Type> {
  return fetchApi<Type>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function putApi<Type>(url: string, data?: unknown): Promise<Type> {
  return fetchApi<Type>(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function deleteApi<Type>(url: string): Promise<Type> {
  return fetchApi<Type>(url, {
    method: "DELETE",
  });
}

export async function patchApi<Type>(
  url: string,
  data?: unknown
): Promise<Type> {
  return fetchApi<Type>(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function getSecureApi<Type>(url: string): Promise<Type> {
  return fetchApi<Type>(url, { method: "GET" }, true);
}

export async function postSecureApi<Type>(
  url: string,
  data?: unknown
): Promise<Type> {
  return fetchApi<Type>(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    },
    true
  );
}

export async function putSecureApi<Type>(
  url: string,
  data?: unknown
): Promise<Type> {
  return fetchApi<Type>(
    url,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    },
    true
  );
}

export async function deleteSecureApi<Type>(url: string): Promise<Type> {
  return fetchApi<Type>(url, { method: "DELETE" }, true);
}

export async function patchSecureApi<Type>(
  url: string,
  data?: unknown
): Promise<Type> {
  return fetchApi<Type>(
    url,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    },
    true
  );
}