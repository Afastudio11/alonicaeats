import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  authReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Check for saved user and token in localStorage
    const savedUser = localStorage.getItem('alonica-user');
    const savedToken = localStorage.getItem('alonica-token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to load user from localStorage:', error);
        localStorage.removeItem('alonica-user');
        localStorage.removeItem('alonica-token');
      }
    }
    // Auth hydration is complete
    setAuthReady(true);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem('alonica-user', JSON.stringify(data.user));
      localStorage.setItem('alonica-token', data.token);
      setAuthReady(true);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('alonica-token');
      if (token) {
        await apiRequest('POST', '/api/auth/logout', {}, {
          'Authorization': `Bearer ${token}`
        });
      }
    },
    onSettled: () => {
      setUser(null);
      localStorage.removeItem('alonica-user');
      localStorage.removeItem('alonica-token');
      // Redirect to welcome page after logout
      window.location.href = '/';
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    authReady
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
