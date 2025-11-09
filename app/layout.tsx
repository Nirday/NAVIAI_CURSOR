import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navi AI - AI-Powered Marketing Platform",
  description: "Complete AI-powered marketing platform for small businesses",
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
      </body>
    </html>
  );
}

