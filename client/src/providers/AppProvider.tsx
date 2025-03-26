import React, { createContext, useContext, useState, useEffect } from 'react';
import { MusicProvider } from './MusicProvider';

interface AppContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  speechVolume: number; 
  setSpeechVolume: (volume: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage or default values
  const [darkMode, setDarkMode] = useState(() => {
    const storedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    return storedMode 
      ? storedMode === 'true'
      : prefersDark;
  });
  
  const [fontSize, setFontSize] = useState(() => {
    const storedSize = localStorage.getItem('fontSize');
    return storedSize ? parseInt(storedSize) : 100;
  });
  
  const [speechVolume, setSpeechVolume] = useState(() => {
    const storedVolume = localStorage.getItem('vocab_master_speech_volume');
    return storedVolume ? parseFloat(storedVolume) : 1.0;
  });
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };
  
  // Apply dark mode to HTML element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);
  
  // Apply font size to root element
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    localStorage.setItem('fontSize', String(fontSize));
  }, [fontSize]);
  
  // Lưu âm lượng phát âm vào localStorage
  useEffect(() => {
    localStorage.setItem('vocab_master_speech_volume', speechVolume.toString());
  }, [speechVolume]);
  
  const value = {
    darkMode,
    toggleDarkMode,
    fontSize,
    setFontSize,
    speechVolume,
    setSpeechVolume
  };
  
  return (
    <AppContext.Provider value={value}>
      <MusicProvider>
        {children}
      </MusicProvider>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
