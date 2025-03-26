import { useState, useEffect } from 'react';
import { getRandomQuote } from '@/lib/motivationalQuotes';

export default function Clock() {
  const [time, setTime] = useState<string>("00:00:00");
  const [date, setDate] = useState<string>("");
  const [quote, setQuote] = useState<{ en: string, vi: string, author: string }>({
    en: "", vi: "", author: ""
  });
  
  // Update clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      
      // Format time (HH:MM:SS)
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds}`);
      
      // Format date (Weekday, Month Day, Year)
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const dateString = now.toLocaleDateString('en-US', options);
      setDate(dateString);
    };
    
    // Update quote
    setQuote(getRandomQuote());
    
    // Update clock immediately and then every second
    updateClock();
    const intervalId = setInterval(updateClock, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 h-screen w-screen">
      <div className="mb-8 text-center">
        <div className="text-8xl font-semibold text-white">{time}</div>
        <div className="text-xl text-gray-300 mt-2">{date}</div>
      </div>
      
      <div className="max-w-2xl text-center px-6">
        <blockquote className="text-2xl font-light text-white leading-relaxed">
          "{quote.en}"
        </blockquote>
        <p className="text-lg text-gray-300 mt-4 italic">
          "{quote.vi}"
        </p>
        <p className="text-white mt-3 opacity-80">
          - {quote.author}
        </p>
      </div>
      
      <p className="absolute bottom-5 text-gray-400 text-sm">
        Press <kbd className="px-2 py-1 bg-gray-800 rounded">Shift</kbd> to close
      </p>
    </div>
  );
}
