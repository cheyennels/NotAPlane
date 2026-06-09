import BackButton from "@/components/ui/BackButton";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const TOTAL_STEPS = 5;

type ReportStepShellProps = {
  step: number;
  stepHeading: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function ReportStepShell({
  step,
  stepHeading,
  children,
  footer,
}: ReportStepShellProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.backBtn} />
        <Text style={styles.title}>Report Sighting</Text>

        <View style={styles.stepIndicator}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => {
            const stepNumber = index + 1;
            const barStyle =
              stepNumber < step
                ? styles.stepDone
                : stepNumber === step
                  ? styles.stepActive
                  : styles.stepIdle;

            return (
              <View key={stepNumber} style={[styles.stepBar, barStyle]} />
            );
          })}
        </View>

        <Text style={styles.stepLabel}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <Text style={styles.stepHeading}>{stepHeading}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {footer}
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
    backgroundColor: Colors.black,
  },
  backBtn: {
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: 1,
  },
  stepIndicator: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    marginBottom: 12,
  },
  stepBar: {
    flex: 1,
    height: 3,
  },
  stepDone: {
    backgroundColor: "rgba(57,255,20,0.4)",
  },
  stepActive: {
    backgroundColor: Colors.green,
  },
  stepIdle: {
    backgroundColor: Colors.white,
  },
  stepLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  stepHeading: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
