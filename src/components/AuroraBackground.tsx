import React, { memo } from 'react';
import { ImageBackground, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useInteractionMode } from '../context/InteractionModeContext';

export type AuroraBackgroundMood = 'calm' | 'energy' | 'hero';

interface AuroraBackgroundProps {
  color1?: string;
  color2?: string;
  color3?: string;
  baseColor?: string;
  mood?: AuroraBackgroundMood;
}

const UNIVERSAL_BACKGROUND: ImageSourcePropType = require('../../assets/images/universal-screen-background.png');

const MOOD_OVERLAYS: Record<
  AuroraBackgroundMood,
  {
    scrim: string;
    lowerScrim: string;
    highlight: string;
    imageOpacity: number;
  }
> = {
  calm: {
    scrim: 'rgba(8, 8, 8, 0.20)',
    lowerScrim: 'rgba(8, 8, 8, 0.76)',
    highlight: 'rgba(212, 175, 55, 0.06)',
    imageOpacity: 0.96,
  },
  energy: {
    scrim: 'rgba(8, 8, 8, 0.16)',
    lowerScrim: 'rgba(8, 8, 8, 0.68)',
    highlight: 'rgba(212, 175, 55, 0.10)',
    imageOpacity: 1,
  },
  hero: {
    scrim: 'rgba(8, 8, 8, 0.12)',
    lowerScrim: 'rgba(8, 8, 8, 0.58)',
    highlight: 'rgba(245, 245, 240, 0.08)',
    imageOpacity: 1,
  },
};

export const AuroraBackground = memo(function AuroraBackground({ mood = 'calm' }: AuroraBackgroundProps) {
  const { mode } = useInteractionMode();
  const resolvedMood = mode === 'gym-floor' || mode === 'focus' ? 'energy' : mood;
  const overlay = MOOD_OVERLAYS[resolvedMood];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <ImageBackground
        source={UNIVERSAL_BACKGROUND}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
        imageStyle={[styles.backgroundImage, { opacity: overlay.imageOpacity }]}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlay.scrim }]} />
        <LinearGradient
          colors={[
            overlay.highlight,
            'rgba(10, 10, 10, 0)',
            overlay.lowerScrim,
          ]}
          locations={[0, 0.48, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.36)',
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0.42)',
          ]}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
    </View>
  );
});

const styles = StyleSheet.create({
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
});
