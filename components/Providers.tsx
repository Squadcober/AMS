"use client"

import { useState, useEffect } from "react"
import { SessionProvider } from "@/contexts/SessionContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { PlayerProvider } from "@/contexts/PlayerContext"
import { BatchProvider } from "@/contexts/BatchContext"
import { CoachProvider } from "@/contexts/CoachContext"
import { Toaster } from "@/components/ui/toaster"
import { PageTransitionWrapper } from "./PageTransitionWrapper"
import SplashScreen from "./SplashScreen"

export function Providers({ children }: { children: React.ReactNode }) {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Initial app load splash screen
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SessionProvider>
      <AuthProvider>
        <PlayerProvider>
          <BatchProvider>
            <CoachProvider>
              {initialLoading ? (
                <SplashScreen />
              ) : (
                <PageTransitionWrapper>
                  {children}
                </PageTransitionWrapper>
              )}
              <Toaster />
            </CoachProvider>
          </BatchProvider>
        </PlayerProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
