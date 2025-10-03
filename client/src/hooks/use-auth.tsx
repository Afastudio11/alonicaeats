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
    // Try to get current user from session cookie
    // The server will validate the httpOnly cookie automatically
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include' // Important: send cookies
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        // No valid session, user stays null
        console.log('No active session');
      } finally {
        setAuthReady(true);
      }
    };
    checkAuth();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      return response.json();
    },
    onSuccess: (data) => {
      // Cookie is set by server automatically
      // No need to store token in localStorage anymore (security improvement)
      setUser(data.user);
      setAuthReady(true);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Cookie will be sent automatically with credentials: 'include'
      await apiRequest('POST', '/api/auth/logout', {});
    },
    onSettled: () => {
      setUser(null);
      // No need to clear localStorage - no tokens stored there anymore
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
