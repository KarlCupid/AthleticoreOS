import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { APP_CHROME } from '../theme/theme';

export const APP_STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: APP_CHROME.background,
  },
  freezeOnBlur: true,
  animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
};
