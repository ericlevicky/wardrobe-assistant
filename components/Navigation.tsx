"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

const navLinks = [
  { href: "/wardrobe", label: "My Wardrobe", icon: "👗" },
  { href: "/outfits", label: "Outfit Ideas", icon: "✨" },
  { href: "/try-on", label: "Try On", icon: "🪄" },
];

export default function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  if (!session) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/wardrobe" className="flex items-center gap-2 font-bold text-gray-900">
            <span className="text-2xl">👗</span>
            <span className="hidden sm:block text-lg">Wardrobe Assistant</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{link.icon}</span>
                <span className="hidden sm:block">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === "feminine" ? "masculine" : "feminine"} theme`}
              aria-label={`Switch to ${theme === "feminine" ? "masculine" : "feminine"} theme`}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {theme === "masculine" ? "🌸" : "⚔️"}
            </button>

            {session.user?.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="hidden md:block text-sm text-gray-700">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
