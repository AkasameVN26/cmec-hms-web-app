import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AntdProvider from "@/providers/AntdRegistry";
import { AuthProvider } from "@/providers/AuthProvider";
import { TopProgressBar } from "@/components/TopProgressBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CMEC - Hệ thống quản lý bệnh viện",
  description: "Giao diện quản lý cho hệ thống bệnh viện CMEC",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <TopProgressBar />
        <AuthProvider>
          <AntdProvider>{children}</AntdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
