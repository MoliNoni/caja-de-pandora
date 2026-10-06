import { SymbolView } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: any;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      style={style}
      resizeMode="scaleAspectFit"
    />
  );
}