import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TextStyle, StyleProp } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface RadialProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  icon?: React.ReactNode;
  textColor?: string;
  labelStyle?: StyleProp<TextStyle>;
  sublabelStyle?: StyleProp<TextStyle>;
}

export const RadialProgress = memo(function RadialProgress(props: RadialProgressProps) {
  if (Platform.OS === 'web') {
    return <RadialProgressWeb {...props} />;
  }

  return <RadialProgressNative {...props} />;
});

function RadialProgressWeb({
  size = 100,
  strokeWidth = 8,
  trackColor = COLORS.borderLight,
  label,
  sublabel,
  icon,
  textColor = COLORS.text.primary,
  labelStyle,
  sublabelStyle,
}: RadialProgressProps) {
  return (
    <View style={[styles.container, { width: size }]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: trackColor,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <View style={styles.centerContent}>
          {icon ? (
            icon
          ) : label ? (
            <Text style={[styles.centerLabel, { color: textColor }, labelStyle]} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </View>
      </View>
      {sublabel ? (
        <Text style={[styles.sublabel, sublabelStyle]} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

function RadialProgressNative({
  progress,
  size = 100,
  strokeWidth = 8,
  color,
  trackColor = COLORS.borderLight,
  label,
  sublabel,
  icon,
  textColor = COLORS.text.primary,
  labelStyle,
  sublabelStyle,
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(center, center, radius);
    return path;
  }, [center, radius]);

  const progressPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (clampedProgress > 0) {
      path.addArc(Skia.XYWHRect(center - radius, center - radius, radius * 2, radius * 2), -90, clampedProgress * 360);
    }
    return path;
  }, [center, radius, clampedProgress]);

  return (
    <View style={[styles.container, { width: size }]}>
      <View style={{ width: size, height: size }}>
        <Canvas style={{ width: size, height: size }}>
          <Path
            path={trackPath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={trackColor}
            strokeCap="round"
          />
          {clampedProgress > 0 ? (
            <Path
              path={progressPath}
              style="stroke"
              strokeWidth={strokeWidth}
              color={color}
              strokeCap="round"
            />
          ) : null}
        </Canvas>
        <View style={styles.centerContent}>
          {icon ? (
            icon
          ) : label ? (
            <Text style={[styles.centerLabel, { color: textColor }, labelStyle]} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </View>
      </View>
      {sublabel ? (
        <Text style={[styles.sublabel, { color: 'rgba(255,255,255,0.7)' }, sublabelStyle]} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  sublabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
});
