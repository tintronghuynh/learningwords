import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface CardFlipProps extends React.HTMLAttributes<HTMLDivElement> {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  className?: string;
  aspectRatio?: string;
}

export function CardFlip({
  front,
  back,
  flipped = false,
  onFlip,
  className,
  aspectRatio = "aspect-[5/2]",
  ...props
}: CardFlipProps) {
  const [isFlipped, setIsFlipped] = useState(flipped);
  
  const handleClick = () => {
    const newFlippedState = !isFlipped;
    setIsFlipped(newFlippedState);
    onFlip?.(newFlippedState);
  };
  
  React.useEffect(() => {
    setIsFlipped(flipped);
  }, [flipped]);

  return (
    <div 
      className={cn(`relative w-full ${aspectRatio} cursor-pointer`, className)}
      onClick={handleClick}
      {...props}
    >
      <div className={cn(
        "w-full h-full transition-transform duration-500 transform-style-preserve-3d",
        isFlipped ? "rotate-y-180" : ""
      )}>
        {/* Front */}
        <Card className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 text-center">
          {front}
        </Card>
        
        {/* Back */}
        <Card className="absolute inset-0 backface-hidden rotate-y-180 p-6 overflow-y-auto">
          {back}
        </Card>
      </div>
    </div>
  );
}

// Add global styles to index.css
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  .transform-style-preserve-3d {
    transform-style: preserve-3d;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .backface-hidden {
    backface-visibility: hidden;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
`, styleSheet.cssRules.length);
