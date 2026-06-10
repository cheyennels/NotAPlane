import { createContext, ReactNode, useContext, useState } from "react";

export type MapFilters = {
  showExplained: boolean;
  showPartial: boolean;
  showUnexplained: boolean;
  showPending: boolean;
  showFlightPaths: boolean;
  showCelestial: boolean;
  showSatellites: boolean;
  timeRange: "week" | "all";
};

export const DEFAULT_FILTERS: MapFilters = {
  showExplained: true,
  showPartial: true,
  showUnexplained: true,
  showPending: true,
  showFlightPaths: false,
  showCelestial: false,
  showSatellites: false,
  timeRange: "all",
};

type FilterContextType = {
  filters: MapFilters;
  updateFilters: (filters: MapFilters) => void;
  resetFilters: () => void;
};

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);

  function updateFilters(newFilters: MapFilters) {
    setFilters(newFilters);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <FilterContext.Provider value={{ filters, updateFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
