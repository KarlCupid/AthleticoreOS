import React, { memo, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View, Platform, AppState } from 'react-native';
import {
  Canvas,
  Circle,
  Blur,
  Rect,
} from '@shopify/react-native-skia';
import {
  default as Animated,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
  interpolateColor,
  cancelAnimation,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useInteractionMode } from '../context/InteractionModeContext';
import { APP_CHROME, COLORS } from '../theme/theme';

export type AuroraBackgroundMood = 'calm' | 'energy' | 'hero';

interface AuroraBackgroundProps {
  color1?: string;
  color2?: string;
  color3?: string;
  baseColor?: string;
  mood?: AuroraBackgroundMood;
}

const DASHBOARD_AURORA = {
  base: APP_CHROME.background,
  carbon: '#111111',
  graphite: '#171717',
  warmShadow: '#151109',
  bronze: COLORS.chart.fatigue,
  antiqueGold: COLORS.readiness.caution,
  gold: APP_CHROME.accent,
  pearl: APP_CHROME.text,
  steel: COLORS.chart.water,
} as const;

const METALLIC_FLOW_BASE = DASHBOARD_AURORA.base;
const PALETTE = [
  DASHBOARD_AURORA.base,
  DASHBOARD_AURORA.carbon,
  DASHBOARD_AURORA.bronze,
  DASHBOARD_AURORA.antiqueGold,
  DASHBOARD_AURORA.gold,
  DASHBOARD_AURORA.steel,
  DASHBOARD_AURORA.pearl,
  DASHBOARD_AURORA.graphite,
  DASHBOARD_AURORA.base,
] as const;
const PALETTE_STOPS = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.86, 1] as const;

const MOOD_CONFIG = {
  calm: {
    duration: 46000,
    marbleOpacity: 0.3,
    goldOpacity: 0.34,
    antiqueOpacity: 0.08,
    pearlOpacity: 0.15,
    steelOpacity: 0.08,
    glossOpacity: 0.18,
    overlay: 'rgba(10, 10, 10, 0.5)',
    ribbonScale: 0.92,
  },
  energy: {
    duration: 30000,
    marbleOpacity: 0.36,
    goldOpacity: 0.44,
    antiqueOpacity: 0.11,
    pearlOpacity: 0.2,
    steelOpacity: 0.1,
    glossOpacity: 0.25,
    overlay: 'rgba(10, 10, 10, 0.43)',
    ribbonScale: 1,
  },
  hero: {
    duration: 32000,
    marbleOpacity: 0.42,
    goldOpacity: 0.5,
    antiqueOpacity: 0.14,
    pearlOpacity: 0.24,
    steelOpacity: 0.12,
    glossOpacity: 0.3,
    overlay: 'rgba(10, 10, 10, 0.36)',
    ribbonScale: 1.06,
  },
} as const;

export const AuroraBackground = memo(function AuroraBackground(props: AuroraBackgroundProps) {
  const { mode } = useInteractionMode();
  const resolvedMood = mode === 'gym-floor' || mode === 'focus' ? 'energy' : props.mood ?? 'calm';

  if (Platform.OS === 'web') {
    return <AuroraBackgroundWeb {...props} mood={resolvedMood} />;
  }

  return <AuroraBackgroundNative {...props} mood={resolvedMood} />;
});

function AuroraBackgroundWeb({ baseColor = METALLIC_FLOW_BASE, mood = 'calm' }: AuroraBackgroundProps) {
  const config = MOOD_CONFIG[mood];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <ExpoLinearGradient
        colors={[baseColor, DASHBOARD_AURORA.warmShadow, DASHBOARD_AURORA.graphite, baseColor]}
        locations={[0, 0.34, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ExpoLinearGradient
        colors={['rgba(245, 245, 240, 0.18)', 'rgba(212, 175, 55, 0.08)', 'rgba(10, 10, 10, 0.16)', 'rgba(10, 10, 10, 0.56)']}
        locations={[0, 0.22, 0.62, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.86, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { opacity: config.glossOpacity + 0.12 }]}
      />
      <ExpoLinearGradient
        colors={['rgba(245, 245, 240, 0)', 'rgba(245, 245, 240, 0.34)', 'rgba(184, 137, 45, 0.12)', 'rgba(245, 245, 240, 0)']}
        locations={[0, 0.34, 0.58, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.webPearlWash, { opacity: config.pearlOpacity + 0.1 }]}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: config.overlay }]} />
      <ExpoLinearGradient
        colors={['rgba(212, 175, 55, 0)', 'rgba(245, 245, 240, 0.68)', 'rgba(212, 175, 55, 0.92)', 'rgba(140, 106, 30, 0.32)', 'rgba(212, 175, 55, 0)']}
        locations={[0, 0.36, 0.52, 0.68, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.webRibbon, styles.webRibbonOne, { opacity: config.goldOpacity }]}
      />
      <ExpoLinearGradient
        colors={['rgba(184, 137, 45, 0)', 'rgba(184, 137, 45, 0.5)', 'rgba(184, 192, 194, 0.16)', 'rgba(140, 106, 30, 0)']}
        locations={[0, 0.42, 0.62, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.webRibbon, styles.webRibbonTwo, { opacity: config.antiqueOpacity + 0.08 }]}
      />
      <ExpoLinearGradient
        colors={['rgba(245, 245, 240, 0)', 'rgba(245, 245, 240, 0.78)', 'rgba(212, 175, 55, 0.26)', 'rgba(245, 245, 240, 0)']}
        locations={[0, 0.48, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.webVein, { opacity: config.pearlOpacity + 0.12 }]}
      />
      <ExpoLinearGradient
        colors={['rgba(184, 192, 194, 0)', 'rgba(184, 192, 194, 0.34)', 'rgba(245, 245, 240, 0.12)', 'rgba(184, 192, 194, 0)']}
        locations={[0, 0.48, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.webSteelSheen, { opacity: config.steelOpacity + 0.08 }]}
      />
      <ExpoLinearGradient
        colors={['rgba(10, 10, 10, 0.26)', 'rgba(10, 10, 10, 0)', 'rgba(10, 10, 10, 0.62)']}
        locations={[0, 0.46, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

function AuroraBackgroundNative({
  color1: propColor1,
  color2: propColor2,
  color3: propColor3,
  baseColor = METALLIC_FLOW_BASE,
  mood = 'calm',
}: AuroraBackgroundProps) {
  const config = MOOD_CONFIG[mood];
  const dimensions = useWindowDimensions();
  const width = dimensions.width || 375;
  const height = dimensions.height || 812;
  const time = useSharedValue(0);

  useEffect(() => {
    const startAnimation = () => {
      time.value = withRepeat(withTiming(1, { duration: config.duration, easing: Easing.linear }), -1, false);
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        startAnimation();
      } else {
        cancelAnimation(time);
      }
    });

    startAnimation();

    return () => {
      subscription.remove();
      cancelAnimation(time);
    };
  }, [config.duration, time]);

  const derivedColor1 = useSmoothColor(time, 0.05);
  const derivedColor2 = useSmoothColor(time, 0.28);
  const derivedColor3 = useSmoothColor(time, 0.5);
  const derivedColor4 = useSmoothColor(time, 0.7);

  const blob1 = useDerivedValue(() => ({
    x: width * 0.5 + Math.sin(time.value * Math.PI * 2) * (width * 0.4),
    y: height * 0.3 + Math.cos(time.value * Math.PI * 1.5) * (height * 0.2),
    r: width * (0.8 + Math.sin(time.value * Math.PI * 2) * 0.15),
  }));
  const blob2 = useDerivedValue(() => ({
    x: width * 0.5 + Math.cos(time.value * Math.PI * 1.8) * (width * 0.4),
    y: height * 0.8 + Math.sin(time.value * Math.PI * 2.2) * (height * 0.15),
    r: width * (0.9 + Math.cos(time.value * Math.PI * 1.2) * 0.1),
  }));
  const blob3 = useDerivedValue(() => ({
    x: width * 0.5 + Math.sin(time.value * Math.PI * 3.1) * (width * 0.2),
    y: height * 0.5 + Math.cos(time.value * Math.PI * 2.5) * (height * 0.15),
    r: width * (0.75 + Math.sin(time.value * Math.PI * 4) * 0.1),
  }));
  const blob4 = useDerivedValue(() => ({
    x: width * (0.5 + Math.sin(time.value * Math.PI * 0.8) * 0.4),
    y: height * (0.4 + Math.cos(time.value * Math.PI * 0.6) * 0.2),
    r: width * 1.2,
  }));
  const blob1x = useDerivedValue(() => blob1.value.x);
  const blob1y = useDerivedValue(() => blob1.value.y);
  const blob1r = useDerivedValue(() => blob1.value.r);
  const blob2x = useDerivedValue(() => blob2.value.x);
  const blob2y = useDerivedValue(() => blob2.value.y);
  const blob2r = useDerivedValue(() => blob2.value.r);
  const blob3x = useDerivedValue(() => blob3.value.x);
  const blob3y = useDerivedValue(() => blob3.value.y);
  const blob3r = useDerivedValue(() => blob3.value.r);
  const blob4x = useDerivedValue(() => blob4.value.x);
  const blob4y = useDerivedValue(() => blob4.value.y);
  const blob4r = useDerivedValue(() => blob4.value.r);

  const blurSigma = Math.min(width, height) * 0.18;

  const goldRibbonStyle = useAnimatedStyle(() => {
    const t = time.value * Math.PI * 2;
    return {
      opacity: config.goldOpacity + Math.sin(t * 1.15) * 0.035,
      transform: [
        { translateX: Math.sin(t) * width * 0.08 },
        { translateY: Math.cos(t * 0.8) * height * 0.025 },
        { rotate: '-18deg' },
        { scale: config.ribbonScale + Math.sin(t * 0.7) * 0.025 },
      ],
    };
  }, [config.goldOpacity, config.ribbonScale, height, width]);

  const antiqueRibbonStyle = useAnimatedStyle(() => {
    const t = time.value * Math.PI * 2;
    return {
      opacity: config.antiqueOpacity + Math.cos(t * 0.95) * 0.025,
      transform: [
        { translateX: Math.cos(t * 0.76) * width * 0.07 },
        { translateY: Math.sin(t * 1.05) * height * 0.03 },
        { rotate: '16deg' },
        { scale: config.ribbonScale + Math.cos(t * 0.66) * 0.02 },
      ],
    };
  }, [config.antiqueOpacity, config.ribbonScale, height, width]);

  const pearlVeinStyle = useAnimatedStyle(() => {
    const t = time.value * Math.PI * 2;
    return {
      opacity: config.pearlOpacity + Math.sin(t * 1.8) * 0.04,
      transform: [
        { translateX: Math.sin(t * 1.35) * width * 0.1 },
        { translateY: Math.cos(t) * height * 0.018 },
        { rotate: '-13deg' },
      ],
    };
  }, [config.pearlOpacity, height, width]);

  const glossSweepStyle = useAnimatedStyle(() => {
    const t = time.value * Math.PI * 2;
    return {
      opacity: config.glossOpacity + Math.sin(t * 1.1) * 0.04,
      transform: [
        { translateX: Math.sin(t * 0.72) * width * 0.13 },
        { translateY: Math.cos(t * 0.86) * height * 0.02 },
        { rotate: '-21deg' },
        { scale: config.ribbonScale + Math.sin(t * 0.42) * 0.018 },
      ],
    };
  }, [config.glossOpacity, config.ribbonScale, height, width]);

  const steelSheenStyle = useAnimatedStyle(() => {
    const t = time.value * Math.PI * 2;
    return {
      opacity: config.steelOpacity + Math.cos(t * 1.3) * 0.025,
      transform: [
        { translateX: Math.cos(t * 0.68) * width * 0.08 },
        { translateY: Math.sin(t * 0.9) * height * 0.018 },
        { rotate: '11deg' },
      ],
    };
  }, [config.steelOpacity, height, width]);

  const secondGoldVeinStyle = useAnimatedStyle(() => {
    const t = time.value * Math.PI * 2;
    return {
      opacity: config.goldOpacity * 0.72 + Math.cos(t * 1.4) * 0.03,
      transform: [
        { translateX: Math.cos(t * 0.92) * width * 0.12 },
        { translateY: Math.sin(t * 0.7) * height * 0.035 },
        { rotate: '23deg' },
        { scale: config.ribbonScale + Math.sin(t * 0.54) * 0.018 },
      ],
    };
  }, [config.goldOpacity, config.ribbonScale, height, width]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFillObject}>
        <Rect x={0} y={0} width={width} height={height} color={baseColor} />

        <Circle cx={blob4x} cy={blob4y} r={blob4r} color={derivedColor4} opacity={config.marbleOpacity}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob1x} cy={blob1y} r={blob1r} color={propColor1 ?? derivedColor1} opacity={config.marbleOpacity}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob2x} cy={blob2y} r={blob2r} color={propColor2 ?? derivedColor2} opacity={config.marbleOpacity * 0.86}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob3x} cy={blob3y} r={blob3r} color={propColor3 ?? derivedColor3} opacity={config.marbleOpacity * 0.95}>
          <Blur blur={blurSigma} />
        </Circle>

        <Rect x={0} y={0} width={width} height={height} color={config.overlay} />
      </Canvas>
      <ExpoLinearGradient
        colors={['rgba(245, 245, 240, 0.12)', 'rgba(212, 175, 55, 0.06)', 'rgba(10, 10, 10, 0.24)', 'rgba(10, 10, 10, 0.52)']}
        locations={[0, 0.2, 0.62, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { opacity: config.glossOpacity }]}
      />
      <Animated.View style={[styles.nativePearlWash, { top: height * 0.05 }, pearlVeinStyle]}>
        <ExpoLinearGradient
          colors={['rgba(245, 245, 240, 0)', 'rgba(245, 245, 240, 0.36)', 'rgba(184, 137, 45, 0.12)', 'rgba(245, 245, 240, 0)']}
          locations={[0, 0.34, 0.58, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.nativeRibbonShadow, styles.nativeRibbonAntique, antiqueRibbonStyle]}>
        <ExpoLinearGradient
          colors={['rgba(140, 106, 30, 0)', 'rgba(184, 137, 45, 0.44)', 'rgba(184, 192, 194, 0.12)', 'rgba(140, 106, 30, 0)']}
          locations={[0, 0.44, 0.64, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.nativeSpecularSweep, { top: height * 0.19 }, glossSweepStyle]}>
        <ExpoLinearGradient
          colors={['rgba(245, 245, 240, 0)', 'rgba(245, 245, 240, 0.82)', 'rgba(212, 175, 55, 0.38)', 'rgba(245, 245, 240, 0)']}
          locations={[0, 0.5, 0.6, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.nativeGoldVein, styles.nativeGoldVeinPrimary, goldRibbonStyle]}>
        <ExpoLinearGradient
          colors={['rgba(212, 175, 55, 0)', 'rgba(245, 245, 240, 0.62)', 'rgba(212, 175, 55, 0.92)', 'rgba(140, 106, 30, 0.32)', 'rgba(212, 175, 55, 0)']}
          locations={[0, 0.36, 0.52, 0.68, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.nativeGoldVein, styles.nativeGoldVeinSecondary, secondGoldVeinStyle]}>
        <ExpoLinearGradient
          colors={['rgba(212, 175, 55, 0)', 'rgba(212, 175, 55, 0.78)', 'rgba(245, 245, 240, 0.5)', 'rgba(140, 106, 30, 0.2)', 'rgba(212, 175, 55, 0)']}
          locations={[0, 0.4, 0.56, 0.68, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.nativeRibbonHighlight, { top: height * 0.34 }, pearlVeinStyle]}>
        <ExpoLinearGradient
          colors={['rgba(245, 245, 240, 0)', 'rgba(245, 245, 240, 0.78)', 'rgba(212, 175, 55, 0.22)', 'rgba(245, 245, 240, 0)']}
          locations={[0, 0.5, 0.62, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.nativeSteelSheen, { top: height * 0.72 }, steelSheenStyle]}>
        <ExpoLinearGradient
          colors={['rgba(184, 192, 194, 0)', 'rgba(184, 192, 194, 0.34)', 'rgba(245, 245, 240, 0.12)', 'rgba(184, 192, 194, 0)']}
          locations={[0, 0.48, 0.6, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <ExpoLinearGradient
        colors={['rgba(10, 10, 10, 0.24)', 'rgba(10, 10, 10, 0)', 'rgba(10, 10, 10, 0.6)']}
        locations={[0, 0.48, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

function useSmoothColor(time: ReturnType<typeof useSharedValue<number>>, offset: number) {
  return useDerivedValue(() => {
    const progress = (time.value + offset) % 1;
    return interpolateColor(progress, PALETTE_STOPS as unknown as number[], PALETTE as unknown as string[]);
  });
}

const styles = StyleSheet.create({
  webRibbon: {
    position: 'absolute',
    width: '150%',
    height: 80,
    left: '-22%',
    borderRadius: 999,
    transform: [{ rotate: '-18deg' }],
  },
  webPearlWash: {
    position: 'absolute',
    width: '110%',
    height: '58%',
    top: '5%',
    left: '-8%',
    borderRadius: 999,
    transform: [{ rotate: '-16deg' }],
    overflow: 'hidden',
  },
  webRibbonOne: {
    top: '28%',
  },
  webRibbonTwo: {
    top: '54%',
    transform: [{ rotate: '17deg' }],
  },
  webVein: {
    position: 'absolute',
    top: '38%',
    left: '-10%',
    width: '120%',
    height: 18,
    borderRadius: 999,
    transform: [{ rotate: '-13deg' }],
    overflow: 'hidden',
  },
  webSteelSheen: {
    position: 'absolute',
    top: '73%',
    left: '-10%',
    width: '120%',
    height: 14,
    borderRadius: 999,
    transform: [{ rotate: '11deg' }],
    overflow: 'hidden',
  },
  nativePearlWash: {
    position: 'absolute',
    width: '125%',
    height: '62%',
    left: '-16%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  nativeRibbonShadow: {
    position: 'absolute',
    width: '135%',
    height: 84,
    left: '-18%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  nativeRibbonAntique: {
    top: '48%',
  },
  nativeSpecularSweep: {
    position: 'absolute',
    width: '132%',
    height: 18,
    left: '-18%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  nativeGoldVein: {
    position: 'absolute',
    width: '146%',
    left: '-23%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  nativeGoldVeinPrimary: {
    top: '27%',
    height: 38,
  },
  nativeGoldVeinSecondary: {
    top: '58%',
    height: 26,
  },
  nativeRibbonHighlight: {
    position: 'absolute',
    width: '132%',
    height: 12,
    left: '-16%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  nativeSteelSheen: {
    position: 'absolute',
    width: '124%',
    height: 14,
    left: '-12%',
    borderRadius: 999,
    overflow: 'hidden',
  },
});
