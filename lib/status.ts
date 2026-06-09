import { Colors } from "@/constants/colors";

export function getStatusColor(status: string): string {
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

export function getStatusLabel(status: string): string {
  switch (status) {
    case "explained":
      return "Explained";
    case "partial":
      return "Partial Match";
    case "unexplained":
      return "Unexplained";
    default:
      return "Pending";
  }
}
