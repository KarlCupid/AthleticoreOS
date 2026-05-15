import React from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { ScreenWrapper } from './ScreenWrapper';

type CommandScreenTone =
  | 'today'
  | 'train'
  | 'plan'
  | 'fuel'
  | 'profile'
  | 'bodyMass'
  | 'risk'
  | 'default';

interface CommandScreenProps {
  children: React.ReactNode;
  tone?: CommandScreenTone;
  useSafeArea?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  overlayColor?: string;
  imageOpacity?: number;
}

const UNIVERSAL_BACKGROUND: ImageSourcePropType = require('../../assets/images/universal-screen-background.png');

const BACKGROUNDS: Record<CommandScreenTone, ImageSourcePropType> = {
  today: UNIVERSAL_BACKGROUND,
  train: UNIVERSAL_BACKGROUND,
  plan: UNIVERSAL_BACKGROUND,
  fuel: UNIVERSAL_BACKGROUND,
  profile: UNIVERSAL_BACKGROUND,
  bodyMass: UNIVERSAL_BACKGROUND,
  risk: UNIVERSAL_BACKGROUND,
  default: UNIVERSAL_BACKGROUND,
};

const OVERLAYS: Record<CommandScreenTone, string> = {
  today: 'rgba(4, 8, 10, 0.58)',
  train: 'rgba(4, 8, 10, 0.58)',
  plan: 'rgba(4, 8, 10, 0.60)',
  fuel: 'rgba(4, 8, 10, 0.60)',
  profile: 'rgba(4, 8, 10, 0.62)',
  bodyMass: 'rgba(5, 7, 8, 0.62)',
  risk: 'rgba(8, 4, 5, 0.66)',
  default: 'rgba(4, 8, 10, 0.60)',
};

export function CommandScreen({
  children,
  tone = 'default',
  useSafeArea = false,
  style,
  contentContainerStyle,
  overlayColor,
  imageOpacity = 0.94,
}: CommandScreenProps) {
  return (
    <ScreenWrapper
      useSafeArea={useSafeArea}
      style={[styles.shell, style]}
      contentContainerStyle={contentContainerStyle}
    >
      <ImageBackground
        source={BACKGROUNDS[tone]}
        resizeMode="cover"
        style={styles.background}
        imageStyle={[styles.backgroundImage, { opacity: imageOpacity }]}
      >
        <View style={[styles.overlay, { backgroundColor: overlayColor ?? OVERLAYS[tone] }]} />
        {children}
      </ImageBackground>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'transparent',
  },
  background: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    opacity: 0.94,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
