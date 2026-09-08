"use client";

import React, { useEffect, useState } from "react";
import {
  Send,
  Users,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  Target,
  BarChart3,
  Calendar,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";


// ============================================
// TYPES
// ============================================

interface DashboardData {
  tenant: {
    name: string;
    plan: string;
  } | null;
  smsBalance: {
    amount: number;
    currency: string;
  } | null;
  totalContacts: number;
  totalCampaigns: number;
  recentCampaigns: any[];
  smsStats: {
    summary: {
      total: number;
      delivered: number;
      failed: number;
      delivery_rate: number;
    };
  } | null;
}

// ============================================
// STATS GRID
// ============================================

function StatsGrid({ data }: { data: DashboardData }) {
  const stats = [
    {
      title: "Campagnes",
      value: data.totalCampaigns.toLocaleString(),
      icon: Send,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
      description: "Total créées",
    },
    {
      title: "Taux de Délivrance",
      value: data.smsStats?.summary?.delivery_rate
          ? `${data.smsStats.summary.delivery_rate.toFixed(1)}%`
          : '—',
      icon: CheckCircle2,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-600",
      // description: "Pas encore de données",
    },
    {
      title: "Contacts",
      value: data.totalContacts.toLocaleString(),
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-600",
      description: "Total enregistrés",
    },
    {
      title: "Solde SMS",
      value: data.smsBalance
        ? `${data.smsBalance.amount.toLocaleString()} ${data.smsBalance.currency}`
        : "—",
      icon: Zap,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-600",
      // description: data.tenant?.plan || "—",
    },
  ];


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="relative overflow-hidden border border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 group"
        >
          <div
            className={cn(
              "absolute top-0 right-0 w-32 h-32 opacity-[0.03] rounded-full -translate-y-8 translate-x-8 bg-gradient-to-br group-hover:opacity-[0.06] transition-opacity",
              stat.color
            )}
          />
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold text-foreground tracking-tight">
                  {stat.value}
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {stat.description}
                </span>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.textColor)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// RECENT CAMPAIGNS
// ============================================

const statusConfig: Record<string, { label: string; className: string }> = {
  sent: { label: "Envoyé", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  sending: { label: "En cours", className: "bg-blue-500/10 text-blue-600 border-blue-200" },
  scheduled: { label: "Programmé", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  draft: { label: "Brouillon", className: "bg-gray-500/10 text-gray-600 border-gray-200" },
  cancelled: { label: "Annulé", className: "bg-red-500/10 text-red-500 border-red-200" },
};

function RecentCampaigns({ campaigns }: { campaigns: any[] }) {
  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Campagnes récentes</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-primary" asChild>
            <a href="/campaigns">
              Voir tout
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune campagne</p>
            <p className="text-xs text-muted-foreground mt-1">Créez votre première campagne</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((campaign) => {
              const status = statusConfig[campaign.status] || statusConfig.draft;
              return (
                <div
                  key={campaign.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 border border-primary/10">
                    <Target className="h-4 w-4 text-primary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {campaign.total_recipients > 0
                        ? `${campaign.total_recipients} destinataires`
                        : "Aucun destinataire"}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold", status.className)}>
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// QUICK ACTIONS
// ============================================

function QuickActions() {
  const actions = [
    {
      title: "Nouvelle campagne",
      description: "Créer et envoyer un SMS",
      icon: Send,
      color: "from-blue-500 to-blue-600",
      href: "/campaigns",
    },
    {
      title: "Ajouter un contact",
      description: "Enregistrer un client",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      href: "/contacts",
    },
    {
      title: "Programmer un envoi",
      description: "Planifier pour plus tard",
      icon: Calendar,
      color: "from-amber-500 to-orange-500",
      href: "/campaigns",
    },
    {
      title: "Voir les stats",
      description: "Analytics détaillées",
      icon: BarChart3,
      color: "from-emerald-500 to-emerald-600",
      href: "/dashboard",
    },
  ];

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <a
            key={action.title}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-border hover:bg-muted/20 transition-all cursor-pointer"
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm",
                action.color
              )}
            >
              <action.icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{action.title}</p>
              <p className="text-[10px] text-muted-foreground">{action.description}</p>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    tenant: null,
    smsBalance: null,
    totalContacts: 0,
    totalCampaigns: 0,
    recentCampaigns: [],
    smsStats: null
  });

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const [tenant, contacts, campaigns, balance, smsStats] = await Promise.all([
          api.getTenant(),
          api.getContacts({ page: 1, page_size: 1 }),
          api.getCampaigns({ page: 1, page_size: 5 }),
          api.getSmsBalance().catch(() => null),
          api.getSmsStats('30d').catch(() => null)
        ]);

        setData({
          tenant: {
            name: tenant.name,
            plan: tenant.plan,
          },
          smsBalance: balance ? { amount: balance.amount, currency: balance.currency } : null,
          totalContacts: contacts.total,
          totalCampaigns: campaigns.total,
          recentCampaigns: campaigns.items,
          smsStats: smsStats
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Bonjour{user?.first_name ? `, ${user.first_name}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Voici un aperçu de votre activité
          {data.tenant?.name ? ` — ${data.tenant.name}` : ""}
        </p>
      </div>

      {/* Stats */}
      <StatsGrid data={data} />

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentCampaigns campaigns={data.recentCampaigns} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
