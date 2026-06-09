import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  label: string;
  sublabel?: string;
  /** Optional colored dot shown before the label (used in map filters) */
  color?: string;
  value: boolean;
  onToggle: () => void;
};

export default function ToggleRow({
  label,
  sublabel,
  color,
  value,
  onToggle,
}: Props) {
  return (
    <View style={styles.row}>
      {color ? (
        <View style={[styles.colorDot, { backgroundColor: color }]} />
      ) : null}
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleActive]}
        onPress={onToggle}
      >
        <View style={[styles.knob, value && styles.knobActive]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sublabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: "center",
    padding: 2,
    flexShrink: 0,
  },
  toggleActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  knob: {
    width: 16,
    height: 16,
    backgroundColor: Colors.white,
    alignSelf: "flex-start",
  },
  knobActive: {
    backgroundColor: Colors.black,
    alignSelf: "flex-end",
  },
});
