import { Colors } from "@/constants/colors";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Sticky footer that stacks action buttons at the bottom of a screen. */
export default function BottomActionBar({ children, style }: Props) {
  return <View style={[styles.bar, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    backgroundColor: Colors.black,
  },
});
