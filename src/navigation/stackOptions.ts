import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
export const APP_STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: 'transparent',
  },
  // Keep the outgoing route rendering during native-stack transitions.
  // Freezing the blurred screen can leave the previous screen visually stuck
  // under the incoming transparent app surface on some devices.
  freezeOnBlur: false,
  animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
};
