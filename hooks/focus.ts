import { Platform, type PressableStateCallbackType } from 'react-native';

// Focus rings are for keyboard users only (like CSS :focus-visible): a click or tap
// also focuses the Pressable on web, which drew a ring around every pressed button.
let keyboardInput = false;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', () => { keyboardInput = true; }, true);
  window.addEventListener('pointerdown', () => { keyboardInput = false; }, true);
}

/** react-native-web passes `focused` to Pressable style callbacks; RN types omit it. */
export const isFocused = (state: PressableStateCallbackType) =>
  keyboardInput && !!(state as { focused?: boolean }).focused;
