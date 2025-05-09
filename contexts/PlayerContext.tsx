"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Player {
  id: string | number;
  name: string;
  position?: string;
  photoUrl?: string;
  academyId: string;
  userId?: string;
  attributes: {
    shooting: number;
    pace: number;
    positioning: number;
    passing: number;
    ballControl: number;
    crossing: number;
    [key: string]: any;
  };
  performanceHistory?: Array<{
    date: string;
    type?: string;
    attributes: {
      shooting: number;
      pace: number;
      positioning: number;
      passing: number;
      ballControl: number;
      crossing: number;
      [key: string]: any;
    };
    matchId?: string;
    stats?: {
      matchPoints?: {
        current: number;
        previous?: number;
      };
      goals?: number;
      assists?: number;
      [key: string]: any;
    };
  }>;
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

