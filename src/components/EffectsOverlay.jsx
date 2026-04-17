import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function Rain() {
  const drops = Array.from({ length: 60 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {drops.map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white/30 rounded-full will-change-transform"
          style={{
            width: Math.random() * 2 + 1 + 'px',
            height: Math.random() * 20 + 20 + 'px',
            left: Math.random() * 100 + '%',
            top: -50,
          }}
          animate={{
            y: ['0vh', '120vh'],
            opacity: [0, 0.5, 0]
          }}
          transition={{
            duration: Math.random() * 0.5 + 0.5,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  );
}

function Snow() {
  const flakes = Array.from({ length: 50 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {flakes.map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full blur-[1px] will-change-transform"
          style={{
            width: Math.random() * 6 + 2 + 'px',
            height: Math.random() * 6 + 2 + 'px',
            left: Math.random() * 100 + '%',
            top: -20,
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: Math.random() * 4 + 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  );
}

function Dust() {
  const motes = Array.from({ length: 40 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {motes.map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-orange-100/40 rounded-full blur-[2px] will-change-transform"
          style={{
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
          }}
          animate={{
            y: [0, Math.random() * -100 - 50],
            x: [0, Math.random() * 60 - 30],
            opacity: [0, Math.random() * 0.5 + 0.2, 0]
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: Math.random() * 10,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

function FloatingOrbs() {
  const orbs = Array.from({ length: 6 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen">
      {orbs.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl opacity-30 will-change-transform"
          style={{
            width: Math.random() * 300 + 200 + 'px',
            height: Math.random() * 300 + 200 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            backgroundColor: i % 2 === 0 ? '#4ade80' : '#818cf8',
          }}
          animate={{
            x: [0, Math.random() * 200 - 100, Math.random() * 200 - 100],
            y: [0, Math.random() * 200 - 100, Math.random() * 200 - 100],
            scale: [1, 1.2, 0.9, 1]
          }}
          transition={{
            duration: Math.random() * 20 + 20,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

function Fog() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-end">
      <motion.div
        className="w-[200%] h-1/2 bg-gradient-to-t from-white/20 via-white/5 to-transparent blur-2xl will-change-transform"
        animate={{
          x: ['0%', '-50%', '0%']
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </div>
  );
}

export default function EffectsOverlay({ effects = [] }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !effects || effects.length === 0) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {effects.includes('rain') && <Rain />}
      {effects.includes('snow') && <Snow />}
      {effects.includes('dust') && <Dust />}
      {effects.includes('floating_orbs') && <FloatingOrbs />}
      {effects.includes('fog') && <Fog />}
    </div>
  );
}
