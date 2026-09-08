"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Send,
  Moon,
  Sun,
  BarChart3,
  Cpu,
  CreditCard,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, color: "text-blue-400" },
  { name: "Inscriptions", href: "/admin/registrations", icon: Users, color: "text-cyan-400" },
  { name: "Entreprises", href: "/admin/tenants", icon: Building2, color: "text-emerald-400" },
  { name: "Utilisateurs", href: "/admin/users", icon: Users, color: "text-purple-400" },
  { name: "Facturation", href: "/admin/billing", icon: CreditCard, color: "text-orange-400" },
  { name: "Workers", href: "/admin/workers", icon: Cpu, color: "text-amber-400" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user && user.role !== "superadmin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Charger les notifications
  useEffect(() => {
    api.getNotifications({ page: 1, page_size: 1, unread_only: true })
      .then((data) => setUnreadCount(data.unread_count))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  if (!user || user.role !== "superadmin") return null;

  const initials = user
    ? `${(user.first_name || "S")[0]}${(user.last_name || "A")[0]}`.toUpperCase()
    : "SA";
  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Super Admin"
    : "Super Admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen flex flex-col",
          "bg-slate-900 border-r border-slate-800",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
              <Shield className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">SMS Pro</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              ADMINISTRATION
            </p>
          )}
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/5",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn("h-4.5 w-4.5 flex-shrink-0", isActive ? "text-orange-400" : item.color)} />
                  {!collapsed && <span className="flex-1">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {!collapsed && (
            <>
              <Separator className="my-4 bg-slate-800" />
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Send className="h-4.5 w-4.5 flex-shrink-0 text-cyan-400" />
                <span>Retour plateforme</span>
              </Link>
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center flex-1 h-8 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center justify-center h-8 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors",
                collapsed ? "w-full" : "w-8"
              )}
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header
        className={cn(
          "fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6",
          "bg-background/80 backdrop-blur-xl border-b border-border transition-all duration-300",
          collapsed ? "left-[72px]" : "left-[260px]"
        )}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  api.getNotifications({ page: 1, page_size: 10 })
                    .then((data) => { setNotifications(data.items); setUnreadCount(data.unread_count); })
                    .catch(() => {});
                }
              }}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-11 z-50 w-80 bg-background rounded-xl border border-border shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        className="text-[11px] text-orange-500 hover:underline"
                        onClick={async () => {
                          await api.markAllNotificationsRead();
                          setUnreadCount(0);
                          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                        }}
                      >
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={cn(
                            "px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer",
                            !notif.is_read && "bg-orange-500/5"
                          )}
                          onClick={async () => {
                            if (!notif.is_read) {
                              await api.markNotificationRead(notif.id);
                              setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
                              setUnreadCount((prev) => Math.max(0, prev - 1));
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {!notif.is_read && <div className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">{notif.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {notif.created_at ? new Date(notif.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-orange-400/30">
              <AvatarFallback className="text-xs font-semibold bg-orange-500/10 text-orange-500">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col">
              <span className="text-sm font-medium text-foreground leading-none">
                {displayName}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Super Admin
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          collapsed ? "pl-[72px]" : "pl-[260px]"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
