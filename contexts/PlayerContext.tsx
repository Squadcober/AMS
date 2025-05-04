"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Player {
  id: string;
  name: string;
  academyId: string;
  // ... other player properties
}

export interface PlayerContextType {
  players: Player[];
  setPlayers: (players: Player[]) => void;
  getPlayerByUserId: (userId: string) => Player | undefined;
  updatePlayerAttributes: (playerId: string | number, updates: any) => void;
}

export const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [players, setPlayers] = useState<Player[]>([]);

  const getPlayerByUserId = useCallback((userId: string) => {
    return players.find(p => p.id.toString() === userId || p.userId === userId);
  }, [players]);

  const updatePlayerAttributes = (playerId: string | number, updates: any) => {
    setPlayers(prev => 
      prev.map(player => 
        player.id.toString() === playerId.toString() 
          ? { ...player, ...updates }
          : player
      )
    );
  };

  return (
    <PlayerContext.Provider value={{ 
      players, 
      setPlayers, 
      getPlayerByUserId, 
      updatePlayerAttributes 
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayers = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayers must be used within a PlayerProvider');
  }
  return context;
};

