import { useState, useCallback, useEffect, useRef } from 'react';

// Khai báo interface cho YouTube Player API
interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  cueVideoById: (options: { videoId: string, startSeconds?: number }) => void;
  loadVideoById: (options: { videoId: string, startSeconds?: number }) => void;
  setVolume: (volume: number) => void; // Thêm phương thức điều chỉnh âm lượng
  destroy: () => void;
}

// Khai báo window.YT để TypeScript nhận biết
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          height: string | number;
          width: string | number;
          videoId: string;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            mute?: 0 | 1;
          };
          events?: {
            onReady?: (event: any) => void;
            onStateChange?: (event: any) => void;
          };
        }
      ) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

// Danh sách các ID YouTube đã cung cấp
const youtubeIds = [
  "I8eDaLna8-M",
  "GDsfBOu4ag8",
  "9SZkl_jOJa4",
  "wTzOllW_f8c",
  "V45e5Jta4sY",
  "akTL_Wi_FAg",
  "1oFQVL5Otu0",
  "ZqjhmdRgXMw",
  "BqbF2W0gwyg",
  "IaXFyrJ7dGY",
  "RPpFCxRwxw8",
  "Hom-ayPxzBg",
  "rA0XEb6ZBeU",
  "be_kfTGGJqM",
  "4kf5QgUBPJw",
  "t6vPNwSj_Ho",
  "EijQbccu04M",
  "HwQA9QphYjc",
  "fgpwTxIv76Q",
  "YevG7H-PLpY",
  "b_EF-fRnqWs",
  "1kehqCLudyg",
  "UKUzB6LhoYU",
  "VY3BZE8z3F0",
  "bY2B_oC9g-k",
  "zoxFXlYPY6Y",
  "5GUaMOpfmr8",
  "NyXApXudtaU",
];

// Constants cho localStorage keys
const MUSIC_PLAYING_KEY = 'vocab_master_music_playing';
const MUSIC_TRACK_INDEX_KEY = 'vocab_master_track_index';
const MUSIC_VOLUME_KEY = 'vocab_master_volume';
const MUSIC_TIMESTAMP_KEY = 'vocab_master_timestamp';
const PLAYER_CONTAINER_ID = 'youtube-global-player';

// Biến toàn cục cho player và trạng thái
// eslint-disable-next-line
let isYouTubeAPIReady = false;
// eslint-disable-next-line
let globalYouTubePlayer: YouTubePlayer | null = null;
// eslint-disable-next-line
let currentTrackTime = 0;

// Hàm tiện ích để tải YouTube API script một lần
function loadYouTubeAPI() {
  if (document.getElementById('youtube-api-script') || isYouTubeAPIReady) {
    return;
  }
  
  const tag = document.createElement('script');
  tag.id = 'youtube-api-script';
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.async = true;
  
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  
  window.onYouTubeIframeAPIReady = () => {
    isYouTubeAPIReady = true;
    console.log('YouTube API is ready');
  };
}

// Hàm để lưu thời gian phát hiện tại (gọi định kỳ)
function saveCurrentTime() {
  if (globalYouTubePlayer && typeof globalYouTubePlayer.getCurrentTime === 'function') {
    try {
      const currentTime = globalYouTubePlayer.getCurrentTime();
      if (currentTime > 0) {
        currentTrackTime = currentTime;
        localStorage.setItem(MUSIC_TIMESTAMP_KEY, currentTime.toString());
      }
    } catch (error) {
      console.error('Error saving current time:', error);
    }
  }
}

export function useSimpleMusicPlayer() {
  // Đọc trạng thái từ localStorage hoặc sử dụng giá trị mặc định
  const [isPlaying, setIsPlaying] = useState(() => {
    const savedIsPlaying = localStorage.getItem(MUSIC_PLAYING_KEY);
    return savedIsPlaying === 'true';
  });
  
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem(MUSIC_VOLUME_KEY);
    return savedVolume ? parseInt(savedVolume, 10) : 20; // Âm lượng mặc định: 20% (2/3 của 30%)
  });
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(() => {
    const savedIndex = localStorage.getItem(MUSIC_TRACK_INDEX_KEY);
    return savedIndex ? parseInt(savedIndex, 10) : -1;
  });
  
  // Biến ref để lưu trữ interval lưu thời gian phát
  const saveTimeIntervalRef = useRef<number | null>(null);

  // Tạo và khởi tạo container và YouTube API
  useEffect(() => {
    // Tải YouTube API
    loadYouTubeAPI();
    
    // Tạo container nếu chưa tồn tại
    if (!document.getElementById(PLAYER_CONTAINER_ID)) {
      const container = document.createElement('div');
      container.id = PLAYER_CONTAINER_ID;
      container.style.position = 'fixed';
      container.style.bottom = '0';
      container.style.right = '0';
      container.style.width = '0';
      container.style.height = '0';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);
      console.log('YouTube player container created');
    }
    
    // Đọc thời gian đã lưu từ localStorage
    const savedTime = localStorage.getItem(MUSIC_TIMESTAMP_KEY);
    if (savedTime) {
      currentTrackTime = parseFloat(savedTime);
    }
    
    // Thiết lập interval để lưu thời gian phát định kỳ
    saveTimeIntervalRef.current = window.setInterval(saveCurrentTime, 5000);
    
    // Khôi phục trạng thái phát nếu cần thiết
    const checkAndInitializePlayer = () => {
      if (isPlaying && currentTrackIndex >= 0 && isYouTubeAPIReady) {
        if (!globalYouTubePlayer) {
          initializePlayer(currentTrackIndex, true);
        }
      }
    };
    
    // Kiểm tra và khởi tạo player khi API sẵn sàng
    const checkAPIReadyInterval = setInterval(() => {
      if (isYouTubeAPIReady) {
        clearInterval(checkAPIReadyInterval);
        checkAndInitializePlayer();
      }
    }, 100);
    
    return () => {
      if (saveTimeIntervalRef.current) {
        clearInterval(saveTimeIntervalRef.current);
      }
      clearInterval(checkAPIReadyInterval);
    };
  }, []);

  // Cập nhật localStorage khi isPlaying thay đổi
  useEffect(() => {
    localStorage.setItem(MUSIC_PLAYING_KEY, isPlaying.toString());
  }, [isPlaying]);
  
  // Cập nhật localStorage khi currentTrackIndex thay đổi
  useEffect(() => {
    if (currentTrackIndex >= 0) {
      localStorage.setItem(MUSIC_TRACK_INDEX_KEY, currentTrackIndex.toString());
    }
  }, [currentTrackIndex]);
  
  // Cập nhật localStorage khi volume thay đổi
  useEffect(() => {
    localStorage.setItem(MUSIC_VOLUME_KEY, volume.toString());
  }, [volume]);

  // Khởi tạo YouTube Player
  const initializePlayer = useCallback((trackIndex: number, autoplay: boolean) => {
    if (!isYouTubeAPIReady || !window.YT) {
      console.log('YouTube API not ready yet, trying again soon...');
      setTimeout(() => initializePlayer(trackIndex, autoplay), 500);
      return;
    }
    
    const container = document.getElementById(PLAYER_CONTAINER_ID);
    if (!container) return;
    
    // Xóa player cũ nếu có
    if (globalYouTubePlayer) {
      try {
        globalYouTubePlayer.destroy();
      } catch (error) {
        console.error('Error destroying old player:', error);
      }
      globalYouTubePlayer = null;
    }
    
    // Làm trống container
    container.innerHTML = '';
    
    // Tạo phần tử div để chứa player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-player-inner';
    container.appendChild(playerDiv);
    
    try {
      const trackId = youtubeIds[trackIndex];
      
      // Tạo player mới
      globalYouTubePlayer = new window.YT.Player('youtube-player-inner', {
        height: '0',
        width: '0',
        videoId: trackId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          mute: 0
        },
        events: {
          onReady: (event) => {
            console.log('YouTube player is ready');
            
            // Áp dụng âm lượng hiện tại cho player
            try {
              if (typeof event.target.setVolume === 'function') {
                event.target.setVolume(volume);
                console.log(`Applied volume: ${volume}%`);
              }
            } catch (error) {
              console.error('Error setting volume:', error);
            }
            
            // Phát video và đặt vị trí nếu cần
            if (autoplay) {
              if (currentTrackTime > 0) {
                event.target.seekTo(currentTrackTime, true);
              }
              event.target.playVideo();
              setIsPlaying(true);
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              // Tự động chuyển bài khi kết thúc
              playNextTrack();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              // Lưu thời gian hiện tại khi tạm dừng
              saveCurrentTime();
            }
          }
        }
      });
    } catch (error) {
      console.error('Error initializing YouTube player:', error);
    }
  }, []);

  // Khởi tạo bài hát ngẫu nhiên nếu chưa có
  const initializeRandomTrack = useCallback(() => {
    if (currentTrackIndex === -1) {
      const randomIndex = Math.floor(Math.random() * youtubeIds.length);
      setCurrentTrackIndex(randomIndex);
      return randomIndex;
    }
    return currentTrackIndex;
  }, [currentTrackIndex]);

  // Phát bài hát
  const play = useCallback(() => {
    // Lấy index bài hát, chọn ngẫu nhiên nếu chưa có
    const trackIndex = currentTrackIndex === -1 ? initializeRandomTrack() : currentTrackIndex;
    
    // Nếu đã có player và đang phát cùng bài
    if (globalYouTubePlayer && typeof globalYouTubePlayer.playVideo === 'function') {
      try {
        globalYouTubePlayer.playVideo();
        setIsPlaying(true);
        return;
      } catch (error) {
        console.error('Error playing video:', error);
      }
    }
    
    // Khởi tạo player mới nếu chưa có hoặc có lỗi
    initializePlayer(trackIndex, true);
  }, [currentTrackIndex, initializeRandomTrack, initializePlayer]);

  // Tạm dừng nhạc
  const pause = useCallback(() => {
    if (globalYouTubePlayer && typeof globalYouTubePlayer.pauseVideo === 'function') {
      try {
        // Lưu thời gian hiện tại trước khi tạm dừng
        saveCurrentTime();
        globalYouTubePlayer.pauseVideo();
        setIsPlaying(false);
      } catch (error) {
        console.error('Error pausing video:', error);
      }
    }
  }, []);

  // Phát bài hát theo index cụ thể
  const playTrack = useCallback((trackIndex: number) => {
    setCurrentTrackIndex(trackIndex);
    
    if (globalYouTubePlayer && typeof globalYouTubePlayer.loadVideoById === 'function') {
      try {
        // Lưu thời gian của bài trước
        saveCurrentTime();
        
        // Đặt lại thời gian cho bài mới
        currentTrackTime = 0;
        localStorage.setItem(MUSIC_TIMESTAMP_KEY, '0');
        
        // Tải và phát bài mới
        globalYouTubePlayer.loadVideoById({ videoId: youtubeIds[trackIndex] });
        setIsPlaying(true);
      } catch (error) {
        console.error('Error changing track:', error);
        // Nếu lỗi, thử khởi tạo lại player
        initializePlayer(trackIndex, true);
      }
    } else {
      // Khởi tạo player nếu chưa có
      initializePlayer(trackIndex, true);
    }
  }, [initializePlayer]);

  // Phát/tạm dừng nhạc
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Chuyển đến bài trước
  const playPreviousTrack = useCallback(() => {
    const newIndex = currentTrackIndex <= 0 ? youtubeIds.length - 1 : currentTrackIndex - 1;
    playTrack(newIndex);
  }, [currentTrackIndex, playTrack]);

  // Chuyển đến bài tiếp theo
  const playNextTrack = useCallback(() => {
    const newIndex = currentTrackIndex === -1 || currentTrackIndex >= youtubeIds.length - 1 
      ? 0 
      : currentTrackIndex + 1;
    playTrack(newIndex);
  }, [currentTrackIndex, playTrack]);

  // Điều chỉnh âm lượng
  const changeVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    setVolume(clampedVolume);
    
    // Áp dụng âm lượng mới cho YouTube player nếu đang tồn tại
    if (globalYouTubePlayer && typeof globalYouTubePlayer.setVolume === 'function') {
      try {
        globalYouTubePlayer.setVolume(clampedVolume);
        console.log(`Updated player volume to ${clampedVolume}%`);
      } catch (error) {
        console.error('Error updating player volume:', error);
      }
    }
  }, []);

  // Lấy thông tin bài hát hiện tại
  const getCurrentTrackInfo = useCallback(() => {
    if (currentTrackIndex >= 0 && currentTrackIndex < youtubeIds.length) {
      return {
        id: youtubeIds[currentTrackIndex],
        url: `https://www.youtube.com/watch?v=${youtubeIds[currentTrackIndex]}`
      };
    }
    return null;
  }, [currentTrackIndex]);

  return {
    isPlaying,
    volume,
    currentTrackIndex,
    togglePlay,
    playPreviousTrack,
    playNextTrack,
    changeVolume,
    getCurrentTrackInfo
  };
}