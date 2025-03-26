import React, { createContext, useContext } from 'react';
import { useSimpleMusicPlayer } from '../hooks/useSimpleMusicPlayer';

// Định nghĩa kiểu dữ liệu cho context
type MusicContextType = ReturnType<typeof useSimpleMusicPlayer>;

// Tạo context với giá trị mặc định undefined
const MusicContext = createContext<MusicContextType | undefined>(undefined);

// Provider cho việc quản lý âm nhạc
export function MusicProvider({ children }: { children: React.ReactNode }) {
  const musicControls = useSimpleMusicPlayer();

  return (
    <MusicContext.Provider value={musicControls}>
      {children}
    </MusicContext.Provider>
  );
}

// Hook để sử dụng MusicContext
export function useMusicPlayer() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicProvider');
  }
  return context;
}