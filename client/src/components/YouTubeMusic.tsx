import React from 'react';
import { Button } from './ui/button';
import { useMusicPlayer } from '@/providers/MusicProvider';

export function YouTubeMusic() {
  // Sử dụng context để quản lý trạng thái nhạc xuyên suốt ứng dụng
  const { 
    isPlaying, 
    togglePlay, 
    playPreviousTrack, 
    playNextTrack 
  } = useMusicPlayer();
  
  return (
    <div className="flex items-center space-x-1">
      {/* Nút phát bài trước đó */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={playPreviousTrack}
        title="Bài trước"
      >
        <span className="material-icons text-lg">skip_previous</span>
      </Button>

      {/* Nút phát/tạm dừng */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={togglePlay}
        title={isPlaying ? "Tạm dừng" : "Phát nhạc"}
      >
        <span className="material-icons text-lg">
          {isPlaying ? "pause" : "play_arrow"}
        </span>
      </Button>

      {/* Nút phát bài tiếp theo */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={playNextTrack}
        title="Bài tiếp theo"
      >
        <span className="material-icons text-lg">skip_next</span>
      </Button>
    </div>
  );
}