import type { PressableStateCallbackType } from 'react-native';

/** react-native-web passes `focused` to Pressable style callbacks; RN types omit it. */
export const isFocused = (state: PressableStateCallbackType) => !!(state as { focused?: boolean }).focused;
