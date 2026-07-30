import { createContext, ReactNode, useContext, useState } from "react";

export type ReportForm = {
  // Step 1 - When
  date: string;
  time: string;
  duration: string;
  // Step 2 - Where
  latitude: number;
  longitude: number;
  // Step 3 - What
  description: string;
  shape: string;
  colors: string[];
  sound: string;
  photoUris: string[];
  // Step 4 - Details
  direction: string;
  altitude: string;
  movement: string;
  speed: string;
};

// Fallback pin when the user has no saved account location. step-2-where
// replaces this with the account location on mount when it's still untouched.
export const DEFAULT_REPORT_LATITUDE = 44.9778;
export const DEFAULT_REPORT_LONGITUDE = -93.265;

const defaultForm: ReportForm = {
  date: "",
  time: "",
  duration: "",
  latitude: DEFAULT_REPORT_LATITUDE,
  longitude: DEFAULT_REPORT_LONGITUDE,
  description: "",
  shape: "",
  colors: [],
  sound: "",
  photoUris: [],
  direction: "",
  altitude: "",
  movement: "",
  speed: "",
};

type ReportContextType = {
  form: ReportForm;
  updateForm: (fields: Partial<ReportForm>) => void;
  resetForm: () => void;
};

const ReportContext = createContext<ReportContextType | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<ReportForm>(defaultForm);

  function updateForm(fields: Partial<ReportForm>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function resetForm() {
    setForm(defaultForm);
  }

  return (
    <ReportContext.Provider value={{ form, updateForm, resetForm }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReport must be used within a ReportProvider");
  }
  return context;
}
