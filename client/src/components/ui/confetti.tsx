import { useEffect, useRef } from 'react';

type ConfettiParticle = {
  color: string;
  x: number;
  y: number;
  velocity: {
    x: number;
    y: number;
  };
  size: number;
  angle: number;
  rotation: number;
  rotationSpeed: number;
};

interface ConfettiProps {
  active: boolean;
}

const colors = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C',
  '#3A86FF', '#8338EC', '#FF006E', '#FB5607', '#FFBE0B'
];

export function Confetti({ active }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const animationFrameRef = useRef<number>();
  
  // Create particles
  const createConfetti = () => {
    if (!canvasRef.current) return;
    
    const particles: ConfettiParticle[] = [];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Create 100 particles
    for (let i = 0; i < 100; i++) {
      particles.push({
        color: colors[Math.floor(Math.random() * colors.length)],
        x: canvas.width / 2,
        y: canvas.height / 2,
        velocity: {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 20 - 5
        },
        size: Math.random() * 10 + 4,
        angle: Math.random() * 360,
        rotation: 0,
        rotationSpeed: Math.random() * 0.2 - 0.1
      });
    }
    
    particlesRef.current = particles;
  };
  
  // Update canvas size
  const updateCanvasSize = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  
  // Animation loop
  const animate = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const particles = particlesRef.current;
    let stillAlive = false;
    
    for (const p of particles) {
      p.x += p.velocity.x;
      p.y += p.velocity.y;
      p.velocity.y += 0.1; // gravity
      p.rotation += p.rotationSpeed;
      
      if (p.y < canvas.height + 100) {
        stillAlive = true;
      }
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      
      // Draw confetti particle (rectangle)
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      
      ctx.restore();
    }
    
    if (stillAlive) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  };
  
  // Setup effect
  useEffect(() => {
    updateCanvasSize();
    
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Trigger confetti effect
  useEffect(() => {
    if (active) {
      createConfetti();
      animate();
      
      // Play success sound
      const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3?filename=success-1-6297.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play error:', err));
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [active]);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ display: active ? 'block' : 'none' }}
    />
  );
}
