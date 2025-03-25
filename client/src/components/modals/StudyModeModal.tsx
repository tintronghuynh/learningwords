import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StudyModeModalProps {
  groupId: number;
  onClose: () => void;
}

export default function StudyModeModal({ groupId, onClose }: StudyModeModalProps) {
  const [, navigate] = useLocation();
  
  const handleSelectMode = (mode: 'slideshow' | 'input') => {
    navigate(`/study/${mode}/${groupId}`);
    onClose();
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Study Mode</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center p-6 h-auto border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            onClick={() => handleSelectMode('slideshow')}
          >
            <span className="material-icons text-4xl mb-3 text-primary-500">slideshow</span>
            <h4 className="font-heading font-semibold">Slideshow Mode</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">Review with flashcards</p>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center p-6 h-auto border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            onClick={() => handleSelectMode('input')}
          >
            <span className="material-icons text-4xl mb-3 text-primary-500">edit</span>
            <h4 className="font-heading font-semibold">Word Input Mode</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">Practice by typing answers</p>
          </Button>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
