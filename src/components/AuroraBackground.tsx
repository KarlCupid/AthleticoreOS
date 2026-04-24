import React, { memo, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View, Platform, AppState } from 'react-native';
import {
  Canvas,
  Circle,
  Blur,
  Rect,
  Path,
  Skia,
  LinearGradient as SkiaLinearGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
  interpolateColor,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

interface AuroraBackgroundProps {
  color1?: string;
  color2?: string;
  color3?: string;
  baseColor?: string;
}

const PALETTE = ['#10184a', '#21338e', '#7653c8', '#d6a546', '#5bd2e8', '#10184a'] as const;
const METALLIC_FLOW_BASE = '#11164a';

export const AuroraBackground = memo(function AuroraBackground(props: AuroraBackgroundProps) {
  if (Platform.OS === 'web') {
    return <AuroraBackgroundWeb {...props} />;
  }

  return <AuroraBackgroundNative {...props} />;
});

function AuroraBackgroundWeb({ baseColor = METALLIC_FLOW_BASE }: AuroraBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <ExpoLinearGradient
        colors={[baseColor, '#263a95', '#7a5fd0', '#d2a54d', '#171b47']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.webRibbon, styles.webRibbonOne]} />
      <View style={[styles.webRibbon, styles.webRibbonTwo]} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(9, 12, 35, 0.34)' }]} />
    </View>
  );
}

function AuroraBackgroundNative({
  color1: propColor1,
  color2: propColor2,
  color3: propColor3,
  baseColor = METALLIC_FLOW_BASE,
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

  const derivedColor1 = useSmoothColor(time, 0.05);
  const derivedColor2 = useSmoothColor(time, 0.28);
  const derivedColor3 = useSmoothColor(time, 0.5);
  const derivedColor4 = useSmoothColor(time, 0.7);

  const ribbonA = useDerivedValue(() => buildRibbonPath(width, height, time.value, 0, 0.3));
  const ribbonB = useDerivedValue(() => buildRibbonPath(width, height, time.value, 0.34, 0.72));
  const ribbonC = useDerivedValue(() => buildRibbonPath(width, height, time.value, 0.68, 1.08));

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
  const ribbonBlur = Math.min(width, height) * 0.045;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFillObject}>
        <Rect x={0} y={0} width={width} height={height} color={baseColor} />

        <Path path={ribbonA} style="stroke" strokeWidth={width * 0.34} strokeCap="round" start={0} end={1} opacity={0.58}>
          <SkiaLinearGradient
            start={vec(width * 0.05, height * 0.08)}
            end={vec(width * 0.95, height * 0.72)}
            colors={['#05071d', propColor1 ?? '#7356c8', '#f6c85a', '#e8eefc']}
            positions={[0, 0.38, 0.68, 1]}
          />
          <Blur blur={ribbonBlur} />
        </Path>

        <Path path={ribbonB} style="stroke" strokeWidth={width * 0.24} strokeCap="round" start={0} end={1} opacity={0.5}>
          <SkiaLinearGradient
            start={vec(width * 0.1, height * 0.92)}
            end={vec(width * 0.96, height * 0.18)}
            colors={['#202b76', propColor2 ?? '#9d6dd2', '#00e5ff', '#fff3b0']}
            positions={[0, 0.45, 0.72, 1]}
          />
          <Blur blur={ribbonBlur * 0.85} />
        </Path>

        <Circle cx={blob4x} cy={blob4y} r={blob4r} color={derivedColor4} opacity={0.42}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob1x} cy={blob1y} r={blob1r} color={propColor1 ?? derivedColor1} opacity={0.44}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob2x} cy={blob2y} r={blob2r} color={propColor2 ?? derivedColor2} opacity={0.4}>
          <Blur blur={blurSigma} />
        </Circle>

        <Circle cx={blob3x} cy={blob3y} r={blob3r} color={propColor3 ?? derivedColor3} opacity={0.46}>
          <Blur blur={blurSigma} />
        </Circle>

        <Path path={ribbonC} style="stroke" strokeWidth={width * 0.11} strokeCap="round" start={0} end={1} opacity={0.68}>
          <SkiaLinearGradient
            start={vec(width * 0.15, height * 0.18)}
            end={vec(width * 0.85, height * 0.86)}
            colors={['rgba(255,255,255,0.15)', '#fff7c7', '#00e5ff', 'rgba(255,255,255,0.2)']}
            positions={[0, 0.35, 0.7, 1]}
          />
          <Blur blur={ribbonBlur * 0.35} />
        </Path>

        <Rect x={0} y={0} width={width} height={height} color="rgba(8, 10, 31, 0.38)" />
      </Canvas>
    </View>
  );
}

function buildRibbonPath(width: number, height: number, time: number, phase: number, verticalBias: number) {
  const path = Skia.Path.Make();
  const wave = time * Math.PI * 2 + phase * Math.PI * 2;
  const startY = height * (0.12 + verticalBias * 0.24) + Math.sin(wave) * height * 0.08;
  const endY = height * (0.72 + verticalBias * 0.16) + Math.cos(wave * 0.82) * height * 0.08;
  const c1x = width * (0.18 + Math.sin(wave * 0.6) * 0.18);
  const c1y = height * (0.08 + verticalBias * 0.52) + Math.cos(wave * 1.1) * height * 0.15;
  const c2x = width * (0.82 + Math.cos(wave * 0.72) * 0.18);
  const c2y = height * (0.56 + verticalBias * 0.24) + Math.sin(wave * 1.22) * height * 0.16;

  path.moveTo(-width * 0.22, startY);
  path.cubicTo(c1x, c1y, c2x, c2y, width * 1.22, endY);
  return path;
}

function useSmoothColor(time: ReturnType<typeof useSharedValue<number>>, offset: number) {
  return useDerivedValue(() => {
    const progress = (time.value + offset) % 1;
    return interpolateColor(progress, [0, 0.2, 0.4, 0.6, 0.8, 1], PALETTE as unknown as string[]);
  });
}

const styles = StyleSheet.create({
  webRibbon: {
    position: 'absolute',
    width: '145%',
    height: 230,
    left: '-22%',
    borderRadius: 999,
    opacity: 0.46,
    transform: [{ rotate: '-18deg' }],
  },
  webRibbonOne: {
    top: '18%',
    backgroundColor: 'rgba(246, 200, 90, 0.42)',
  },
  webRibbonTwo: {
    top: '45%',
    backgroundColor: 'rgba(0, 229, 255, 0.28)',
    transform: [{ rotate: '17deg' }],
  },
});
