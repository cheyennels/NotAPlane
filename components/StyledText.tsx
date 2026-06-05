import { Fonts } from '@/constants/fonts';
import { Text, TextProps } from './Themed';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: Fonts.mono }]} />;
}
