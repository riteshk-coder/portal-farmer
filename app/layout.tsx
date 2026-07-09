import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Modal } from "@/components/Modal";
import { Toast } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Digital Buyer Access Portal - Agri-Commodity Platform",
  description: "Single-tenant agricultural commodity trading platform and escrow simulator for turmeric lots.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AppProvider>
            {children}
            <Modal />
            <Toast />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
