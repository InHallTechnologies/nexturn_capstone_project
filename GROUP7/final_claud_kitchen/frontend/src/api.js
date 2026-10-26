import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

let accessToken = null;
let refreshing = null;

export function setToken(value) {
  accessToken = value;
}

export function refreshSession({ optional = false } = {}) {
  if (!refreshing) {
    const rotate = () =>
      api.post(optional ? "/auth/session" : "/auth/refresh", null, {
        skipRefresh: true,
      });
    const request = navigator.locks
      ? navigator.locks.request("hearth-refresh", rotate)
      : rotate();
    refreshing = request
      .then(({ data }) => {
        if (data.data) {
          setToken(data.data.access_token);
          window.dispatchEvent(
            new CustomEvent("session-refreshed", { detail: data.data.user }),
          );
        }
        return data.data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      error.response?.status === 401 &&
      config &&
      !config.skipRefresh &&
      !config.retried &&
      !config.url.startsWith("/auth/")
    ) {
      config.retried = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        setToken(null);
        window.dispatchEvent(new Event("session-expired"));
      }
    }
    return Promise.reject(error);
  },
);

export const message = (error) =>
  error.response?.data?.error?.message ||
  (error.code === "ECONNABORTED"
    ? "The request timed out. Please try again."
    : "Cannot reach the server. Check your connection.");
export default api;
