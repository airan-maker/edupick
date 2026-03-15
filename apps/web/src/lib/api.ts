import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  if (accessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && refreshToken) {
    const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      (headers as Record<string, string>)[
        "Authorization"
      ] = `Bearer ${data.accessToken}`;
      response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers,
      });
    } else {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  return response;
}

function buildQueryString(params?: Record<string, unknown>) {
  if (!params) return "";

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function parseResponse<T>(res: Response, method: string, url: string) {
  if (!res.ok) {
    let message = `${method} ${url} failed: ${res.status}`;

    try {
      const errorBody = await res.json();
      if (typeof errorBody.message === "string") {
        message = errorBody.message;
      } else if (Array.isArray(errorBody.message)) {
        message = errorBody.message.join(", ");
      }
    } catch {
      // Ignore JSON parsing errors for empty or non-JSON responses.
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const target = `${url}${buildQueryString(params)}`;
    const res = await fetchWithAuth(target);
    return parseResponse<T>(res, "GET", target);
  },

  async post<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(url, {
      method: "POST",
      body:
        body && typeof FormData !== "undefined" && body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
    return parseResponse<T>(res, "POST", url);
  },

  async patch<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(url, {
      method: "PATCH",
      body:
        body && typeof FormData !== "undefined" && body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
    return parseResponse<T>(res, "PATCH", url);
  },

  async delete<T>(url: string): Promise<T> {
    const res = await fetchWithAuth(url, { method: "DELETE" });
    return parseResponse<T>(res, "DELETE", url);
  },
};
