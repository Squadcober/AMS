import { createContext, useContext, useState, ReactNode } from 'react';

interface Batch {
  _id: string;
  name: string;
  academyId: string;
  coachId: string;
  players: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface BatchContextType {
  batches: Batch[];
  setBatches: (batches: Batch[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const BatchContext = createContext<BatchContextType>({
  batches: [],
  setBatches: () => {},
  isLoading: true,
  setIsLoading: () => {}
});

export function BatchProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <BatchContext.Provider value={{ batches, setBatches, isLoading, setIsLoading }}>
      {children}
    </BatchContext.Provider>
  );
}

export function useBatches() {
  const context = useContext(BatchContext);
  if (context === undefined) {
    throw new Error('useBatches must be used within a BatchProvider');
  }
  return context;
}
