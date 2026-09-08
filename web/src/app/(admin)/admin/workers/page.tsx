"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Clock,
  Send,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Calendar,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function WorkersPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = () => {
    setIsLoading(true);
    api.getWorkersStatus()
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const formatDate = (d: string | null) => {
    if (!d) return "Jamais";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const timeAgo = (d: string | null) => {
    if (!d) return "";
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return `il y a ${diff}s`;
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)}j`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Workers</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoring des processus d'envoi automatique</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Rafraîchir
        </Button>
      </div>

      {/* Workers Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scheduler */}
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Scheduler</CardTitle>
                  <p className="text-xs text-muted-foreground">Campagnes programmées</p>
                </div>
              </div>
              <Badge variant="outline" className={cn("text-xs",
                data?.scheduler?.status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                  : "bg-gray-500/10 text-gray-500 border-gray-200"
              )}>
                {data?.scheduler?.status === "active" ? "Actif" : "En veille"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-lg font-bold text-foreground">{data?.scheduler?.pending_campaigns || 0}</p>
                <p className="text-[10px] text-muted-foreground">En attente</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-lg font-bold text-foreground">{data?.scheduler?.campaigns_last_24h || 0}</p>
                <p className="text-[10px] text-muted-foreground">Envoyées (24h)</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière exécution</span>
                <span className="text-foreground font-medium">
                  {data?.scheduler?.last_run_at ? timeAgo(data.scheduler.last_run_at) : "Jamais"}
                </span>
              </div>
              {data?.scheduler?.last_campaign_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière campagne</span>
                  <span className="text-foreground font-medium truncate max-w-[150px]">{data.scheduler.last_campaign_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fréquence</span>
                <span className="text-foreground font-medium">Toutes les 60s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automation Worker */}
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Automation Worker</CardTitle>
                  <p className="text-xs text-muted-foreground">Envois automatiques</p>
                </div>
              </div>
              <Badge variant="outline" className={cn("text-xs",
                data?.automation_worker?.status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                  : "bg-gray-500/10 text-gray-500 border-gray-200"
              )}>
                {data?.automation_worker?.status === "active" ? "Actif" : "En veille"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-lg font-bold text-foreground">{data?.automation_worker?.active_automations || 0}</p>
                <p className="text-[10px] text-muted-foreground">Automations actives</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-lg font-bold text-foreground">{data?.automation_worker?.total_sms_sent || 0}</p>
                <p className="text-[10px] text-muted-foreground">SMS envoyés (total)</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière exécution</span>
                <span className="text-foreground font-medium">
                  {data?.automation_worker?.last_run_at ? timeAgo(data.automation_worker.last_run_at) : "Jamais"}
                </span>
              </div>
              {data?.automation_worker?.last_automation_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière automation</span>
                  <span className="text-foreground font-medium truncate max-w-[150px]">{data.automation_worker.last_automation_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fréquence</span>
                <span className="text-foreground font-medium">Toutes les 5 min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global stats 24h */}
      <Card className="border border-border/50">
        <CardContent className="flex items-center gap-6 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
            <Send className="h-5 w-5 text-cyan-500" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{data?.global?.messages_last_24h || 0}</p>
              <p className="text-xs text-muted-foreground">Messages envoyés (24h)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{data?.global?.messages_failed_24h || 0}</p>
              <p className="text-xs text-muted-foreground">Échoués (24h)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recent_activity || data.recent_activity.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recent_activity
                .sort((a: any, b: any) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
                .slice(0, 10)
                .map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/20">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg",
                      item.type === "campaign" ? "bg-blue-500/10" : "bg-amber-500/10"
                    )}>
                      {item.type === "campaign"
                        ? <Target className="h-4 w-4 text-blue-500" />
                        : <Zap className="h-4 w-4 text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <Badge variant="outline" className="text-[9px]">
                          {item.type === "campaign" ? "Campagne" : "Automation"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {item.total_sent} envoyé(s){item.total_failed > 0 ? `, ${item.total_failed} échoué(s)` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">{formatDate(item.executed_at)}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(item.executed_at)}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border border-border/50 bg-muted/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Lancement des workers</p>
              <p className="text-xs text-muted-foreground mt-1">
                Les workers doivent être lancés manuellement sur le serveur :
              </p>
              <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground bg-background rounded-lg p-3 border border-border/50">
                <p><span className="text-emerald-500">$</span> python run_scheduler.py</p>
                <p><span className="text-emerald-500">$</span> python run_automations.py</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
