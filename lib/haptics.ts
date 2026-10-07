import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Native haptics via expo-haptics; on the web, the Vibration API where the browser has it
// (Android Chrome yes, iOS Safari no). Feedback is best effort: failures are ignored.
const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
};

/** Light tick for a press. */
export const tapHaptic = () => {
  if (Platform.OS === 'web') vibrate(8);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
};

/** Success pattern: item in the cart, order confirmed. */
export const successHaptic = () => {
  if (Platform.OS === 'web') vibrate([12, 60, 18]);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
};
