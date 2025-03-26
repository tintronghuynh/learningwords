import { useCallback, useRef, useState, useEffect } from 'react';

// Lưu trữ âm lượng trong localStorage
const SPEECH_VOLUME_KEY = 'vocab_master_speech_volume';

export function useSpeechSynthesis() {
  // Khởi tạo âm lượng từ localStorage hoặc mặc định 1.0
  const [volume, setVolume] = useState<number>(() => {
    const savedVolume = localStorage.getItem(SPEECH_VOLUME_KEY);
    return savedVolume ? parseFloat(savedVolume) : 1.0;
  });
  
  // Lưu âm lượng vào localStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem(SPEECH_VOLUME_KEY, volume.toString());
  }, [volume]);
  
  // Lưu các interval ID để có thể dừng khi cần
  const speechIntervals = useRef<number[]>([]);
  
  // Hàm để dừng tất cả các interval hiện tại
  const stopAllIntervals = useCallback(() => {
    speechIntervals.current.forEach(intervalId => {
      clearInterval(intervalId);
    });
    speechIntervals.current = [];
  }, []);
  
  // Hàm để dừng tất cả speech synthesis và tất cả các interval
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Dừng tất cả các interval
    speechIntervals.current.forEach(intervalId => {
      clearInterval(intervalId);
    });
    speechIntervals.current = [];
  }, []);
  
  // Hàm điều chỉnh âm lượng phát âm
  const changeVolume = useCallback((newVolume: number) => {
    // Giới hạn âm lượng từ 0.0 đến 1.0
    const clampedVolume = Math.max(0, Math.min(1.0, newVolume));
    setVolume(clampedVolume);
  }, []);
  
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      return;
    }
    
    // Cancel any ongoing speech và các interval
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set to British English female voice
    const voices = window.speechSynthesis.getVoices();
    const britishFemaleVoice = voices.find(
      voice => voice.lang.includes('en-GB') && voice.name.includes('Female')
    );
    
    if (britishFemaleVoice) {
      utterance.voice = britishFemaleVoice;
    } else {
      // Fallback to any British voice or just English
      const britishVoice = voices.find(voice => voice.lang.includes('en-GB'));
      const englishVoice = voices.find(voice => voice.lang.includes('en'));
      
      if (britishVoice) {
        utterance.voice = britishVoice;
      } else if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }
    
    // Set properties for a natural sound
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1.1; // Slightly higher pitch for a feminine voice
    utterance.volume = volume; // Sử dụng âm lượng từ state
    
    window.speechSynthesis.speak(utterance);
  }, [stopSpeaking, volume]);
  
  // Hàm để lặp lại việc đọc từ sau mỗi khoảng thời gian
  const speakWithInterval = useCallback((text: string, intervalMs: number = 4000, duration: number = 15000) => {
    // Dừng tất cả các interval hiện tại và phát âm đang chạy
    stopSpeaking();
    
    // Đọc từ ngay lập tức
    speak(text);
    
    // Thiết lập interval để đọc lại từ
    const intervalId = window.setInterval(() => {
      speak(text);
    }, intervalMs);
    
    // Lưu interval ID để có thể dừng sau này
    speechIntervals.current.push(intervalId);
    
    // Nếu có duration, tự động dừng sau khoảng thời gian đó
    if (duration > 0) {
      setTimeout(() => {
        clearInterval(intervalId);
        speechIntervals.current = speechIntervals.current.filter(id => id !== intervalId);
      }, duration);
    }
    
    return intervalId;
  }, [speak, stopSpeaking]);
  
  // Ensure voices are loaded
  useCallback(() => {
    if (!window.speechSynthesis) return;
    
    // Chrome requires this workaround to load voices
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        // Voices are now loaded
      });
    }
  }, [])();
  
  return {
    speak,
    speakWithInterval,
    stopSpeaking,
    volume,
    changeVolume
  };
}
