import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Edu značka",
    template: "%s — Edu značka",
  },
  description:
    "Která videa na YouTube odpovídají současnému vědeckému konsenzu — " +
    "ověřeno odborníky z oboru, pod jejich jménem.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
