"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

interface Batch {
  id: string;
  name: string;
  coachId: string;
  coachName: string;
  players: string[];
  academyId: string;
}

interface BatchContextType {
  batches: Batch[];
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export const BatchProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);

  const fetchBatches = useCallback(async () => {
    if (!user?.academyId) {
      console.log('No academyId available in BatchContext');
      return;
    }

    try {
      console.log('Fetching batches from API in BatchContext...');
      const response = await fetch(`/api/db/ams-batches?academyId=${encodeURIComponent(user.academyId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        console.log('Fetched batches in BatchContext:', result.data);
        setBatches(result.data);
      } else {
        console.error('Invalid batch data format in BatchContext:', result);
        setBatches([]);
      }
    } catch (error) {
      console.error('Error fetching batches in BatchContext:', error);
      setBatches([]);
    }
  }, [user?.academyId]);

  useEffect(() => {
    // Skip fetching batches if no user or on auth routes
    if (!user?.academyId || window.location.pathname.startsWith('/auth')) {
      return;
    }
    fetchBatches();
  }, [fetchBatches, user?.academyId]);

  const value: BatchContextType = {
    batches,
    setBatches,
  };

  return (
    <BatchContext.Provider value={value}>
      {children}
    </BatchContext.Provider>
  );
};

export const useBatches = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error("useBatches must be used within a BatchProvider");
  }
  return context;
};

