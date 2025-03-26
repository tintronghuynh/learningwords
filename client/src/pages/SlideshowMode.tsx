import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { motion } from "framer-motion";
import { pageVariants } from '@/lib/motionHelpers';
import Header from '@/components/Header';
import FlashcardDisplay from '@/components/FlashcardDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SlideshowMode() {
  const { groupId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  
  // Get vocabulary group data
  const groupQuery = useQuery({
    queryKey: [`/api/groups/${groupId}`],
    retry: 1,
  });
  
  // Build query URL with level filter if selected
  const buildQueryURL = () => {
    let url = `/api/words/${groupId}`;
    
    // Xây dựng query string với các tham số
    const params = new URLSearchParams();
    
    // Nếu đã chọn cấp độ thì dùng tham số levels
    if (selectedLevel) {
      params.append('levels', selectedLevel.toString());
    } 
    // Nếu không, vẫn sử dụng mode=slideshow để đảm bảo tương thích ngược
    else {
      params.append('mode', 'slideshow');
    }
    
    // Thêm query string vào URL nếu có tham số
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  };
  
  // Get vocabulary words for this group with optional level filter
  const wordsQuery = useQuery({
    queryKey: [buildQueryURL()],
    retry: 1,
    staleTime: 0, // Đảm bảo luôn tải lại dữ liệu mới nhất
    refetchOnMount: 'always', // Luôn tải lại dữ liệu khi component được mount
    refetchOnWindowFocus: true // Tải lại khi cửa sổ được focus
  });
  
  // Reset current index when changing level filter
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedLevel]);
  
  // Khởi tạo biến words để sử dụng trong component
  const words: any[] = Array.isArray(wordsQuery.data) ? wordsQuery.data : [];
  
  // Get current group name
  let groupName = "Loading...";
  if (groupQuery.data && Array.isArray(groupQuery.data)) {
    const group = groupQuery.data.find((g: any) => g.id === parseInt(groupId || "0"));
    if (group) {
      groupName = group.name;
    }
  }
  const totalWords = words.length;
  const learnedWords = words.filter((word: any) => word.learned).length;
  
  // Handle navigation
  const handleNext = () => {
    if (words.length === 0) return;
    
    // Đã loại bỏ việc đánh dấu từ vựng đã học theo yêu cầu    
    
    // If this is the last word, navigate back to home
    if (currentIndex === totalWords - 1) {
      navigate('/');
      return;
    }
    
    // Otherwise move to the next word
    setCurrentIndex(prev => prev + 1);
  };
  
  const handlePrevious = () => {
    if (words.length === 0) return;
    
    // Move to the previous word or loop to the end
    setCurrentIndex((prev) => (prev - 1 + totalWords) % totalWords);
  };
  
  // Đã loại bỏ useEffect đánh dấu từ vựng đã học khi tải từ vựng mới
  // SlideshowMode không cần đánh dấu từ vựng đã học theo yêu cầu
  
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
            <span>Slideshow Mode</span>
          </div>
          
          {/* Level Filter Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="flex items-center mr-2">
              <span className="text-sm font-medium mr-2">Filter by level:</span>
            </div>
            <Button 
              variant={selectedLevel === null ? "default" : "outline"} 
              size="sm"
              onClick={() => setSelectedLevel(null)}
              className="px-3 py-1"
            >
              All Levels
            </Button>
            {[1, 2, 3, 4, 5].map(level => (
              <Button
                key={level}
                variant={selectedLevel === level ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLevel(level)}
                className="px-3 py-1"
              >
                Level {level}
                <Badge variant="secondary" className="ml-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                  {words.filter(word => word.level === level).length}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
        
        {/* Flashcard Display */}
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
                onClick={() => history.back()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <FlashcardDisplay
            word={words[currentIndex]}
            onNext={handleNext}
            onPrevious={handlePrevious}
            currentIndex={currentIndex}
            totalWords={totalWords}
          />
        )}
      </motion.main>
    </div>
  );
}
