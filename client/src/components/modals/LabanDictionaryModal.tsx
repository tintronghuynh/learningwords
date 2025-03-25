import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface LabanDictionaryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LabanDictionaryModal({ open, onClose }: LabanDictionaryModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);

  // Theo dõi kích thước màn hình
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    // Hàm cập nhật kích thước màn hình
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Đăng ký event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Xử lý sự kiện iframe đã tải xong
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Tính toán kích thước tương đối
  const getDialogSize = () => {
    const width = Math.min(windowSize.width - 40, 1000); // Tối đa 1000px, tối thiểu kém 40px so với cửa sổ
    const height = Math.min(windowSize.height * 0.9, 900); // 90% chiều cao cửa sổ, tối đa 900px
    
    return {
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  const dialogSize = getDialogSize();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 overflow-hidden border-2 border-blue-200 dark:border-blue-800 shadow-lg rounded-xl"
        style={{
          maxWidth: dialogSize.width, 
          width: '95vw',
          height: '90vh', 
          maxHeight: dialogSize.height,
          margin: '0px',
          padding: '0px'
        }}
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center">
              <span className="material-icons mr-2">search</span> 
              Từ điển Laban
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tra cứu từ vựng tiếng Anh - Việt
            </DialogDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="material-icons">close</span>
          </Button>
        </div>
        
        <div className="relative flex-1 w-full overflow-hidden" style={{ height: `calc(${dialogSize.height} - 80px)` }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-gray-600 dark:text-gray-300">Đang tải từ điển...</p>
              </div>
            </div>
          )}
          
          <iframe 
            ref={iframeRef}
            src="https://dict.laban.vn/"
            className="w-full border-0"
            style={{ 
              height: '100%',
              minHeight: '600px',
              backgroundColor: 'white',
              display: 'block', 
              width: '100%',
              border: 'none',
              overflow: 'auto'
            }}
            title="Laban Dictionary"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            onLoad={handleIframeLoad}
            frameBorder="0"
            scrolling="yes"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}