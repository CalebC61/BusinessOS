import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operator",
  description: "One verified action a day, scored in profit.",
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
