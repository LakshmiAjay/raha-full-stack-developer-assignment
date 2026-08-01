import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Raha Fielddesk",
  description: "Field activity and distance records, without the paperwork.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
