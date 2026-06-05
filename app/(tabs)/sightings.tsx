import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { StyleSheet, Text, View } from "react-native";

export default function SightingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sightings coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: Fonts.mono,
    color: Colors.green,
    fontSize: 14,
  },
});
