import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

type Props = {
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function BackButton({ label = "← Back", onPress, style }: Props) {
  return (
    <TouchableOpacity style={style} onPress={onPress ?? (() => router.back())}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 1,
  },
});
