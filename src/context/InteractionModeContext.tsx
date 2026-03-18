import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { InteractionMode } from '../../lib/engine/presentation/types.ts';

interface InteractionModeContextType {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  isGymFloor: boolean;
  isFocus: boolean;
}

const InteractionModeContext = createContext<InteractionModeContextType | undefined>(undefined);

export const InteractionModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<InteractionMode>('standard');

  return (
    <InteractionModeContext.Provider
      value={{
        mode,
        setMode,
        isGymFloor: mode === 'gym-floor',
        isFocus: mode === 'focus',
      }}
    >
      {children}
    </InteractionModeContext.Provider>
  );
};

export const useInteractionMode = () => {
  const context = useContext(InteractionModeContext);
  if (context === undefined) {
    throw new Error('useInteractionMode must be used within an InteractionModeProvider');
  }
  return context;
};
