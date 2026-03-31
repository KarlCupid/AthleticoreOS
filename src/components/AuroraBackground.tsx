import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Canvas, Circle, Blur, Rect } from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
  interpolateColor,
} from 'react-native-reanimated';

interface AuroraBackgroundProps {
  color1?: string;
  color2?: string;
  color3?: string;
  baseColor?: string;
}

export function AuroraBackground({
  color1: propColor1,
  color2: propColor2,
  color3: propColor3,
  baseColor = '#3b429f', // Ocean Twilight Base
}: AuroraBackgroundProps) {
  const dimensions = useWindowDimensions();
  const width = dimensions.width || 375;
  const height = dimensions.height || 812;

  // INFINITE ENGINE: 0 -> 1 linear clock with NO reverse.
  // This prevents the "turn-around" jankiness of Easing.inOut.
  const time = useSharedValue(0);
  
  useEffect(() => {
    time.value = withRepeat(
      withTiming(1, { 
        duration: 15000, // Longer 15s cycle for grace
        easing: Easing.linear // Linear velocity means NO speed jumps or stops
      }),
      -1,
      false // Circular loop, no reverse
    );
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

  const blurSigma = Math.min(width, height) * 0.38;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFillObject}>
        <Rect x={0} y={0} width={width} height={height} color={baseColor} />
        
        <Circle cx={useDerivedValue(() => b4.value.x)} cy={useDerivedValue(() => b4.value.y)} r={useDerivedValue(() => b4.value.r)} color={c4} opacity={0.65}>
          <Blur blur={blurSigma} />
        </Circle>
        
        <Circle cx={useDerivedValue(() => b1.value.x)} cy={useDerivedValue(() => b1.value.y)} r={useDerivedValue(() => b1.value.r)} color={c1} opacity={0.7}>
          <Blur blur={blurSigma} />
        </Circle>
        
        <Circle cx={useDerivedValue(() => b2.value.x)} cy={useDerivedValue(() => b2.value.y)} r={useDerivedValue(() => b2.value.r)} color={c2} opacity={0.65}>
          <Blur blur={blurSigma} />
        </Circle>
        
        <Circle cx={useDerivedValue(() => b3.value.x)} cy={useDerivedValue(() => b3.value.y)} r={useDerivedValue(() => b3.value.r)} color={c3} opacity={0.7}>
          <Blur blur={blurSigma} />
        </Circle>
        
        <Rect x={0} y={0} width={width} height={height} color="rgba(59, 66, 159, 0.45)" />
      </Canvas>
    </View>
  );
}
