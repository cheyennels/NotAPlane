import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

type Props = {
  children: string;
  /** "form" = label above an input; "section" = divider between groups */
  variant?: "form" | "section";
  style?: StyleProp<TextStyle>;
};

export default function SectionLabel({
  children,
  variant = "form",
  style,
}: Props) {
  return (
    <Text style={[styles.base, variantStyles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    textTransform: "uppercase",
  },
});

const variantStyles: Record<"form" | "section", TextStyle> = {
  form: {
    letterSpacing: 2,
    marginBottom: 6,
  },
  section: {
    letterSpacing: 3,
    marginTop: 8,
    marginBottom: 4,
  },
};
