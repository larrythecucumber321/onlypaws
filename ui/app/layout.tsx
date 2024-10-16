import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "../components/Web3Provider";
import { Sidebar } from "../components/Sidebar";
import { ConnectButton } from "../components/ConnectButton";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "OnlyPaws",
  description: "A marketplace for bear paw images",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-background text-text`}>
        <Web3Provider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8">
              <header className="flex justify-end mb-8">
                <ConnectButton />
              </header>
              <main>{children}</main>
            </div>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
