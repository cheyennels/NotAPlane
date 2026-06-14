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
  /** "dark" = black input background (auth), "surface" = raised background (forms) */
  background?: "dark" | "surface";
  containerStyle?: StyleProp<ViewStyle>;
};

export default function FormField({
  label,
  hint,
  errorText,
  status = "default",
  background = "surface",
  containerStyle,
  style,
  ...inputProps
}: Props) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <TextInput
        style={[
          styles.input,
          background === "dark" && styles.inputDark,
          status === "error" && styles.inputError,
          status === "success" && styles.inputSuccess,
          style,
        ]}
        placeholderTextColor={Colors.muted}
        {...inputProps}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {!errorText && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
  inputDark: {
    backgroundColor: Colors.black,
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
