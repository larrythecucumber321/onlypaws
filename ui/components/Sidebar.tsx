"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#1a1b1e] transform transition-transform duration-200 ease-in-out z-40`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-primary/10">
            <div className="flex items-center">
              <div className="relative w-16 h-16">
                <Image
                  src="/logo.png"
                  alt="OnlyPaws Logo"
                  fill
                  style={{ objectFit: "contain" }}
                  priority
                />
              </div>
              <span className="text-3xl font-bold text-primary">OnlyPaws</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/marketplace"
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive("/marketplace")
                      ? "bg-[#00A6ED] text-white"
                      : "text-text hover:bg-primary/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  href="/gallery"
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive("/gallery")
                      ? "bg-[#00A6ED] text-white"
                      : "text-text hover:bg-primary/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="/leaderboard"
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive("/leaderboard")
                      ? "bg-[#00A6ED] text-white"
                      : "text-text hover:bg-primary/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Leaderboard
                </Link>
              </li>
            </ul>
          </nav>

          {/* Connect Button */}
          <div className="p-4 border-t border-primary/10">
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
