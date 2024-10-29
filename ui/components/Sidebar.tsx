"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside sidebar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <button
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-6 w-6" />
      </button>

      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full md:h-auto w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out z-50 md:relative md:transform-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <h1 className="text-2xl font-bold text-primary mb-8">OnlyPaws</h1>
          <nav className="space-y-4 flex-grow">
            <Link
              href="/"
              className="block text-gray-300 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/marketplace"
              className="block text-gray-300 hover:text-white transition-colors"
            >
              Marketplace
            </Link>
            <Link
              href="/gallery"
              className="block text-gray-300 hover:text-white transition-colors"
            >
              Gallery
            </Link>
            <Link
              href="/leaderboard"
              className="block text-gray-300 hover:text-white transition-colors"
            >
              Leaderboard
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
