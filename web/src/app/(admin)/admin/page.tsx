"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Send,
  MessageSquare,
  CreditCard,
  Target,
  ArrowUpRight,
  Activity,
  Shield,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [statsData, tenantsData, usersData] = await Promise.all([
          api.getAdminStats(),
          api.getAdminTenants({ page: 1, page_size: 5 }),
          api.getAdminUsers({ page: 1, page_size: 5 }),
        ]);
        setStats(statsData);
        setTenants(tenantsData.items);
        setRecentUsers(usersData.items);
      } catch (err) {
        console.error("Admin load error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Entreprises",
      value: stats?.total_tenants || 0,
      subtitle: `${stats?.active_tenants || 0} actives`,
      icon: Building2,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
    },
    {
      title: "Utilisateurs",
      value: stats?.total_users || 0,
      subtitle: "Total inscrits",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-600",
    },
    {
      title: "Contacts",
      value: stats?.total_contacts || 0,
      subtitle: "Tous tenants",
      icon: Users,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-600",
    },
    {
      title: "SMS envoyés",
      value: stats?.messages_sent || 0,
      subtitle: `${stats?.messages_failed || 0} échoués`,
      icon: Send,
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-500/10",
      textColor: "text-cyan-600",
    },
    {
      title: "Campagnes",
      value: stats?.total_campaigns || 0,
      subtitle: "Total créées",
      icon: Target,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-600",
    },
    {
      title: "Automations",
      value: stats?.total_automations || 0,
      subtitle: "Configurées",
      icon: Activity,
      color: "from-rose-500 to-pink-600",
      bgColor: "bg-rose-500/10",
      textColor: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Administration
              </h1>
              <p className="text-sm text-muted-foreground">
                Vue d'ensemble de la plateforme SMS Pro
              </p>
            </div>
          </div>
        </div>
        <Button asChild className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20">
          <a href="/admin/tenants">
            <Building2 className="mr-2 h-4 w-4" />
            Gérer les entreprises
          </a>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden border border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 group">
            <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-[0.03] rounded-full -translate-y-8 translate-x-8 bg-gradient-to-br group-hover:opacity-[0.06]", stat.color)} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">
                    {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">{stat.subtitle}</span>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.textColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Entreprises récentes</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-orange-500" asChild>
                <a href="/admin/tenants">
                  Voir tout <ArrowUpRight className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tenants.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune entreprise</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Building2 className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={cn("text-[10px]",
                        tenant.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-red-500/10 text-red-500 border-red-200"
                      )}>
                        {tenant.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Utilisateurs récents</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-orange-500" asChild>
                <a href="/admin/users">
                  Voir tout <ArrowUpRight className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucun utilisateur</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Users className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.first_name || ""} {user.last_name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.tenant_name}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]",
                      user.role === "superadmin" ? "bg-orange-500/10 text-orange-600 border-orange-200" :
                      user.role === "owner" ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                      "bg-gray-500/10 text-gray-600 border-gray-200"
                    )}>
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
