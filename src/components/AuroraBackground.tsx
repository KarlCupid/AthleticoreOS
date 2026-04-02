import React, { memo, useEffect } from 'react';
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

const PALETTE = ['#e3170a', '#e16036', '#fcca46', '#3b429f', '#aa7dce', '#e3170a'] as const;

export const AuroraBackground = memo(function AuroraBackground(props: AuroraBackgroundProps) {
  if (Platform.OS === 'web') {
    return <AuroraBackgroundWeb {...props} />;
  }

  return <AuroraBackgroundNative {...props} />;
});

function AuroraBackgroundWeb({ baseColor = '#3b429f' }: AuroraBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={[baseColor, '#aa7dce', '#3b429f', '#1a1c3d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(59, 66, 159, 0.45)' }]} />
    </View>
  );
}

function AuroraBackgroundNative({
  color1: propColor1,
  color2: propColor2,
  color3: propColor3,
  baseColor = '#3b429f',
}: AuroraBackgroundProps) {
  const dimensions = useWindowDimensions();
  const width = dimensions.width || 375;
  const height = dimensions.height || 812;
  const time = useSharedValue(0);

  useEffect(() => {
    const startAnimation = () => {
      time.value = withRepeat(withTiming(1, { duration: 15000, easing: Easing.linear }), -1, false);
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
  }, [time]);

  const derivedColor1 = useSmoothColor(time, 0);
  const derivedColor2 = useSmoothColor(time, 0.2);
  const derivedColor3 = useSmoothColor(time, 0.4);
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

  const blurSigma = Math.min(width, height) * 0.2;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFillObject}>
        <Rect x={0} y={0} width={width} height={height} color={baseColor} />

        <Circle cx={blob4x} cy={blob4y} r={blob4r} color={derivedColor4} opacity={0.65}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob1x} cy={blob1y} r={blob1r} color={propColor1 ?? derivedColor1} opacity={0.7}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob2x} cy={blob2y} r={blob2r} color={propColor2 ?? derivedColor2} opacity={0.65}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob3x} cy={blob3y} r={blob3r} color={propColor3 ?? derivedColor3} opacity={0.7}>
          <Blur blur={blurSigma} />
        </Circle>

        <Rect x={0} y={0} width={width} height={height} color="rgba(59, 66, 159, 0.45)" />
      </Canvas>
    </View>
  );
}

function useSmoothColor(time: ReturnType<typeof useSharedValue<number>>, offset: number) {
  return useDerivedValue(() => {
    const progress = (time.value + offset) % 1;
    return interpolateColor(progress, [0, 0.2, 0.4, 0.6, 0.8, 1], PALETTE as unknown as string[]);
  });
}
