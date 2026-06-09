import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type Props = {
  options: string[];
  /** A string for single-select, an array for multi-select */
  selected: string | string[] | null;
  onSelect: (option: string) => void;
  style?: StyleProp<ViewStyle>;
};

export default function PillGroup({ options, selected, onSelect, style }: Props) {
  function isSelected(option: string) {
    return Array.isArray(selected)
      ? selected.includes(option)
      : selected === option;
  }

  return (
    <View style={[styles.grid, style]}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.pill, isSelected(option) && styles.pillActive]}
          onPress={() => onSelect(option)}
        >
          <Text
            style={[styles.text, isSelected(option) && styles.textActive]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    borderWidth: 2,
    borderColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillActive: {
    borderColor: Colors.green,
    backgroundColor: "rgba(57,255,20,0.07)",
  },
  text: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
  },
  textActive: {
    color: Colors.green,
  },
});
