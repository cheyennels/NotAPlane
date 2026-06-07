import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const NEW_NOTIFICATIONS = [
  {
    id: "1",
    text: "2 people corroborated your sighting in Saint Paul, MN",
    date: "July 7th",
    time: "12:42 AM",
  },
  {
    id: "2",
    text: "7 people corroborated your sighting in Eden Prairie, MN",
    date: "July 13th",
    time: "7:45 AM",
  },
  {
    id: "3",
    text: "75 people corroborated your sighting in Minneapolis, MN",
    date: "May 27th",
    time: "10:14 PM",
  },
];

const OLDER_NOTIFICATIONS = [
  {
    id: "4",
    text: "2 people corroborated your sighting in Saint Paul, MN",
    date: "July 7th",
    time: "12:42 AM",
  },
  {
    id: "5",
    text: "7 people corroborated your sighting in Eden Prairie, MN",
    date: "July 13th",
    time: "7:45 AM",
  },
  {
    id: "6",
    text: "75 people corroborated your sighting in Minneapolis, MN",
    date: "May 27th",
    time: "10:14 PM",
  },
];

export default function ActivityScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerSub}>
          {NEW_NOTIFICATIONS.length} New notifications
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* New section */}
        <Text style={styles.sectionLabel}>NEW</Text>
        {NEW_NOTIFICATIONS.map((notif) => (
          <TouchableOpacity
            key={notif.id}
            style={styles.notifCard}
            onPress={() => {}}
          >
            <Text style={styles.notifText}>{notif.text.toUpperCase()}</Text>
            <Text style={styles.notifDate}>
              {notif.date} · {notif.time}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Older section */}
        <Text style={[styles.sectionLabel, styles.sectionLabelOlder]}>
          OLDER
        </Text>
        {OLDER_NOTIFICATIONS.map((notif) => (
          <TouchableOpacity
            key={notif.id}
            style={styles.notifCard}
            onPress={() => {}}
          >
            <Text style={styles.notifText}>{notif.text.toUpperCase()}</Text>
            <Text style={styles.notifDate}>
              {notif.date} · {notif.time}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 1,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionLabelOlder: {
    marginTop: 8,
  },
  notifCard: {
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 6,
  },
  notifText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  notifDate: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
  },
});
