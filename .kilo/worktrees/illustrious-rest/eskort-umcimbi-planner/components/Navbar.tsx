"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, User, MapPin, ChevronDown, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const router = useRouter();
  const { user, signOut, role, loading: authLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = ["Recipes", "Quality", "About", "Specials", "What's New"];

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-eskort-black border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="font-display text-3xl text-eskort-yellow tracking-widest select-none">
              ESKORT
            </div>
          </Link>

          <button className="hidden md:flex items-center gap-1.5 text-gray-300 hover:text-white text-sm transition-colors ml-4">
            <MapPin size={14} className="text-eskort-yellow" />
            <span className="font-medium">Store Name</span>
            <ChevronDown size={14} />
          </button>

          <div className="hidden md:flex items-center gap-6 ml-auto mr-6">
            {navLinks.map((link) => (
              <Link key={link} href="#" className="nav-link text-sm font-medium">
                {link}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button className="text-gray-300 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10">
              <Search size={20} />
            </button>
            <button className="text-gray-300 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 relative">
              <ShoppingCart size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-eskort-yellow text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </button>
            {!authLoading && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={role === "admin" ? "/admin/dashboard" : "/account"}
                  className="text-gray-300 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
                  title={user.email || "Account"}
                >
                  <span className="text-xs font-bold text-eskort-yellow">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1.5 rounded-full hover:bg-red-900/20"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-gray-300 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
              >
                <User size={20} />
              </Link>
            )}
            <button
              className="md:hidden text-gray-300 hover:text-white transition-colors p-1.5"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-eskort-black border-t border-gray-800 px-4 py-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-3">
            <MapPin size={14} className="text-eskort-yellow" />
            <span>Store Name</span>
            <ChevronDown size={12} />
          </div>
          {navLinks.map((link) => (
            <Link
              key={link}
              href="#"
              className="block text-gray-300 hover:text-white text-sm font-medium py-2 border-b border-gray-800"
              onClick={() => setMobileOpen(false)}
            >
              {link}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center justify-between pt-2">
              <Link
                href={role === "admin" ? "/admin/dashboard" : "/account"}
                className="text-eskort-yellow text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                My Account
              </Link>
              <button
                onClick={handleSignOut}
                className="text-red-400 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="block text-eskort-yellow text-sm font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
