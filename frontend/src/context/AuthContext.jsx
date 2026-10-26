import { createContext, useContext, useEffect, useState } from "react";
import { api, setAuthToken } from "../app/api";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");
    const accessToken = localStorage.getItem("access");
    setAuthToken(accessToken);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setAuthToken("");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    const handleAuthChange = () => setUser(null);
    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("access", data.access_token);
    localStorage.setItem("refresh", data.refresh_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post(
        "/auth/logout",
        {
          refresh_token: localStorage.getItem("refresh"),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("refresh")}`,
          },
        },
      );
    } finally {
      localStorage.clear();
      setAuthToken("");
      setUser(null);
    }
  }

  const value = { user, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
