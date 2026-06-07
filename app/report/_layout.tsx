import { Stack } from "expo-router";
import { ReportProvider } from "../../context/ReportContext";

export default function ReportLayout() {
  return (
    <ReportProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="step-1-when" />
        <Stack.Screen name="step-2-where" />
        <Stack.Screen name="step-3-what" />
        <Stack.Screen name="step-4-details" />
        <Stack.Screen name="step-5-review" />
        <Stack.Screen name="result" />
      </Stack>
    </ReportProvider>
  );
}
