import { Colors } from "@/constants/colors";

export type MapSighting = {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
};

export function getSightingPinColor(status: string) {
  switch (status) {
    case "explained":
      return Colors.blue;
    case "partial":
      return Colors.yellow;
    case "unexplained":
      return Colors.red;
    default:
      return Colors.green;
  }
}
