"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Building2,
  Phone,
  Mail,
  Radio,
  AtSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function AdminRegistrationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await api.getPendingRegistrations({ page: 1, page_size: 50 });
      setRegistrations(data?.items || []);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(tenantId: string) {
    setConfirmApprove(null);
    setActionLoading(tenantId);
    try {
      await api.approveRegistration(tenantId);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(tenantId: string, name: string) {
    if (!confirm(`Rejeter et supprimer la demande de "${name}" ?`)) return;
    setActionLoading(tenantId);
    try {
      await api.rejectRegistration(tenantId);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Demandes d'inscription</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Validez ou rejetez les nouvelles inscriptions
        </p>
      </div>

      {registrations.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Aucune demande en attente</p>
            <p className="text-xs text-muted-foreground mt-1">Les nouvelles inscriptions apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {registrations.length} demande{registrations.length > 1 ? "s" : ""} en attente
          </p>
          {registrations.map((reg) => (
            <Card key={reg.id} className="border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                        <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{reg.company_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {reg.created_at ? new Date(reg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{reg.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{reg.phone || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Radio className="h-3.5 w-3.5" />
                        <span>Sender ID : <span className="font-medium text-foreground">{reg.sender_id || "—"}</span></span>
                      </div>
                      {reg.owner && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AtSign className="h-3.5 w-3.5" />
                          <span>{reg.owner.username} — {reg.owner.first_name} {reg.owner.last_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      size="sm"
                      onClick={() => setConfirmApprove(reg)}
                      disabled={actionLoading === reg.id}
                    >
                      {actionLoading === reg.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={() => handleReject(reg.id, reg.company_name)}
                      disabled={actionLoading === reg.id}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Popup de confirmation */}
      {confirmApprove && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmApprove(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Approuver l'inscription</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Activer le compte de "{confirmApprove.company_name}" ?
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Le propriétaire recevra un SMS de confirmation avec ses identifiants de connexion.
              </p>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmApprove(null)}>
                  Annuler
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(confirmApprove.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmer
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
