import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "POLARIS", description: "POLARIS: a polar expedition, ice and climate operations planner. Synthetic data, not for real navigation." };
export const viewport: Viewport = { themeColor: "#07121B", width: "device-width", initialScale: 1 };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
