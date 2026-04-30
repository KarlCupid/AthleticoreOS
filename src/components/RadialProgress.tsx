import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TextStyle, StyleProp } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface RadialProgressProps {
  progress: number;
  size?: number | undefined;
  strokeWidth?: number | undefined;
  color: string;
  trackColor?: string | undefined;
  label?: string | undefined;
  sublabel?: string | undefined;
  centerSublabel?: string | undefined;
  icon?: React.ReactNode | undefined;
  textColor?: string | undefined;
  labelStyle?: StyleProp<TextStyle> | undefined;
  sublabelStyle?: StyleProp<TextStyle> | undefined;
  centerSublabelStyle?: StyleProp<TextStyle> | undefined;
  glowColor?: string | undefined;
  centerFillColor?: string | undefined;
  centerBorderColor?: string | undefined;
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
  progress,
  color,
  trackColor = COLORS.borderLight,
  label,
  sublabel,
  centerSublabel,
  icon,
  textColor = COLORS.text.primary,
  labelStyle,
  sublabelStyle,
  centerSublabelStyle,
  glowColor,
  centerFillColor = 'rgba(10, 10, 10, 0.62)',
  centerBorderColor = 'rgba(255, 255, 255, 0.08)',
}: RadialProgressProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const innerSize = Math.max(0, size - strokeWidth * 2.35);
  const progressDegrees = Math.round(clampedProgress * 360);

  return (
    <View style={[styles.container, { width: size }]}>
      <View
        style={[
          styles.webRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: trackColor,
          },
          {
            backgroundImage: `conic-gradient(${color} ${progressDegrees}deg, ${trackColor} ${progressDegrees}deg 360deg)`,
            boxShadow: glowColor ? `0 0 ${strokeWidth * 2}px ${glowColor}` : undefined,
          } as any,
        ]}
      >
        <View
          style={[
            styles.webInnerDisc,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: centerFillColor,
              borderColor: centerBorderColor,
            },
          ]}
        >
          <CenterContent
            icon={icon}
            label={label}
            centerSublabel={centerSublabel}
            textColor={textColor}
            labelStyle={labelStyle}
            centerSublabelStyle={centerSublabelStyle}
          />
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
  centerSublabel,
  icon,
  textColor = COLORS.text.primary,
  labelStyle,
  sublabelStyle,
  centerSublabelStyle,
  glowColor,
  centerFillColor = 'rgba(10, 10, 10, 0.62)',
  centerBorderColor = 'rgba(255, 255, 255, 0.08)',
}: RadialProgressProps) {
  const glowStrokeWidth = strokeWidth + 8;
  const radius = (size - glowStrokeWidth) / 2;
  const center = size / 2;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const innerSize = Math.max(0, size - strokeWidth * 2.55);

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
            strokeWidth={glowStrokeWidth}
            color="rgba(255,255,255,0.035)"
            strokeCap="round"
          />
          <Path
            path={trackPath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={trackColor}
            strokeCap="round"
          />
          {clampedProgress > 0 ? (
            <>
              <Path
                path={progressPath}
                style="stroke"
                strokeWidth={glowStrokeWidth}
                color={glowColor ?? color}
                strokeCap="round"
              />
              <Path
                path={progressPath}
                style="stroke"
                strokeWidth={strokeWidth}
                color={color}
                strokeCap="round"
              />
            </>
          ) : null}
        </Canvas>
        <View style={styles.centerContent}>
          <View
            style={[
              styles.centerDisc,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
                backgroundColor: centerFillColor,
                borderColor: centerBorderColor,
              },
            ]}
          >
            <CenterContent
              icon={icon}
              label={label}
              centerSublabel={centerSublabel}
              textColor={textColor}
              labelStyle={labelStyle}
              centerSublabelStyle={centerSublabelStyle}
            />
          </View>
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

function CenterContent({
  icon,
  label,
  centerSublabel,
  textColor,
  labelStyle,
  centerSublabelStyle,
}: {
  icon?: React.ReactNode | undefined;
  label?: string | undefined;
  centerSublabel?: string | undefined;
  textColor: string;
  labelStyle?: StyleProp<TextStyle> | undefined;
  centerSublabelStyle?: StyleProp<TextStyle> | undefined;
}) {
  if (icon) return <>{icon}</>;

  return (
    <>
      {label ? (
        <Text
          style={[styles.centerLabel, { color: textColor }, labelStyle]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.76}
        >
          {label}
        </Text>
      ) : null}
      {centerSublabel ? (
        <Text
          style={[styles.centerSublabel, centerSublabelStyle]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {centerSublabel}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  webRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webInnerDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  centerLabel: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  centerSublabel: {
    marginTop: -2,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  sublabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
});
