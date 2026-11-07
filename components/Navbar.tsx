"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, User, ChevronDown, Menu, X, LogOut, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { listNotifications, markNotificationsRead } from "@/lib/groupOrders";
import type { Notification } from "@/types/groupOrder";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const notificationUserId = user?.id;

  const fetchNotifications = useCallback(async () => {
    if (!notificationUserId) return;
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      setNotifications(await listNotifications(notificationUserId));
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Could not load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, [notificationUserId]);

  useEffect(() => {
    if (notificationUserId) void fetchNotifications();
  }, [notificationUserId, fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    try {
      await markNotificationsRead(user.id);
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Could not update notifications.");
    }
  };

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const savedCart = localStorage.getItem("eskort-checkout-cart");
        const products = savedCart ? JSON.parse(savedCart).products ?? [] : [];
        setCartItemCount(products.reduce((total: number, item: { quantity?: number }) => total + (item.quantity ?? 0), 0));
      } catch {
        setCartItemCount(0);
      }
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("eskort-cart-updated", updateCartCount);
    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("eskort-cart-updated", updateCartCount);
    };
  }, []);

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

          <div className="flex items-center gap-3 ml-auto">
            <Link
              href="/recipes"
              aria-current={pathname === "/recipes" ? "page" : undefined}
              className={`hidden sm:inline-flex rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/recipes"
                  ? "bg-white/10 text-eskort-yellow"
                  : "text-gray-200 hover:text-eskort-yellow"
              }`}
            >
              Recipes
            </Link>
            <Link href="/checkout" aria-label="Shopping cart and checkout" className="text-gray-300 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 relative">
              <ShoppingCart size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-eskort-yellow text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            </Link>
            {user ? (
              <>
              <div className="relative">
                <button type="button" aria-label={`Notifications${notifications.some((item) => !item.read) ? `, ${notifications.filter((item) => !item.read).length} unread` : ""}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-gray-200 hover:bg-white/10 hover:text-white">
                  <Bell size={20} />
                  {notifications.filter((item) => !item.read).length > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-eskort-red px-1 text-[10px] font-bold text-white">{notifications.filter((item) => !item.read).length}</span>}
                </button>
                {notificationsOpen && <div className="absolute right-0 top-full z-[60] mt-2 w-[min(92vw,22rem)] rounded-xl border border-gray-700 bg-eskort-black p-3 shadow-2xl">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-700 pb-2">
                    <h2 className="font-semibold text-white">Notifications</h2>
                    <button type="button" onClick={() => void markAllRead()} disabled={!notifications.some((item) => !item.read)} className="min-h-10 px-2 text-xs font-semibold text-eskort-yellow disabled:opacity-50">Mark all read</button>
                  </div>
                  {notificationsLoading ? <div className="space-y-2 py-3" aria-label="Loading notifications">{[1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded bg-gray-800" />)}</div>
                    : notificationsError ? <div className="py-3 text-sm text-red-200"><p>{notificationsError}</p><button type="button" onClick={() => void fetchNotifications()} className="mt-2 min-h-10 text-eskort-yellow underline">Retry</button></div>
                    : notifications.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">You&apos;re all caught up.</p>
                    : <ul className="max-h-80 overflow-y-auto">{notifications.map((notification) => <li key={notification.id} className="border-b border-gray-800 last:border-0">
                      <Link href={notification.type === "confirm_fulfilment" ? `/my-orders/group/${notification.groupOrderId}/fulfilment` : `/my-orders/group/${notification.groupOrderId}`} onClick={() => setNotificationsOpen(false)} className="block rounded-lg px-2 py-3 hover:bg-white/5">
                        <p className={`text-sm font-semibold ${notification.read ? "text-gray-300" : "text-white"}`}>{notification.title}{!notification.read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-eskort-yellow" aria-label="Unread" />}</p>
                        <p className="mt-1 text-xs text-gray-400">{notification.body}</p>
                      </Link>
                    </li>)}</ul>}
                </div>}
              </div>
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  aria-expanded={accountMenuOpen}
                  aria-label="Open account menu"
                  className="flex items-center gap-2 text-gray-200 hover:text-white transition-colors rounded-md px-2 py-1.5 hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-eskort-yellow text-xs font-bold text-black">
                    {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                  </span>
                  <span className="max-w-28 truncate text-sm">{user.user_metadata?.full_name || user.email?.split("@")[0] || "Account"}</span>
                  <ChevronDown size={14} />
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-gray-700 bg-eskort-black py-1 shadow-xl">
                    <Link href="/account/orders" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-200 hover:bg-white/10">My Orders</Link>
                    <Link href="/account" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-200 hover:bg-white/10">Profile</Link>
                    <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-xs text-gray-200 hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
              >
                <User size={18} />
                <span>Sign In / Sign Up</span>
              </Link>
            )}
            {user && (
              <Link href="/account" aria-label="Profile" title="Profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-eskort-yellow text-xs font-bold text-black md:hidden">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
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
          <Link
            href="/recipes"
            aria-current={pathname === "/recipes" ? "page" : undefined}
            className={`block rounded-md px-2 py-2 text-sm font-medium ${
              pathname === "/recipes"
                ? "bg-white/10 text-eskort-yellow"
                : "text-gray-200 hover:text-eskort-yellow"
            }`}
            onClick={() => setMobileOpen(false)}
          >
            Recipes
          </Link>
          {user ? (
            <div className="space-y-1 border-t border-gray-800 pt-2">
              <p className="px-2 text-xs text-gray-500">{user.user_metadata?.full_name || user.email}</p>
              <Link href="/account/orders" className="block py-2 text-sm text-gray-200" onClick={() => setMobileOpen(false)}>My Orders</Link>
              <Link href="/account" className="block py-2 text-sm text-gray-200" onClick={() => setMobileOpen(false)}>Profile</Link>
              <button
                onClick={() => { setMobileOpen(false); void handleSignOut(); }}
                className="flex items-center gap-2 py-2 text-sm font-medium text-red-400"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="block text-eskort-yellow text-sm font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Sign In / Sign Up
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
