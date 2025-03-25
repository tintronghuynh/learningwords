import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from './ui/button';
import FontSizeModal from './modals/FontSizeModal';
import LabanDictionaryModal from './modals/LabanDictionaryModal';
import { useAppContext } from '@/providers/AppProvider';
import { YouTubeMusic } from './YouTubeMusic';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Slider } from "./ui/slider";
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "./ui/sheet";

export default function Header() {
  const [, navigate] = useLocation();
  const { darkMode, toggleDarkMode } = useAppContext();
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const { volume, changeVolume, speak } = useSpeechSynthesis();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Hàm xử lý khi thay đổi âm lượng
  const handleVolumeChange = (values: number[]) => {
    changeVolume(values[0]);
    
    // Phát âm thanh ví dụ khi thay đổi âm lượng để người dùng nghe thử
    if (values[0] > 0) {
      speak("Volume test");
    }
  };
  
  // Component cho thanh điều khiển
  const ControlButtons = () => (
    <>
      {/* Speech Volume Control */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="Điều chỉnh âm lượng đọc từ"
          >
            <span className="material-icons">
              {volume === 0 
                ? "volume_off" 
                : volume < 0.3 
                  ? "volume_mute" 
                  : volume < 0.7 
                    ? "volume_down" 
                    : "volume_up"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-center">Âm lượng đọc từ</h4>
            <div className="flex items-center space-x-3">
              <span className="material-icons text-gray-400 text-sm">volume_mute</span>
              <Slider
                defaultValue={[volume]}
                max={1}
                step={0.01}
                value={[volume]}
                onValueChange={handleVolumeChange}
              />
              <span className="material-icons text-gray-400 text-sm">volume_up</span>
            </div>
            <div className="text-center text-xs text-gray-500">
              {Math.round(volume * 100)}%
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowDictionaryModal(true)}
        title="Tra từ điển Laban"
      >
        <span className="material-icons text-blue-500">search</span>
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowFontSizeModal(true)}
        title="Điều chỉnh cỡ chữ"
      >
        <span className="material-icons">format_size</span>
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      >
        <span className="material-icons dark:hidden">dark_mode</span>
        <span className="material-icons hidden dark:inline">light_mode</span>
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        title="Về trang chủ"
      >
        <span className="material-icons">home</span>
      </Button>
    </>
  );
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center space-x-2 cursor-pointer">
            <span className="material-icons text-primary-500">school</span>
            <h1 className="font-heading font-bold text-xl">VocabMaster</h1>
          </div>
        </Link>
        
        {/* Desktop Controls */}
        {!isMobile && (
          <div className="flex items-center space-x-3">
            {/* Music Player Controls */}
            <div className="mr-3 border-r pr-3 border-gray-200 dark:border-gray-700">
              <YouTubeMusic />
            </div>
            <ControlButtons />
          </div>
        )}
        
        {/* Mobile Controls with Hamburger menu */}
        {isMobile && (
          <div className="flex items-center space-x-2">
            {/* Minimal Music Player */}
            <div className="pr-2">
              <YouTubeMusic />
            </div>
            
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1">
                  <span className="material-icons">menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px] sm:w-[280px] p-0">
                <div className="px-4 py-6 h-full flex flex-col">
                  <h2 className="text-lg font-bold mb-4 pb-2 border-b">Menu</h2>
                  <div className="flex flex-col space-y-2 flex-grow">
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => {
                        navigate('/');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <span className="material-icons mr-2">home</span>
                      Trang chủ
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => {
                        setShowDictionaryModal(true);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <span className="material-icons mr-2 text-blue-500">search</span>
                      Từ điển Laban
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => {
                        setShowFontSizeModal(true);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <span className="material-icons mr-2">format_size</span>
                      Cỡ chữ
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => {
                        toggleDarkMode();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <span className="material-icons mr-2 dark:hidden">dark_mode</span>
                      <span className="material-icons mr-2 hidden dark:inline">light_mode</span>
                      {darkMode ? "Chế độ sáng" : "Chế độ tối"}
                    </Button>
                  </div>
                  <div className="pt-4 mt-auto">
                    <h3 className="text-sm font-medium mb-2">Âm lượng đọc từ</h3>
                    <div className="flex items-center space-x-3">
                      <span className="material-icons text-gray-400 text-sm">volume_mute</span>
                      <Slider
                        defaultValue={[volume]}
                        max={1}
                        step={0.01}
                        value={[volume]}
                        onValueChange={handleVolumeChange}
                      />
                      <span className="material-icons text-gray-400 text-sm">volume_up</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(volume * 100)}%
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
      
      {showFontSizeModal && (
        <FontSizeModal onClose={() => setShowFontSizeModal(false)} />
      )}
      
      {showDictionaryModal && (
        <LabanDictionaryModal
          open={showDictionaryModal}
          onClose={() => setShowDictionaryModal(false)}
        />
      )}
    </header>
  );
}
