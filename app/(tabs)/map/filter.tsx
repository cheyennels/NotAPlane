import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
    DEFAULT_FILTERS,
    MapFilters,
    useFilters,
} from "@/context/FilterContext";
import { router } from "expo-router";
import { useState } from "react";
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

  function handleApply() {
    updateFilters(filters);
    router.back();
  }

  function handleReset() {
    resetFilters();
    setFilters(DEFAULT_FILTERS);
  }

  function toggleFilter(key: keyof MapFilters) {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function setTimeRange(range: "week" | "all") {
    setFilters((prev) => ({ ...prev, timeRange: range }));
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filter Map</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Sighting status */}
        <Text style={styles.sectionLabel}>Sighting Status</Text>

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
        <Text style={styles.sectionLabel}>Overlays</Text>

        <ToggleRow
          label="Flight Paths"
          sublabel="Show known aircraft routes"
          color={Colors.green}
          value={filters.showFlightPaths}
          onToggle={() => toggleFilter("showFlightPaths")}
        />
        <ToggleRow
          label="Celestial Bodies"
          sublabel="Stars, planets, ISS"
          color={Colors.white}
          value={filters.showCelestial}
          onToggle={() => toggleFilter("showCelestial")}
        />

        {/* Time range */}
        <Text style={styles.sectionLabel}>Time Range</Text>

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

      {/* Apply button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  sublabel,
  color,
  value,
  onToggle,
}: {
  label: string;
  sublabel: string;
  color: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.colorDot, { backgroundColor: color }]} />
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sublabel}</Text>
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleActive]}
        onPress={onToggle}
      >
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </TouchableOpacity>
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
  backText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 1,
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
  sectionLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 8,
    paddingBottom: 8,
  },
  toggleRow: {
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
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  toggleSub: {
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
  toggleKnob: {
    width: 16,
    height: 16,
    backgroundColor: Colors.white,
    alignSelf: "flex-start",
  },
  toggleKnobActive: {
    backgroundColor: Colors.black,
    alignSelf: "flex-end",
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
    padding: 16,
    paddingBottom: 16,
    backgroundColor: Colors.black,
  },
  applyBtn: {
    backgroundColor: Colors.green,
    padding: 16,
    alignItems: "center",
  },
  applyBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.black,
    letterSpacing: 1,
  },
});
