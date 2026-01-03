import type { Metadata } from "next";
import "./globals.css";
import ToasterClient from "./providers/ToasterClient";

export const metadata: Metadata = {
  title: "SafHer - Navigate Safely",
  description: "Find the safest routes to your destination",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ToasterClient />
      </body>
    </html>
  );
}
