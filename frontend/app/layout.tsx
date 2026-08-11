import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrossVal",
  description: "Multi-Rate Pricing Calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
