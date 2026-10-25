import type { Metadata } from "next";
import { Suspense } from "react";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import Navbar, { NavbarFallback } from "@/components/Navbar";
import Footer from "@/components/Footer";
import BannedPopup from "@/components/BannedPopup";
import { AppProvider } from "@/context/AppStore";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Root Over Education | Course Marketplace for Bangladesh",
  description:
    "Buy complete SSC, HSC, BSc, BBA and BA courses from verified teachers and learn chapter by chapter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} antialiased transition-colors duration-300 flex flex-col min-h-screen`}
      >
        <AppProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {/* Navbar reads the pathname, which is request-time data on dynamic routes */}
            <Suspense fallback={<NavbarFallback />}>
              <Navbar />
            </Suspense>
            <BannedPopup />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
