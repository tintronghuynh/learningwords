import React, { useState } from 'react';
import { useMusicPlayer } from '../providers/MusicProvider';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';

export function MusicPlayer() {
  const { 
    isPlaying, 
    volume, 
    togglePlay, 
    playPreviousTrack, 
    playNextTrack, 
    changeVolume 
  } = useMusicPlayer();

  const [showVolumeControl, setShowVolumeControl] = useState(false);

  const handleVolumeChange = (values: number[]) => {
    if (values.length > 0) {
      changeVolume(values[0]);
    }
  };

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

      {/* Điều khiển âm lượng */}
      <Popover open={showVolumeControl} onOpenChange={setShowVolumeControl}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Âm lượng"
          >
            <span className="material-icons text-lg">
              {volume === 0 
                ? "volume_off" 
                : volume < 30 
                  ? "volume_down" 
                  : "volume_up"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Âm lượng</h4>
            <Slider
              defaultValue={[volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
            />
            <div className="flex justify-between">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => changeVolume(0)}
              >
                <span className="material-icons text-sm">volume_off</span>
              </Button>
              <div className="text-sm font-medium">{volume}%</div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => changeVolume(100)}
              >
                <span className="material-icons text-sm">volume_up</span>
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}