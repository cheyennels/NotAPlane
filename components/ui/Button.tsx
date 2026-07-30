import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

export type ButtonVariant =
  | "primary" // green fill, black text
  | "outline" // white border, white text
  | "accent" // dark green fill, green border + text
  | "tint" // subtle green tint fill, green border + text
  | "muted" // solid grey fill, black text — inactive/informational
  | "danger"; // red border + text

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  labelStyle,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        containerStyles[variant],
        // The muted variant is already visually inactive, so don't stack the
        // opacity dim on top of it — keep it a clean solid grey.
        disabled && variant !== "muted" && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? Colors.black : Colors.white}
        />
      ) : (
        <Text style={[styles.label, labelStyles[variant], labelStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 16,
    alignItems: "center",
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});

const containerStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: Colors.green,
  },
  outline: {
    borderWidth: 2,
    borderColor: Colors.white,
  },
  accent: {
    backgroundColor: Colors.darkGreen,
    borderWidth: 2,
    borderColor: Colors.green,
  },
  tint: {
    backgroundColor: "rgba(57,255,20,0.07)",
    borderWidth: 2,
    borderColor: Colors.green,
  },
  muted: {
    backgroundColor: Colors.muted,
  },
  danger: {
    borderWidth: 2,
    borderColor: Colors.red,
  },
};

const labelStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: Colors.black },
  outline: { color: Colors.white },
  accent: { color: Colors.green },
  tint: { color: Colors.green },
  muted: { color: Colors.black },
  danger: { color: Colors.red },
};
