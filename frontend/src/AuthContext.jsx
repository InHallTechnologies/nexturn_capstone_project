import { createContext, useContext, useEffect, useState } from 'react';
import { post, get } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setChecking(false);
      return;
    }

    async function checkSession() {
      try {
        const result = await get('/auth/me');
        setUser(result.data.user);
      } catch (sessionError) {
        if (sessionError.status && sessionError.status !== 401) {
          setChecking(false);
          return;
        }
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          setChecking(false);
          return;
        }

        try {
          const result = await post('/auth/refresh', null, refreshToken);
          localStorage.setItem('accessToken', result.data.access_token);
          localStorage.setItem('refreshToken', result.data.refresh_token);
          const account = await get('/auth/me');
          setUser(account.data.user);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setChecking(false);
    }

    checkSession();
  }, []);

  async function login(email, password) {
    const { data } = await post('/auth/login', { email, password }, null);
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password) {
    return post('/auth/register', { name, email, password }, null);
  }

  async function logout() {
    const tokens = [localStorage.getItem('accessToken'), localStorage.getItem('refreshToken')];
    for (const token of tokens) {
      if (token) {
        try {
          await post('/auth/logout', null, token);
        } catch {
          // Clear the local session even if a token has already expired.
        }
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
