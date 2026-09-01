import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ApiClient } from "@/lib/api-client";
import type { AuthUser, UserRole } from "@/types/skillbridge";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; user: AuthUser }>;
  register: (data: {
    email: string;
    password: string;
    role: "student" | "recruiter";
    name?: string;
    college?: string;
    program?: string;
    company_name?: string;
    industry?: string;
  }) => Promise<{ success: boolean; user: AuthUser }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = useCallback(async () => {
    const token = ApiClient.getToken();
    const refreshToken = ApiClient.getRefreshToken();

    if (!token && !refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      if (token) {
        const meRes = await ApiClient.me();
        if (meRes && meRes.user) {
          setUser({
            ...meRes.user,
            profile: meRes.profile || meRes.user.profile,
          });
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Token may be expired; attempt refresh token
      if (refreshToken) {
        try {
          const refreshRes = await ApiClient.refreshAccessToken(refreshToken);
          if (refreshRes && refreshRes.token) {
            ApiClient.setToken(refreshRes.token);
            setUser(refreshRes.user);
            setIsLoading(false);
            return;
          }
        } catch {
          ApiClient.clearTokens();
          setUser(null);
        }
      } else {
        ApiClient.clearTokens();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener("sb_auth_expired", handleAuthExpired);
    return () => {
      window.removeEventListener("sb_auth_expired", handleAuthExpired);
    };
  }, [initAuth]);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.login(credentials);
      setUser(res.user);
      return { success: true, user: res.user };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    role: "student" | "recruiter";
    name?: string;
    college?: string;
    program?: string;
    company_name?: string;
    industry?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.register(data);
      setUser(res.user);
      return { success: true, user: res.user };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await ApiClient.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    const refreshToken = ApiClient.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await ApiClient.refreshAccessToken(refreshToken);
      if (res && res.token) {
        ApiClient.setToken(res.token);
        setUser(res.user);
        return true;
      }
      return false;
    } catch {
      ApiClient.clearTokens();
      setUser(null);
      return false;
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshSession,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
