"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme as __useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  Send,
  MessageSquare,
  FileText,
  Zap,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  FolderKanban,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-500" },
      { name: "Campagnes", href: "/campaigns", icon: Send, color: "text-purple-500" },
      { name: "Contacts", href: "/contacts", icon: Users, color: "text-emerald-500" },
      { name: "Groupes", href: "/groups", icon: FolderKanban, color: "text-cyan-500" },
      { name: "Messages", href: "/messages", icon: MessageSquare, color: "text-orange-500" },
    ],
  },
  {
    label: "OUTILS",
    items: [
      { name: "Templates", href: "/templates", icon: FileText, color: "text-pink-500" },
      { name: "Programmation d'envoi", href: "/automations", icon: Zap, color: "text-amber-500" },
    ],
  },
  {
    label: "WHATSAPP",
    items: [
      { name: "WhatsApp", href: "/whatsapp", icon: MessageCircle, color: "text-green-500" },
    ],
  },
  {
    label: "COMPTE",
    items: [
      { name: "Statistiques", href: "/credits", icon: BarChart3, color: "text-indigo-500" },
      { name: "Facturation", href: "/billing", icon: CreditCard, color: "text-orange-500", ownerOnly: true },
      { name: "Paramètres", href: "/settings", icon: Settings, color: "text-gray-500" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  user: any;
  tenant: any;
  smsBalance: any;
}

function Sidebar({ collapsed, onToggle, onLogout, user, tenant, smsBalance }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col",
        "bg-sidebar border-r border-sidebar-border",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
            <Send className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground">
                SMS Pro
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Marketing Platform
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigation.map((group, idx) => (
          <div key={group.label} className={cn(idx > 0 && "mt-6")}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items
                .filter((item) => !(item as any).ownerOnly || user?.role === "owner")
                .map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      "transition-all duration-200",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive &&
                        "bg-primary/10 text-primary shadow-sm border border-primary/20",
                      !isActive && "text-muted-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 flex-shrink-0",
                        isActive ? "text-primary" : item.color
                      )}
                    />
                    {!collapsed && (
                        <span className="flex-1">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (smsBalance || tenant) && (
          <div className="flex items-center gap-3 rounded-lg p-2 mb-2 bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {smsBalance
                  ? `${smsBalance.amount.toLocaleString()} ${smsBalance.currency}`
                  : "—"}
              </p>
              {/*<p className="text-[10px] text-muted-foreground capitalize">*/}
              {/*  {tenant ? `Plan ${tenant.plan}` : "—"}*/}
              {/*</p>*/}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="flex items-center justify-center flex-1 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onLogout}
            className={cn(
              "flex items-center justify-center h-8 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors",
              collapsed ? "w-full" : "w-8"
            )}
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

interface HeaderProps {
  sidebarCollapsed: boolean;
  user: any;
}

function Header({ sidebarCollapsed, user }: HeaderProps) {
  const { theme, setTheme } = __useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Charger le compteur de notifications non lues
  useEffect(() => {
    api.getNotifications({ page: 1, page_size: 1, unread_only: true })
      .then((data) => setUnreadCount(data.unread_count))
      .catch(() => {});
  }, []);

  const initials = user
    ? `${(user.first_name || "?")[0]}${(user.last_name || "?")[0]}`.toUpperCase()
    : "??";
  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "";
  const roleLabel = user?.role === "superadmin" ? "Super Admin" :
    user?.role === "owner" ? "Propriétaire" :
    user?.role === "admin" ? "Administrateur" : "Membre";

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16",
        "flex items-center justify-between px-6",
        "bg-background/80 backdrop-blur-xl border-b border-border",
        "transition-all duration-300",
        sidebarCollapsed ? "left-[72px]" : "left-[260px]"
      )}
    >
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher contacts, campagnes..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

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

          {/* Dropdown notifications */}
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-11 z-50 w-80 bg-background rounded-xl border border-border shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
                  {unreadCount > 0 && (
                    <button
                      className="text-[11px] text-primary hover:underline"
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
                          !notif.is_read && "bg-primary/5"
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
                          {!notif.is_read && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
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

        <Separator orientation="vertical" className="h-6 mx-2" />

        <div className="flex items-center gap-3 pl-2">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src="/avatar.png" />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-medium text-foreground leading-none">
              {displayName}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const { user, tenant, smsBalance, logout, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
        user={user}
        tenant={tenant}
        smsBalance={smsBalance}
      />
      <Header sidebarCollapsed={sidebarCollapsed} user={user} />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "pl-[72px]" : "pl-[260px]"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
