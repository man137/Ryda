import 'remixicon/fonts/remixicon.css';
import 'leaflet/dist/leaflet.css';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers"; // ✅ Use a separate Client Component for SessionProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Ryda — Your Premium Ride",
  description: "Get a reliable ride in minutes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers> {/* ✅ Wrap children inside SessionProvider */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
