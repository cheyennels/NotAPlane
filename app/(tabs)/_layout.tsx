import { Tabs } from "expo-router";
import { Image, StyleSheet } from "react-native";
import { FilterProvider } from "../../context/FilterContext";

export default function TabLayout() {
  return (
    <FilterProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#39FF14",
          tabBarInactiveTintColor: "#6B6B6B",
          tabBarLabelStyle: styles.tabLabel,
          tabBarShowLabel: true,
          tabBarIconStyle: { marginTop: 4 },
        }}
      >
        <Tabs.Screen
          name="map/index"
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
        {/* Hide sub-routes from tab bar */}
        <Tabs.Screen name="profile/change-password" options={{ href: null }} />
        <Tabs.Screen name="map/sighting/[id]" options={{ href: null }} />
        <Tabs.Screen name="map/filter" options={{ href: null }} />
      </Tabs>
    </FilterProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#1C1C1C",
    borderTopWidth: 1,
    borderTopColor: "#F2F2F0",
    height: 88,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    marginTop: 4,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
});
