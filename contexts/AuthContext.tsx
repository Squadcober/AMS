"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { type User, UserRole } from "@/types/user"
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: Omit<User, "id">) => Promise<boolean>
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

const getInitialRoute = (role: string) => {
  switch (role.toLowerCase()) {
    case 'student':
      return '/dashboard/student/profile';
    case 'coach':
      return '/dashboard/coach/profile';
    case 'admin':
      return '/dashboard/admin';
    case 'owner':
      return '/dashboard/Owner/academy-management';
    default:
      return '/auth';
  }
};

const isPublicRoute = (path: string) => {
  return ['/auth', '/auth/signup', '/auth/login'].includes(path);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for public routes
      if (isPublicRoute(pathname || '')) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Check if user is owner from localStorage
        const isOwner = localStorage.getItem('isOwner') === 'true';
        
        if (isOwner) {
          setUser({
            id: 'owner-id',
            username: 'ownerams',
            role: 'owner',
            // Add other required User interface properties
            displayName: 'Owner',
            password: 'pass5key',
            name: 'Owner',
          });
          if (pathname === '/auth') {
            router.push('/dashboard/Owner/academy-management');
          }
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/auth/check', { 
          credentials: 'include',
          cache: 'no-store' 
        });

        if (!response.ok) {
          if (response.status === 401) {
            setUser(null);
            if (!isPublicRoute(pathname || '')) {
              router.push('/auth');
            }
            return;
          }
          throw new Error('Auth check failed');
        }

        const data = await response.json();

        if (data.user) {
          setUser({ ...data.user, role: data.user.role.toLowerCase() });
          
          if (pathname === '/auth') {
            const redirectPath = getInitialRoute(data.user.role);
            router.push(redirectPath);
          }
        } else {
          setUser(null);
          if (!isPublicRoute(pathname || '')) {
            router.push('/auth');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        if (!isPublicRoute(pathname || '')) {
          router.push('/auth');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  const clearUserSession = () => {
    setUser(null);
    // Clear all possible storage locations
    localStorage.clear(); // Clear all localStorage
    sessionStorage.clear(); // Clear all sessionStorage
    
    // Clear all cookies
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      clearUserSession();

      // Check for owner credentials first
      if (username === 'ownerams' && password === 'pass5key') {
        const ownerUser = {
          id: 'owner-id',
          username: 'ownerams',
          role: 'owner',
          displayName: 'Owner',
          name: 'Owner',
        };

        setUser(ownerUser);
        localStorage.setItem('isOwner', 'true');
        router.push('/dashboard/Owner/academy-management');
        return true;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      setUser({ ...data.user, role: data.user.role.toLowerCase() });
      const redirectPath = getInitialRoute(data.user.role);
      await router.push(redirectPath);
      return true;

    } catch (error) {
      console.error('Login error:', error);
      clearUserSession();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Set loading state
      setIsLoading(true);
      
      // First clear all client-side data
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        document.cookie = cookie
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname);
      });

      // Call the logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });

    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Ensure user is cleared and redirect
      setUser(null);
      setIsLoading(false);
      
      // Force a full page reload to clear any remaining state
      window.location.href = '/auth';
    }
  };

  const register = async (userData: Omit<User, "id">): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Update failed');
      }

      setUser({ ...user, ...data.user });
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ user, isLoading, login, logout, register, updateUser }}
    >
      {isLoading ? (
        <div className="flex h-screen w-full items-center justify-center">
          AMS Loading...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

