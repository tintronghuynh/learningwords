import { useState, useEffect } from 'react';
import { VocabularyWord } from '@shared/schema';
import { CardFlip } from './ui/card-flip';
import { Button } from './ui/button';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import useKeyPress from '@/hooks/useKeyPress';
import { motion } from "framer-motion";
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';

interface FlashcardDisplayProps {
  word: VocabularyWord;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex: number;
  totalWords: number;
}

export default function FlashcardDisplay({
  word,
  onNext,
  onPrevious,
  currentIndex,
  totalWords
}: FlashcardDisplayProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { speak } = useSpeechSynthesis();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  
  // Use keyboard for navigation
  useKeyPress("ArrowRight", onNext);
  useKeyPress("ArrowLeft", onPrevious);
  useKeyPress("Enter", () => setIsFlipped(!isFlipped));
  
  // Tự động về mặt trước khi từ thay đổi và đọc từ mới
  useEffect(() => {
    // Kiểm tra nếu word không tồn tại thì không làm gì cả
    if (!word) return;
    
    // Tự động hiển thị mặt trước khi từ thay đổi
    setIsFlipped(false);
    
    const timer = setTimeout(() => {
      if (word && word.word) {
        speak(word.word);
      }
    }, 500);
    
    // Set up interval for repeated pronunciation (every 4 seconds)
    const intervalId = setInterval(() => {
      if (word && word.word) {
        speak(word.word);
      }
    }, 4000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, [word, speak]);
  
  // Hàm định dạng ngày tháng và tính ngày học tiếp theo dựa trên cấp độ
  const formatNextStudyDate = (dateInput: string | Date | null | undefined, level: number) => {
    if (!dateInput) return "Not studied yet";
    
    // Chuyển đổi dateInput thành Date nếu là string
    const lastStudied = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const nextStudyDate = new Date(lastStudied);
    
    // Tính ngày học tiếp theo dựa vào cấp độ
    switch (level) {
      case 1:
        // Level 1: học hàng ngày - thêm 1 ngày
        nextStudyDate.setDate(lastStudied.getDate() + 1);
        break;
      case 2:
        // Level 2: học sau 2 ngày
        nextStudyDate.setDate(lastStudied.getDate() + 2);
        break;
      case 3:
        // Level 3: học sau 3 ngày
        nextStudyDate.setDate(lastStudied.getDate() + 3);
        break;
      case 4:
        // Level 4: học sau 4 ngày
        nextStudyDate.setDate(lastStudied.getDate() + 4);
        break;
      case 5:
        // Level 5: học sau 7 ngày
        nextStudyDate.setDate(lastStudied.getDate() + 7);
        break;
      default:
        // Mặc định thêm 1 ngày
        nextStudyDate.setDate(lastStudied.getDate() + 1);
    }
    
    return nextStudyDate.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  // Render the front of the flashcard
  const renderFront = () => {
    // Kiểm tra nếu word không tồn tại
    if (!word) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading word data...</p>
        </div>
      );
    }
    
    return (
      <>
        <motion.h3 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-2 font-medium`}
        >
          {word.word}
        </motion.h3>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-500 dark:text-gray-400 mb-3`}
        >
          {word.ipa}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm">
            {word.partOfSpeech}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm
            ${word.level === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 
              word.level === 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
              word.level === 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              word.level === 4 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
              'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
            }`}
          >
            Level {word.level}
          </span>
        </motion.div>
        
        {/* Hiển thị ngày học tiếp theo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-4 text-sm text-gray-500 dark:text-gray-400"
        >
          <span className="material-icons text-xs mr-1 align-text-bottom">calendar_today</span>
          <span>Next study day: {formatNextStudyDate(word.lastStudied, word.level)}</span>
        </motion.div>
        
        <div className="absolute top-3 right-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation(); 
              if (word.word) {
                speak(word.word);
              }
            }}
          >
            <span className="material-icons text-gray-400">volume_up</span>
          </Button>
        </div>
        <p className="absolute bottom-5 text-sm text-gray-400">
          {isMobile ? "Tap to flip" : "Click to flip"}
        </p>
      </>
    );
  };
  
  // Render the back of the flashcard
  const renderBack = () => {
    // Kiểm tra nếu word không tồn tại
    if (!word) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading word data...</p>
        </div>
      );
    }
    
    return (
      <>
        <div className="mb-4">
          <div className="flex justify-between items-start">
            <div>
              <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-medium`}>{word.word}</span>
              <span className={`ml-2 text-gray-500 dark:text-gray-400 ${isMobile ? 'text-sm block mt-1' : ''}`}>{word.ipa}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation(); 
                if (word.word) {
                  speak(word.word);
                }
              }}
            >
              <span className="material-icons text-gray-400">volume_up</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm">
              {word.partOfSpeech}
            </span>
            <span className={`inline-block px-3 py-1 rounded-full text-sm
              ${word.level === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 
                word.level === 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                word.level === 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                word.level === 4 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
              }`}
            >
              Level {word.level}
            </span>
          </div>
        </div>
        
        <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-4`}>
          {/* Column 1: Definition */}
          <div className={`mb-4 border-b border-gray-200 dark:border-gray-700 pb-4 ${isMobile ? '' : 'md:border-r md:pr-4'}`}>
            <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-2`}>Definition</h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base">
              {word.definition && word.definition.split('(')[0].trim()}
            </p>
            {word.definition && word.definition.includes('(') && (
              <p className="text-gray-600 dark:text-gray-400 italic mt-1 text-xs md:text-sm">
                {word.definition.match(/\((.*?)\)/)?.[1]}
              </p>
            )}
          </div>
          
          {/* Column 2: Meanings */}
          <div>
            <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-2`}>Meanings</h4>
            {word.meanings && word.meanings.length > 1 ? (
              <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-3`}>
                {word.meanings.map((meaning, index) => (
                  <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                    <p className="text-gray-700 dark:text-gray-300 mb-1 text-sm md:text-base">
                      {meaning.meaning && meaning.meaning.split('(')[0].trim()}
                    </p>
                    {meaning.meaning && meaning.meaning.includes('(') && (
                      <p className="text-gray-600 dark:text-gray-400 italic text-xs md:text-sm">
                        {meaning.meaning.match(/\((.*?)\)/)?.[1]}
                      </p>
                    )}
                    
                    {meaning.examples && meaning.examples.length > 0 && (
                      <div className="mt-2">
                        <h5 className="font-medium text-xs text-gray-500 dark:text-gray-400 mb-1">Example:</h5>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md text-xs md:text-sm">
                          <p className="text-gray-800 dark:text-gray-200">{meaning.examples[0].en}</p>
                          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1 italic">{meaning.examples[0].vi}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // If there's only one meaning or no meanings
              <div>
                {word.meanings && word.meanings[0] ? (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm md:text-base">
                      {word.meanings[0].meaning && word.meanings[0].meaning.split('(')[0].trim()}
                    </p>
                    {word.meanings[0].meaning && word.meanings[0].meaning.includes('(') && (
                      <p className="text-gray-600 dark:text-gray-400 italic mb-3 text-xs md:text-sm">
                        {word.meanings[0].meaning.match(/\((.*?)\)/)?.[1]}
                      </p>
                    )}
                    
                    {word.meanings[0].examples && word.meanings[0].examples.length > 0 && (
                      <>
                        <h5 className="font-medium text-xs text-gray-500 dark:text-gray-400 mb-1">Examples:</h5>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                          <p className="text-gray-800 dark:text-gray-200 text-xs md:text-sm">{word.meanings[0].examples[0].en}</p>
                          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1 italic">{word.meanings[0].examples[0].vi}</p>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">No meanings provided</p>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };
  
  return (
    <div className="w-full">
      <CardFlip
        front={renderFront()}
        back={renderBack()}
        flipped={isFlipped}
        onFlip={setIsFlipped}
        className="mb-6 w-full px-4"
        aspectRatio={isMobile ? "aspect-[3/4]" : "aspect-[5/2]"}
      />
      
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onPrevious}
        >
          <span className="material-icons">arrow_back</span>
        </Button>
        
        <div className="flex space-x-2">
          <span className="text-gray-500 dark:text-gray-400">
            Word {currentIndex + 1} of {totalWords}
          </span>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onNext}
        >
          <span className="material-icons">arrow_forward</span>
        </Button>
      </div>
    </div>
  );
}
