import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

let refreshRequest = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = localStorage.getItem("refresh");

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      !refreshToken
    ) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      refreshRequest ||= api.post(
        "/auth/refresh",
        {},
        {
          _retry: true,
          headers: { Authorization: `Bearer ${refreshToken}` },
        },
      );

      const response = await refreshRequest;
      refreshRequest = null;
      localStorage.setItem("access", response.data.access_token);
      localStorage.setItem("refresh", response.data.refresh_token);
      setAuthToken(response.data.access_token);
      return api(originalRequest);
    } catch (refreshError) {
      refreshRequest = null;
      localStorage.clear();
      setAuthToken("");
      window.dispatchEvent(new Event("auth-change"));
      throw refreshError;
    }
  },
);

export function apiError(
  error,
  fallback = "Something went wrong. Please try again.",
) {
  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  return data?.error || data?.message || data?.msg || error.message || fallback;
}
