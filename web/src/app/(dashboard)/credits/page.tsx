"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Send,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Loader2,
  Zap,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function CreditsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState<any>(null);
  const smsBalance = useAuthStore((state) => state.smsBalance);

  useEffect(() => {
    setIsLoading(true);
    api.getSmsStats(period)
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxValue = stats?.chart_data?.length > 0
    ? Math.max(...stats.chart_data.map((d: any) => d.total), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Statistiques SMS</h1>
          <p className="text-sm text-muted-foreground mt-1">Consommation et performance de vos envois</p>
        </div>
        <div className="flex gap-2">
          {[
            { value: "7d", label: "7 jours" },
            { value: "30d", label: "30 jours" },
            { value: "90d", label: "90 jours" },
            { value: "12m", label: "12 mois" },
          ].map((p) => (
            <Button key={p.value} variant={period === p.value ? "default" : "outline"} size="sm"
              onClick={() => setPeriod(p.value)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Solde actuel */}
      {smsBalance && (
        <Card className="border border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Solde actuel</p>
              <p className="text-2xl font-bold text-foreground">
                {smsBalance.amount.toLocaleString()} {smsBalance.currency}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Send}
            label="Total envoyés"
            value={stats.summary.total}
            color="text-blue-600"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            icon={CheckCircle2}
            label="Réussis"
            value={stats.summary.sent}
            color="text-emerald-600"
            bgColor="bg-emerald-500/10"
            subtitle={`${stats.summary.delivery_rate}% de réussite`}
          />
          <StatCard
            icon={XCircle}
            label="Échoués"
            value={stats.summary.failed}
            color="text-red-500"
            bgColor="bg-red-500/10"
          />
          <StatCard
            icon={TrendingUp}
            label="Moy. / jour"
            value={stats.chart_data.length > 0
              ? Math.round(stats.summary.total / stats.chart_data.length)
              : 0}
            color="text-purple-600"
            bgColor="bg-purple-500/10"
          />
        </div>
      )}

      {/* Chart */}
      {stats && stats.chart_data.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Activité d'envoi</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">SMS envoyés par jour</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Réussis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Échoués</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-end gap-1 h-48">
              {stats.chart_data.map((item: any, index: number) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end h-40">
                    <div
                      className="flex-1 bg-primary/20 rounded-t-sm relative overflow-hidden group cursor-pointer"
                      style={{ height: `${(item.sent / maxValue) * 100}%`, minHeight: item.sent > 0 ? "4px" : "0" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-primary to-primary/60 opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {item.failed > 0 && (
                      <div
                        className="flex-1 bg-red-500/20 rounded-t-sm relative overflow-hidden"
                        style={{ height: `${(item.failed / maxValue) * 100}%`, minHeight: "4px" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-red-500 to-red-400/60 opacity-80" />
                      </div>
                    )}
                  </div>
                  {stats.chart_data.length <= 14 && (
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {new Date(item.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data */}
      {stats && stats.chart_data.length === 0 && (
        <Card className="border border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Aucune donnée</p>
            <p className="text-xs text-muted-foreground mt-1">Pas d'envoi sur cette période</p>
          </CardContent>
        </Card>
      )}

      {/* Répartition par type */}
      {stats && stats.summary.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Par type de message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TypeBar
                label="Marketing"
                value={stats.summary.by_type.marketing}
                total={stats.summary.total}
                color="bg-blue-500"
              />
              <TypeBar
                label="Transactionnel"
                value={stats.summary.by_type.transactional}
                total={stats.summary.total}
                color="bg-emerald-600"
              />
              <TypeBar
                label="Promotionnel"
                value={stats.summary.by_type.promotional}
                total={stats.summary.total}
                color="bg-rose-600"
              />
              <TypeBar
                label="Anniversaire"
                value={stats.summary.by_type.birthday}
                total={stats.summary.total}
                color="bg-purple-600"
              />
              <TypeBar
                  label="Rappel"
                  value={stats.summary.by_type.reminder}
                  total={stats.summary.total}
                  color="bg-amber-600"
              />

            </CardContent>
          </Card>

          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taux de réussite</span>
                <span className="text-sm font-semibold text-emerald-600">{stats.summary.delivery_rate}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.summary.delivery_rate}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stats.summary.sent} réussis</span>
                <span>{stats.summary.failed} échoués</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor, subtitle }: {
  icon: any; label: string; value: number; color: string; bgColor: string; subtitle?: string;
}) {
  return (
    <Card className="border border-border/50">
      <CardContent className="flex items-center gap-3 p-5">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bgColor)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function TypeBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value.toLocaleString()} ({percentage}%)</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
