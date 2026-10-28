import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    try {
      const response = await api.get("/auth/me");
      const currentUser = response.data.user ?? response.data;
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initializeUser() {
      try {
        const response = await api.get("/auth/me");
        if (!cancelled) {
          const currentUser = response.data.user ?? response.data;
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initializeUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    await api.post("/auth/login", { email, password });
    const response = await api.get("/auth/me");
    const currentUser = response.data.user ?? response.data;
    setUser(currentUser);
    return currentUser;
  }

  async function logout() {
    try {
      await api.delete("/auth/logout");
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
