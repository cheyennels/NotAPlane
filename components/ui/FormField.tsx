import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import SectionLabel from "./SectionLabel";

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  errorText?: string;
  /** Colors the input border for validation feedback */
  status?: "default" | "error" | "success";
  /** Show a ✓/✗ at the end of the field for success/error status */
  statusIcon?: boolean;
  /** "dark" = black input background (auth), "surface" = raised background (forms) */
  background?: "dark" | "surface";
  containerStyle?: StyleProp<ViewStyle>;
};

export default function FormField({
  label,
  hint,
  errorText,
  status = "default",
  statusIcon = false,
  background = "surface",
  containerStyle,
  style,
  ...inputProps
}: Props) {
  const showIcon = statusIcon && status !== "default";

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <View style={styles.inputWrap}>
        <TextInput
          style={[
            styles.input,
            background === "dark" && styles.inputDark,
            status === "error" && styles.inputError,
            status === "success" && styles.inputSuccess,
            showIcon && styles.inputWithIcon,
            style,
          ]}
          placeholderTextColor={Colors.muted}
          {...inputProps}
        />
        {showIcon ? (
          <View style={styles.statusIconWrap} pointerEvents="none">
            <Text
              style={[
                styles.statusIcon,
                status === "success"
                  ? styles.statusIconSuccess
                  : styles.statusIconError,
              ]}
            >
              {status === "success" ? "✓" : "✕"}
            </Text>
          </View>
        ) : null}
      </View>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {!errorText && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 14,
    fontFamily: Fonts.mono,
    fontSize: Platform.OS === "web" ? 16 : 12,
    color: Colors.white,
  },
  inputWithIcon: {
    paddingRight: 38,
  },
  inputDark: {
    backgroundColor: Colors.black,
  },
  statusIconWrap: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    paddingRight: 14,
    justifyContent: "center",
  },
  statusIcon: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    fontWeight: "bold",
  },
  statusIconSuccess: {
    color: Colors.green,
  },
  statusIconError: {
    color: Colors.red,
  },
  inputError: {
    borderColor: Colors.red,
  },
  inputSuccess: {
    borderColor: Colors.green,
  },
  hint: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  errorText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.red,
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
