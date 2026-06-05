import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { Tabs } from "expo-router";
import { Image, StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.white,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require("../../assets/images/map-focus.png")
                  : require("../../assets/images/map.png")
              }
              style={styles.icon}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sightings"
        options={{
          title: "Sightings",
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require("../../assets/images/reports-focus.png")
                  : require("../../assets/images/reports.png")
              }
              style={styles.icon}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require("../../assets/images/notification-focus.png")
                  : require("../../assets/images/notification.png")
              }
              style={styles.icon}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require("../../assets/images/profile-focus.png")
                  : require("../../assets/images/profile.png")
              }
              style={styles.icon}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    height: 88,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    marginTop: 2,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
});
