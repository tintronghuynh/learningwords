import { useState, useEffect, useRef } from 'react';
import { VocabularyWord } from '@shared/schema';
import { CardFlip } from './ui/card-flip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import useKeyPress from '@/hooks/useKeyPress';
import { motion, AnimatePresence } from "framer-motion";
import { Confetti } from './ui/confetti';
import { useIsMobile } from '@/hooks/use-mobile';

interface FlashcardInputProps {
  word: VocabularyWord;
  onNext: () => void;
  onCorrectAnswer: (wordId: number, isCorrect: boolean) => void;
  currentIndex: number;
  totalWords: number;
}

export default function FlashcardInput({
  word,
  onNext,
  onCorrectAnswer,
  currentIndex,
  totalWords
}: FlashcardInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { speak, speakWithInterval, stopSpeaking } = useSpeechSynthesis();
  const isMobile = useIsMobile();
  
  // Reset state when word changes
  useEffect(() => {
    // Kiểm tra nếu word không tồn tại
    if (!word) return;
    
    // Dừng đọc từ cũ khi chuyển sang từ mới
    stopSpeaking();
    
    // Reset các trạng thái
    setInputValue('');
    setIsCorrect(false);
    setIsFlipped(false);
    setShowConfetti(false);
    setShowError(false);
    
    // Focus the input field when a new word is loaded
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    
    // Cleanup function - đảm bảo dừng phát âm khi component bị unmount hoặc word thay đổi
    return () => {
      stopSpeaking();
    };
  }, [word, stopSpeaking]);
  
  // Use keyboard for navigation
  useKeyPress("ArrowRight", () => {
    if (isCorrect) onNext();
  });
  
  // Check if the input is correct
  const checkAnswer = () => {
    // Kiểm tra nếu word không tồn tại
    if (!word || !word.word) {
      return false;
    }
    
    const normalizedInput = inputValue.trim().toLowerCase();
    const normalizedWord = word.word.trim().toLowerCase();
    
    if (normalizedInput === normalizedWord) {
      setIsCorrect(true);
      setIsFlipped(true); // Automatically flip to back side
      setShowConfetti(true);
      
      // Sử dụng hàm speakWithInterval để đọc từ định kỳ
      if (word.word) {
        speakWithInterval(word.word, 5000, 15000);
      }
      
      // Gọi onCorrectAnswer với tham số isCorrect = true
      onCorrectAnswer(word.id, true);
      
      return true;
    } else {
      // Hiển thị thông báo lỗi khi sai
      setShowError(true);
      
      // Tự động ẩn thông báo sau 2 giây
      setTimeout(() => {
        setShowError(false);
      }, 2000);
      
      // Gọi onCorrectAnswer với tham số isCorrect = false để cập nhật cấp độ từ
      onCorrectAnswer(word.id, false);
      
      return false;
    }
  };
  
  // Handle Enter key for checking the answer
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isCorrect) {
        onNext();
      } else {
        checkAnswer();
      }
    }
  };
  
  // Render the front of the flashcard (Vietnamese definition only)
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
      <div className="text-center max-w-lg">
        <motion.h3 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`font-medium ${isMobile ? 'text-lg' : 'text-xl'} mb-4`}
        >
          {word.definition && word.definition.includes('(') 
            ? word.definition.match(/\((.*?)\)/)?.[1] 
            : word.definition}
        </motion.h3>
        <motion.ul 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`text-center list-none ${isMobile ? 'space-y-2 text-sm' : 'space-y-3'}`}
        >
          {word.meanings && word.meanings.map((meaning, index) => (
            <li key={index} className="text-gray-600 dark:text-gray-400">
              ✦ {meaning.meaning && meaning.meaning.includes('(') 
                ? meaning.meaning.match(/\((.*?)\)/)?.[1] 
                : meaning.meaning}
            </li>
          ))}
        </motion.ul>
      </div>
    );
  };
  
  // Render the back of the flashcard (using the same layout as FlashcardDisplay)
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
              <span className={`${isMobile ? 'text-sm block mt-1' : 'ml-2'} text-gray-500 dark:text-gray-400`}>{word.ipa}</span>
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
          <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm mt-1">
            {word.partOfSpeech}
          </span>
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
                      <p className="text-gray-600 dark:text-gray-400 italic text-xs">
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
              // If there's only one meaning
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
      {/* Nút điều hướng và thông tin ở trên đầu */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <span className="text-gray-500 dark:text-gray-400">
            Word {currentIndex + 1} of {totalWords}
          </span>
        </div>
        
        <Button
          variant={isCorrect || isFlipped ? "default" : "secondary"}
          onClick={() => {
            // Dừng phát âm trước khi chuyển sang từ tiếp theo
            stopSpeaking();
            onNext();
          }}
          disabled={!isCorrect && !isFlipped}
          className="ml-auto"
        >
          Next
        </Button>
      </div>
      
      {/* Phần nhập từ mới */}
      <div className="mb-6">
        <label htmlFor="wordInput" className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
          Enter the English word:
        </label>
        <div className="flex">
          <Input
            ref={inputRef}
            id="wordInput"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-grow px-4 py-3 ${isCorrect ? 'border-green-500 focus:border-green-500' : ''} rounded-l-lg`}
            placeholder="Type your answer here..."
            disabled={isCorrect}
          />
          <Button
            onClick={isCorrect ? () => {
              stopSpeaking();
              onNext();
            } : checkAnswer}
            className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-3"
          >
            {isCorrect ? 'Next' : 'Check'}
          </Button>
          <Button
            variant={isFlipped ? "outline" : "secondary"}
            onClick={() => {
              // Chỉ cho phép xem đáp án và lật thẻ khi đã nhập đúng từ
              if (isCorrect && word && word.word) {
                setIsFlipped(true);
                speak(word.word);
              }
            }}
            disabled={!isCorrect}
            className="px-5 py-3 rounded-r-lg"
          >
            Đáp án
          </Button>
        </div>
      </div>
      
      {/* Thông báo lỗi */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md text-center"
          >
            Câu trả lời không chính xác. Vui lòng thử lại.
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Flashcard */}
      <CardFlip
        front={renderFront()}
        back={renderBack()}
        flipped={isFlipped}
        onFlip={(flipped) => {
          // Chỉ cho phép lật khi đã nhập đúng từ
          if (isCorrect) {
            setIsFlipped(flipped);
          } else {
            setIsFlipped(false); // Giữ ở mặt trước nếu chưa nhập đúng
          }
        }}
        className="w-full px-4"
        aspectRatio={isMobile ? "aspect-[3/4]" : "aspect-[5/2]"}
      />
      
      <Confetti active={showConfetti} />
    </div>
  );
}
