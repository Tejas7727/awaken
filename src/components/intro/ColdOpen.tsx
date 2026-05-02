import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TowerSVG from './TowerSVG';
import LoginFrame from './LoginFrame';

type Phase = 'stars' | 'tower' | 'windows' | 'text' | 'transition' | 'login';

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 30 fixed star positions so layout is stable (no randomness at render)
const STARS = [
  [8,5],[15,12],[25,3],[35,8],[48,2],[55,15],[62,7],[72,4],[82,9],[90,2],
  [5,18],[18,22],[30,16],[42,20],[52,25],[63,18],[74,11],[85,19],[92,14],[97,7],
  [3,30],[12,35],[22,28],[38,32],[50,38],[67,30],[78,35],[88,28],[95,33],[99,22],
] as const;

export default function ColdOpen() {
  const [phase, setPhase] = useState<Phase>(() => {
    if (reducedMotion) return 'login';
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('awaken_intro_seen')) return 'login';
    return 'stars';
  });
  const [litFloors, setLitFloors] = useState<number[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => timersRef.current.forEach(clearTimeout);

  useEffect(() => {
    if (phase !== 'stars') return;

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('awaken_intro_seen', '1');
    }

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timersRef.current.push(t);
      return t;
    };

    schedule(() => setPhase('tower'), 400);
    schedule(() => setPhase('windows'), 1000);
    // Light floors 0–4 sequentially
    [0, 1, 2, 3, 4].forEach((floor, i) => {
      schedule(() => setLitFloors((prev) => [...prev, floor]), 1000 + i * 300);
    });
    schedule(() => setPhase('text'), 2000);
    schedule(() => setPhase('transition'), 3600);
    schedule(() => setPhase('login'), 4000);

    return clearTimers;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Long-press anywhere to replay (for demo purposes)
  useEffect(() => {
    let pressTimer: ReturnType<typeof setTimeout>;
    const start = () => { pressTimer = setTimeout(() => replay(), 800); };
    const end = () => clearTimeout(pressTimer);
    window.addEventListener('mousedown', start);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchstart', start);
    window.addEventListener('touchend', end);
    return () => {
      clearTimeout(pressTimer);
      window.removeEventListener('mousedown', start);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchend', end);
    };
  }, []);

  const replay = () => {
    clearTimers();
    timersRef.current = [];
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('awaken_intro_seen');
    setLitFloors([]);
    setPhase('stars');
  };

  const towerVisible = ['tower', 'windows', 'text', 'transition'].includes(phase);
  const textVisible = phase === 'text';
  const isTransitioning = phase === 'transition';
  const showLogin = phase === 'login';

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#07090E' }}
    >
      {/* Stars */}
      <AnimatePresence>
        {phase === 'stars' && (
          <motion.div
            key="stars"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {STARS.map(([x, y], i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: i % 3 === 0 ? 2 : 1,
                  height: i % 3 === 0 ? 2 : 1,
                  backgroundColor: `rgba(232,220,196,${0.2 + (i % 5) * 0.1})`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tower */}
      <AnimatePresence>
        {towerVisible && (
          <motion.div
            key="tower"
            className="absolute"
            style={{ width: 'min(52vw, 220px)', bottom: '15%' }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: isTransitioning ? 0.28 : 1,
              y: isTransitioning ? -80 : 0,
            }}
            exit={{ opacity: 0 }}
            transition={
              isTransitioning
                ? { duration: 0.5, ease: 'easeIn' }
                : { duration: 1.2, ease: 'easeOut' }
            }
          >
            <TowerSVG litFloors={litFloors} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The quote */}
      <AnimatePresence>
        {textVisible && (
          <motion.p
            key="quote"
            className="absolute text-center px-6 select-none"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontWeight: 500,
              fontSize: 22,
              letterSpacing: '0.15em',
              color: '#E8DCC4',
              top: '38%',
              maxWidth: 420,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            The Tower remembers everyone who climbs.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Login frame */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            key="login"
            className="relative z-10 w-full flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Faded Tower behind login */}
            <div
              className="absolute pointer-events-none"
              style={{ width: 'min(52vw, 200px)', bottom: '100%', opacity: 0.18, marginBottom: '-60px' }}
            >
              <TowerSVG litFloors={[0, 1, 2, 3, 4]} />
            </div>
            <LoginFrame />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
