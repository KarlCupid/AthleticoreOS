import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
export const APP_STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: 'transparent',
  },
  freezeOnBlur: true,
  animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
};
