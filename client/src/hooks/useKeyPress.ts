import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

export default function useKeyPress(
  targetKey: string | string[],
  handler: KeyHandler,
  deps: any[] = []
) {
  const keys = Array.isArray(targetKey) ? targetKey : [targetKey];
  
  const downHandler = useCallback(
    (event: KeyboardEvent) => {
      if (keys.includes(event.key)) {
        handler(event);
      }
    },
    [keys, handler, ...deps]
  );

  useEffect(() => {
    window.addEventListener('keydown', downHandler);
    
    return () => {
      window.removeEventListener('keydown', downHandler);
    };
  }, [downHandler]);
}
