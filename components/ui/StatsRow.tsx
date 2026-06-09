import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { StyleSheet, Text, View } from "react-native";

type Stat = {
  label: string;
  value: number | string;
};

type Props = {
  stats: Stat[];
};

export default function StatsRow({ stats }: Props) {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.card}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  card: {
    flex: 1,
    padding: 12,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: Colors.green,
    letterSpacing: 1,
    marginBottom: 6,
    lineHeight: 13,
    textTransform: "uppercase",
  },
  value: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.white,
    letterSpacing: 1,
  },
});
