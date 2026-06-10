import { ReactNode } from "react";

/** Native builds render the app full-screen. */
export default function WebPhoneFrame({ children }: { children: ReactNode }) {
  return children;
}
