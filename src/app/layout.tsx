import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { StoreProvider } from "@/lib/store/StoreProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { SessionProvider } from "@/components/providers/SessionProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Pet Love Community",
  description: "Enterprise pet adoption and community platform connecting loving families with pets in need",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-beige`}
      >
        <SessionProvider>
          <StoreProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </StoreProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
