"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navItems = [
  { name: "Home", path: "/" },
  { name: "Marketplace", path: "/marketplace" },
  { name: "Gallery", path: "/gallery" },
  { name: "Leaderboard", path: "/leaderboard" },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden text-primary"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={`fixed top-0 left-0 h-full w-64 bg-secondary text-background transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static`}
      >
        <div className="p-6 h-full flex flex-col">
          <h1 className="text-2xl font-bold mb-8 text-primary">OnlyPaws</h1>
          <nav className="flex-grow">
            <ul>
              {navItems.map((item) => (
                <li key={item.path} className="mb-4">
                  <Link
                    href={item.path}
                    className={`block p-2 rounded ${
                      pathname === item.path
                        ? "bg-primary text-background font-bold"
                        : "text-background hover:bg-accent hover:text-background"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
