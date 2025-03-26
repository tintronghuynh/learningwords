import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAppContext } from '@/providers/AppProvider';

interface FontSizeModalProps {
  onClose: () => void;
}

export default function FontSizeModal({ onClose }: FontSizeModalProps) {
  const { fontSize, setFontSize } = useAppContext();
  const [tempFontSize, setTempFontSize] = useState(fontSize);
  
  // Reset temporary font size when modal opens
  useEffect(() => {
    setTempFontSize(fontSize);
  }, [fontSize]);
  
  const handleApply = () => {
    setFontSize(tempFontSize);
    onClose();
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Text Size</DialogTitle>
        </DialogHeader>
        
        <div className="mb-6">
          <label htmlFor="fontSizeRange" className="block text-gray-700 dark:text-gray-300 mb-3">
            Text Size
          </label>
          <div className="flex items-center">
            <span className="material-icons text-gray-500">text_format</span>
            <Slider
              id="fontSizeRange"
              min={80}
              max={120}
              step={5}
              value={[tempFontSize]}
              onValueChange={(value) => setTempFontSize(value[0])}
              className="mx-4 w-full"
            />
            <span className="material-icons text-gray-500 text-2xl">text_format</span>
          </div>
          <div className="text-center mt-3">
            <span className="text-gray-600 dark:text-gray-400">{tempFontSize}%</span>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
