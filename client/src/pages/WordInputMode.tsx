import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { motion } from "framer-motion";
import { pageVariants } from '@/lib/motionHelpers';
import Header from '@/components/Header';
import FlashcardInput from '@/components/FlashcardInput';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function WordInputMode() {
  const { groupId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Cache của các từ đã đánh dấu studied để tránh gọi API nhiều lần
  const markedAsStudiedRef = useRef<Set<number>>(new Set());
  
  // Theo dõi xem đây có phải lần đầu tiên học trong ngày hay không
  // Đọc từ localStorage để biết thông tin này
  const [isFirstSession, setIsFirstSession] = useState<boolean>(() => {
    const today = new Date().toLocaleDateString();
    const lastStudyDate = localStorage.getItem('lastStudyDate');
    
    // Nếu ngày cuối cùng học khác với hôm nay, đây là phiên đầu tiên
    return lastStudyDate !== today;
  });
  
  // Get vocabulary group data
  const groupQuery = useQuery({
    queryKey: [`/api/groups/${groupId}`],
    retry: 1,
  });
  
  // Build query URL for words
  const buildQueryURL = () => {
    let url = `/api/words/${groupId}`;
    
    // Xây dựng query string với các tham số
    const params = new URLSearchParams();
    
    // Sử dụng mode=input và isFirstSession
    params.append('mode', 'input');
    params.append('isFirstSession', isFirstSession.toString());
    
    // Thêm query string vào URL
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  };
  
  // Get vocabulary words for this group
  const wordsQuery = useQuery({
    queryKey: [buildQueryURL()],
    retry: 1,
  });
  
  // Tính toán dữ liệu từ vựng
  const words: any[] = Array.isArray(wordsQuery.data) ? wordsQuery.data : [];
  const totalWords = words.length;
  const learnedWords = words.filter((word: any) => word.learned).length;
  
  // Cập nhật cache các từ đã học khi data thay đổi
  useEffect(() => {
    if (Array.isArray(words)) {
      words.forEach(word => {
        if (word.studiedToday) {
          markedAsStudiedRef.current.add(word.id);
        }
      });
    }
  }, [words]);
  
  // Get current group name
  let groupName = "Loading...";
  if (groupQuery.data && Array.isArray(groupQuery.data)) {
    const group = groupQuery.data.find((g: any) => g.id === parseInt(groupId || "0"));
    if (group) {
      groupName = group.name;
    }
  }
  
  // Mutation for marking a word as studied - với việc sử dụng cache local
  const markWordStudiedMutation = useMutation({
    mutationFn: async (wordId: number) => {
      // Nếu từ đã được đánh dấu trong cache local, bỏ qua API call
      if (markedAsStudiedRef.current.has(wordId)) {
        console.log(`Word ${wordId} already marked as studied in local cache, skipping API call`);
        return null;
      }
      
      // Thêm vào cache ngay lập tức để ngăn các lệnh gọi trùng lặp
      markedAsStudiedRef.current.add(wordId);
      
      try {
        console.log(`Marking word ${wordId} as studied`);
        const response = await apiRequest('PUT', `/api/words/${wordId}/studied`, {});
        
        // Không cần invalidate queries - chỉ cần cập nhật cache local
        return response;
      } catch (error) {
        console.error('Error marking word as studied:', error);
        // Nếu có lỗi, xóa khỏi cache để có thể thử lại sau
        markedAsStudiedRef.current.delete(wordId);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Failed to mark word as studied:', error);
    }
  });
  
  // Mutation for marking a word as learned
  const markWordLearnedMutation = useMutation({
    mutationFn: async (wordId: number) => {
      return apiRequest('PUT', `/api/words/${wordId}/learned`, { learned: true });
    },
    onSuccess: () => {
      // Refresh group data to update statistics
      queryClient.invalidateQueries({ queryKey: ['/api/groups/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/1'] });
    }
  });
  
  // Mutation for updating word level based on correctness
  const updateWordLevelMutation = useMutation({
    mutationFn: async ({ wordId, isCorrect }: { wordId: number, isCorrect: boolean }) => {
      console.log(`Updating word level: wordId=${wordId}, isCorrect=${isCorrect}`);
      return apiRequest('PUT', `/api/words/${wordId}/level`, { isCorrect });
    },
    // Không invalidate queries sau khi cập nhật cấp độ để tránh vòng lặp vô tận
    onError: (error) => {
      console.error('Failed to update word level:', error);
    }
  });
  
  // Handle navigation
  const handleNext = () => {
    if (!Array.isArray(words) || words.length === 0) return;
    
    // Calculate next index
    const nextIndex = currentIndex + 1;
    
    // Check if we've reached the end
    if (nextIndex >= totalWords) {
      // Redirect to home page when study session is complete
      toast({
        title: "Congratulations!",
        description: "You have completed the study session.",
        duration: 3000,
      });
      
      // Navigate to home page directly, giống như cách trong SlideshowMode
      navigate('/');
      return;
    }
    
    // If not at the end, move to the next word
    setCurrentIndex(nextIndex);
  };
  
  // Cache lưu trữ từ đã được trả lời trong phiên hiện tại
  const answeredWordsRef = useRef<Set<number>>(new Set());
  
  // Reset cache answeredWordsRef khi component được mount
  useEffect(() => {
    answeredWordsRef.current.clear();
  }, []);
  
  // Cập nhật lastStudyDate khi người dùng đã học (đánh dấu phiên học đầu tiên đã qua)
  useEffect(() => {
    if (isFirstSession && words.length > 0 && markedAsStudiedRef.current.size > 0) {
      // Người dùng đã bắt đầu học trong phiên đầu tiên, đánh dấu là đã học hôm nay
      const today = new Date().toLocaleDateString();
      localStorage.setItem('lastStudyDate', today);
      setIsFirstSession(false);
    }
  }, [isFirstSession, words.length, markedAsStudiedRef.current.size]);
  
  const handleCorrectAnswer = (wordId: number, isCorrect: boolean) => {
    // Kiểm tra trước nếu words không phải là array hoặc trống
    if (!Array.isArray(words) || words.length === 0) {
      console.log('Words array is empty or not valid, skipping handleCorrectAnswer');
      return;
    }
    
    // Kiểm tra xem:
    // 1. Từ đã được học trong ngày (studiedToday = true) - không cập nhật cấp độ
    // 2. Từ đã được trả lời trong phiên hiện tại - không cập nhật cấp độ
    const currentWord = words.find((word) => word && word.id === wordId);
    
    if (!currentWord) {
      console.log(`Word with ID ${wordId} not found in the current words array`);
      return;
    }
    
    // Nếu từ đã được trả lời trong phiên hiện tại, bỏ qua
    if (answeredWordsRef.current.has(wordId)) {
      console.log(`Word ${wordId} already answered in this session, skipping level update`);
      return;
    }
    
    // Nếu từ đã được học trong ngày, bỏ qua cập nhật cấp độ
    if (currentWord.studiedToday) {
      console.log(`Word ${wordId} already studied today, skipping level update`);
      return;
    }
    
    // Đánh dấu từ đã được trả lời trong phiên hiện tại
    answeredWordsRef.current.add(wordId);
    
    // Cập nhật cấp độ từ dựa trên việc trả lời đúng hay sai
    console.log(`Updating level for word ${wordId}, isCorrect: ${isCorrect}`);
    updateWordLevelMutation.mutate({ wordId, isCorrect });
  };
  
  // When a new word is loaded, mark it as studied (only once)
  useEffect(() => {
    if (!Array.isArray(words) || words.length === 0 || currentIndex >= words.length) {
      return;
    }
    
    const currentWord = words[currentIndex];
    if (!currentWord || !currentWord.id) {
      return;
    }
    
    // Chỉ đánh dấu từ là đã học nếu:
    // 1. Từ đó không có studiedToday = true
    // 2. Từ đó chưa được đánh dấu trong cache local
    if (!currentWord.studiedToday && !markedAsStudiedRef.current.has(currentWord.id)) {
      markWordStudiedMutation.mutate(currentWord.id);
    }
  }, [currentIndex, words]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <motion.main 
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className="flex-grow container mx-auto px-4 py-6"
      >
        {/* Group Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-heading font-bold">{groupName}</h2>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
            <span>Progress: {learnedWords}/{totalWords} words</span>
            <span className="mx-2">•</span>
            <span>Word Input Mode</span>
          </div>
        </div>
        
        {/* Flashcard Input */}
        {wordsQuery.isLoading ? (
          <div className="w-full aspect-[4/3] md:aspect-[16/9] mb-6">
            <Skeleton className="w-full h-full rounded-xl" />
          </div>
        ) : wordsQuery.isError ? (
          <div className="w-full aspect-[4/3] md:aspect-[16/9] mb-6 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
            <div className="text-center p-6">
              <p className="text-red-500 mb-2">Error loading vocabulary words</p>
              <button 
                onClick={() => wordsQuery.refetch()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : words.length === 0 ? (
          <div className="w-full aspect-[4/3] md:aspect-[16/9] mb-6 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
            <div className="text-center p-6">
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No vocabulary words in this group yet
              </p>
              <button 
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : currentIndex < words.length && words[currentIndex] ? (
          <FlashcardInput
            word={words[currentIndex]}
            onNext={handleNext}
            onCorrectAnswer={handleCorrectAnswer}
            currentIndex={currentIndex}
            totalWords={totalWords}
          />
        ) : (
          <div className="w-full aspect-[4/3] md:aspect-[16/9] mb-6 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
            <div className="text-center p-6">
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Loading word data...
              </p>
              <button 
                onClick={() => wordsQuery.refetch()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Reload
              </button>
            </div>
          </div>
        )}
      </motion.main>
    </div>
  );
}
