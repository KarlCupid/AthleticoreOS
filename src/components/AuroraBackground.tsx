import React, { useEffect, memo } from 'react';
import { StyleSheet, useWindowDimensions, View, Platform, AppState } from 'react-native';
import { Canvas, Circle, Blur, Rect } from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
  interpolateColor,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface AuroraBackgroundProps {
  color1?: string;
  color2?: string;
  color3?: string;
  baseColor?: string;
}

export const AuroraBackground = memo(function AuroraBackground({
  color1: propColor1,
  color2: propColor2,
  color3: propColor3,
  baseColor = '#3b429f', // Ocean Twilight Base
}: AuroraBackgroundProps) {
  const dimensions = useWindowDimensions();
  const width = dimensions.width || 375;
  const height = dimensions.height || 812;

  // Web Fallback: Render a beautiful static gradient if on web
  // to avoid Skia initialization crashes.
  if (Platform.OS === 'web') {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={[baseColor, '#aa7dce', '#3b429f', '#1a1c3d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View 
          style={[
            StyleSheet.absoluteFillObject, 
            { backgroundColor: 'rgba(59, 66, 159, 0.45)' }
          ]} 
        />
      </View>
    );
  }

  // INFINITE ENGINE: 0 -> 1 linear clock with NO reverse.
  // This prevents the "turn-around" jankiness of Easing.inOut.
  const time = useSharedValue(0);
  
  useEffect(() => {
    const startAnimation = () => {
      time.value = withRepeat(
        withTiming(1, { 
          duration: 15000, // Longer 15s cycle for grace
          easing: Easing.linear // Linear velocity means NO speed jumps or stops
        }),
        -1,
        false // Circular loop, no reverse
      );
    };

    const subscription = AppState.addEventListener('change', nextAppState => {
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
  }, []);

  // SEAMLESS CIRCULAR PALETTE
  // By adding the first color to the end, the 1 -> 0 jump becomes invisible.
  const PALETTE = [
    '#e3170a', // Burnt Tangerine
    '#e16036', // Spicy Paprika
    '#fcca46', // Golden Pollen
    '#3b429f', // Ocean Twilight
    '#aa7dce', // Bright Lavender
    '#e3170a', // Circular Fix: Loop back to Burnt Tangerine
  ];

  const getSmoothColor = (offset: number) => {
    return useDerivedValue(() => {
      // Circular interpolation logic
      const progress = (time.value + offset) % 1;
      return interpolateColor(
        progress,
        [0, 0.2, 0.4, 0.6, 0.8, 1],
        PALETTE
      );
    });
  };

  const c1 = propColor1 || getSmoothColor(0);
  const c2 = propColor2 || getSmoothColor(0.2);
  const c3 = propColor3 || getSmoothColor(0.4);
  const c4 = getSmoothColor(0.7);

  // ORGANIC DISPLACEMENT: Using Sin(Time * 2PI) ensures a perfect seamless join.
  // Each blob uses different frequencies so they don't form a recognizable pattern.
  const b1 = useDerivedValue(() => ({
    x: width * 0.5 + Math.sin(time.value * Math.PI * 2) * (width * 0.4),
    y: height * 0.3 + Math.cos(time.value * Math.PI * 1.5) * (height * 0.2),
    r: width * (0.8 + Math.sin(time.value * Math.PI * 2) * 0.15),
  }));

  const b2 = useDerivedValue(() => ({
    x: width * 0.5 + Math.cos(time.value * Math.PI * 1.8) * (width * 0.4),
    y: height * 0.8 + Math.sin(time.value * Math.PI * 2.2) * (height * 0.15),
    r: width * (0.9 + Math.cos(time.value * Math.PI * 1.2) * 0.1),
  }));

  const b3 = useDerivedValue(() => ({
    x: width * 0.5 + Math.sin(time.value * Math.PI * 3.1) * (width * 0.2),
    y: height * 0.5 + Math.cos(time.value * Math.PI * 2.5) * (height * 0.15),
    r: width * (0.75 + Math.sin(time.value * Math.PI * 4) * 0.1),
  }));

  const b4 = useDerivedValue(() => ({
    x: width * (0.5 + Math.sin(time.value * Math.PI * 0.8) * 0.4),
    y: height * (0.4 + Math.cos(time.value * Math.PI * 0.6) * 0.2),
    r: width * 1.2,
  }));

  // Pull derived values to top level to avoid hook-in-JSX violations and redundant creation
  const b1x = useDerivedValue(() => b1.value.x);
  const b1y = useDerivedValue(() => b1.value.y);
  const b1r = useDerivedValue(() => b1.value.r);

  const b2x = useDerivedValue(() => b2.value.x);
  const b2y = useDerivedValue(() => b2.value.y);
  const b2r = useDerivedValue(() => b2.value.r);

  const b3x = useDerivedValue(() => b3.value.x);
  const b3y = useDerivedValue(() => b3.value.y);
  const b3r = useDerivedValue(() => b3.value.r);

  const b4x = useDerivedValue(() => b4.value.x);
  const b4y = useDerivedValue(() => b4.value.y);
  const b4r = useDerivedValue(() => b4.value.r);

  const blurSigma = Math.min(width, height) * 0.20; // Reduced from 0.38 for performance

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFillObject}>
        <Rect x={0} y={0} width={width} height={height} color={baseColor} />
        
        <Circle cx={b4x} cy={b4y} r={b4r} color={c4} opacity={0.65}>
          <Blur blur={blurSigma} />
        </Circle>
        
        <Circle cx={b1x} cy={b1y} r={b1r} color={c1} opacity={0.7}>
          <Blur blur={blurSigma} />
        </Circle>
        
        <Circle cx={b2x} cy={b2y} r={b2r} color={c2} opacity={0.65}>
          <Blur blur={blurSigma} />
        </Circle>
        
        <Circle cx={b3x} cy={b3y} r={b3r} color={c3} opacity={0.7}>
          <Blur blur={blurSigma} />
        </Circle>
        
        <Rect x={0} y={0} width={width} height={height} color="rgba(59, 66, 159, 0.45)" />
      </Canvas>
    </View>
  );
});
