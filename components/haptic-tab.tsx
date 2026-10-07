import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { tapHaptic } from '../lib/haptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      // The library pads tab buttons (10 material / 5 uikit, top-aligned), which
      // overflows a custom-height bar and clips the label; center content instead.
      style={[props.style, { padding: 0, justifyContent: 'center', gap: 2 }]}
      onPressIn={(ev) => {
        tapHaptic();
        props.onPressIn?.(ev);
      }}
    />
  );
}