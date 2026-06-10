import BackButton from "@/components/ui/BackButton";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import SectionLabel from "@/components/ui/SectionLabel";
import ToggleRow from "@/components/ui/ToggleRow";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  DEFAULT_FILTERS,
  MapFilters,
  useFilters,
} from "@/context/FilterContext";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function FilterScreen() {
  const { filters: savedFilters, updateFilters, resetFilters } = useFilters();
  const [filters, setFilters] = useState<MapFilters>(savedFilters);

  useEffect(() => {
    setFilters(savedFilters);
  }, [savedFilters]);

  function handleApply() {
    router.back();
  }

  function handleReset() {
    resetFilters();
    setFilters(DEFAULT_FILTERS);
  }

  function toggleFilter(key: keyof MapFilters) {
    setFilters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      updateFilters(next);
      return next;
    });
  }

  function setTimeRange(range: "week" | "all") {
    setFilters((prev) => {
      const next = { ...prev, timeRange: range };
      updateFilters(next);
      return next;
    });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Filter Map</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Sighting status */}
        <SectionLabel variant="section">Sighting Status</SectionLabel>

        <ToggleRow
          label="Explained"
          sublabel="Matched to aircraft"
          color={Colors.blue}
          value={filters.showExplained}
          onToggle={() => toggleFilter("showExplained")}
        />
        <ToggleRow
          label="Partial Match"
          sublabel="Low confidence match"
          color={Colors.yellow}
          value={filters.showPartial}
          onToggle={() => toggleFilter("showPartial")}
        />
        <ToggleRow
          label="Unexplained"
          sublabel="No match found"
          color={Colors.red}
          value={filters.showUnexplained}
          onToggle={() => toggleFilter("showUnexplained")}
        />
        <ToggleRow
          label="Pending"
          sublabel="Awaiting analysis"
          color={Colors.green}
          value={filters.showPending}
          onToggle={() => toggleFilter("showPending")}
        />

        {/* Overlays */}
        <SectionLabel variant="section">Overlays</SectionLabel>

        <ToggleRow
          label="Flight Paths"
          sublabel="Show known aircraft routes"
          color={Colors.green}
          value={filters.showFlightPaths}
          onToggle={() => toggleFilter("showFlightPaths")}
        />
        <ToggleRow
          label="Celestial Bodies"
          sublabel="Stars and planets"
          color={Colors.white}
          value={filters.showCelestial}
          onToggle={() => toggleFilter("showCelestial")}
        />
        <ToggleRow
          label="Satellites"
          sublabel="148 visually bright satellites"
          color="#FF69B4"
          value={filters.showSatellites}
          onToggle={() => toggleFilter("showSatellites")}
        />

        {/* Time range */}
        <SectionLabel variant="section">Time Range</SectionLabel>

        <View style={styles.timeRangeRow}>
          <TouchableOpacity
            style={[
              styles.timeRangeBtn,
              filters.timeRange === "week" && styles.timeRangeBtnActive,
            ]}
            onPress={() => setTimeRange("week")}
          >
            <Text
              style={[
                styles.timeRangeBtnText,
                filters.timeRange === "week" && styles.timeRangeBtnTextActive,
              ]}
            >
              Past Week
            </Text>
            <Text style={styles.timeRangeSub}>Last 7 days</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeRangeBtn,
              filters.timeRange === "all" && styles.timeRangeBtnActive,
            ]}
            onPress={() => setTimeRange("all")}
          >
            <Text
              style={[
                styles.timeRangeBtnText,
                filters.timeRange === "all" && styles.timeRangeBtnTextActive,
              ]}
            >
              All Time
            </Text>
            <Text style={styles.timeRangeSub}>All historical reports</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomActionBar style={styles.bottomBar}>
        <Button label="Apply Filters" onPress={handleApply} />
      </BottomActionBar>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 1,
  },
  resetText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.green,
    letterSpacing: 1,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 10,
  },
  timeRangeRow: {
    flexDirection: "row",
    gap: 10,
  },
  timeRangeBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 12,
    backgroundColor: Colors.surface,
  },
  timeRangeBtnActive: {
    borderColor: Colors.green,
    backgroundColor: "rgba(57,255,20,0.07)",
  },
  timeRangeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timeRangeBtnTextActive: {
    color: Colors.green,
  },
  timeRangeSub: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  bottomBar: {
    paddingBottom: 16,
  },
});
