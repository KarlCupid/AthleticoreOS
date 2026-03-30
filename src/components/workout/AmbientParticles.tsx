import React, { useEffect, useMemo } from 'react';
import { Circle } from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { TIMER_COLORS } from '../../theme/theme';

interface ParticleConfig {
  id: number;
  x: number;
  startY: number;
  driftY: number;
  swayX: number;
  radius: number;
  opacity: number;
  duration: number;
}

interface SingleParticleProps {
  p: ParticleConfig;
  urgency: SharedValue<number>;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/** Individual particle — each has its own animation hook, safely isolated. */
function SingleParticle({ p, urgency }: SingleParticleProps) {
  const progress = useSharedValue(seededRandom(p.id * 31)); // stagger start position

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: p.duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const cy = useDerivedValue(
    () => p.startY - progress.value * p.driftY,
  );
  const cx = useDerivedValue(
    () => p.x + Math.sin(progress.value * Math.PI * 2) * p.swayX,
  );
  const color = useDerivedValue(() =>
    interpolateColor(
      urgency.value,
      [0, 1],
      [TIMER_COLORS.particle, 'rgba(220, 38, 38, 0.22)'],
    ),
  );

  return (
    <Circle cx={cx} cy={cy} r={p.radius} color={color} opacity={p.opacity} />
  );
}

interface AmbientParticlesProps {
  canvasSize: number;
  urgency: SharedValue<number>;
}

const PARTICLE_COUNT = 14;

/**
 * Floating ambient particles rendered inside a parent Skia Canvas.
 * Each particle drifts upward with slight horizontal sway.
 * Color shifts from mint → red as urgency increases (0→1).
 */
export function AmbientParticles({ canvasSize, urgency }: AmbientParticlesProps) {
  const particles = useMemo<ParticleConfig[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id:       i,
      x:        seededRandom(i * 7)  * canvasSize,
      startY:   (0.4 + seededRandom(i * 13) * 0.6) * canvasSize,
      driftY:   80 + seededRandom(i * 3) * 70,
      swayX:    (seededRandom(i * 11) - 0.5) * 30,
      radius:   1.5 + seededRandom(i * 5) * 1.5,
      opacity:  0.15 + seededRandom(i * 17) * 0.18,
      duration: 6000 + seededRandom(i * 19) * 4000,
    })),
  [canvasSize]);

  return (
    <>
      {particles.map((p) => (
        <SingleParticle key={p.id} p={p} urgency={urgency} />
      ))}
    </>
  );
}
