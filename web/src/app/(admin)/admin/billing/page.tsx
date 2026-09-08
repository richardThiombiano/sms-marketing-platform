"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Building2,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  RefreshCw,
  Ban,
  Receipt,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function AdminBillingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "pending" | "subscriptions" | "recharges">("overview");

  // Modals
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [selectedTenant, setSelectedTenant] = useState("");
  const [months, setMonths] = useState(1);
  const [paymentRef, setPaymentRef] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRef, setRechargeRef] = useState("");
  const [rechargeNotes, setRechargeNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [statsData, subsData, rechData, tenantsData, pendingData] = await Promise.all([
        api.getAdminBillingStats().catch(() => null),
        api.getAdminSubscriptions({ page: 1, page_size: 50 }).catch(() => ({ items: [] })),
        api.getAdminRecharges({ page: 1, page_size: 50 }).catch(() => ({ items: [] })),
        api.getAdminTenants({ page: 1, page_size: 100 }).catch(() => ({ items: [] })),
        api.getAdminPendingPayments({ page: 1, page_size: 50 }).catch(() => ({ items: [] })),
      ]);
      setStats(statsData);
      setSubscriptions(subsData?.items || []);
      setRecharges(rechData?.items || []);
      setTenants(tenantsData?.items || []);
      setPendingPayments(pendingData?.items || []);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleActivateSubscription() {
    if (!selectedTenant) return;
    setActionLoading(true);
    try {
      await api.activateSubscription({
        tenant_id: selectedTenant,
        months,
        payment_method: "orange_money",
        payment_reference: paymentRef || undefined,
      });
      setShowActivateModal(false);
      setSelectedTenant("");
      setMonths(1);
      setPaymentRef("");
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRegisterRecharge() {
    if (!selectedTenant || !rechargeAmount) return;
    setActionLoading(true);
    try {
      await api.registerRecharge({
        tenant_id: selectedTenant,
        amount: parseInt(rechargeAmount),
        method: "orange_money",
        reference: rechargeRef || undefined,
        notes: rechargeNotes || undefined,
      });
      setShowRechargeModal(false);
      setSelectedTenant("");
      setRechargeAmount("");
      setRechargeRef("");
      setRechargeNotes("");
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRenewSubscription(subId: string) {
    setActionLoading(true);
    try {
      await api.renewSubscription(subId, { months: 1 });
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelSubscription(subId: string) {
    if (!confirm("Êtes-vous sûr de vouloir résilier cet abonnement ?")) return;
    setActionLoading(true);
    try {
      await api.cancelSubscription(subId);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmPayment(paymentId: string) {
    setActionLoading(true);
    try {
      await api.confirmPayment(paymentId);
      setShowConfirmPaymentModal(false);
      setPaymentToConfirm(null);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectPayment(paymentId: string) {
    if (!confirm("Êtes-vous sûr de vouloir rejeter ce paiement ?")) return;
    setActionLoading(true);
    try {
      await api.rejectPayment(paymentId);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setActionLoading(false);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Facturation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des abonnements et des rechargements SMS
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowRechargeModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Recharge
          </Button>
          <Button size="sm" onClick={() => setShowActivateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Abonnement
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={CheckCircle2}
            label="Abonnements actifs"
            value={stats.active_subscriptions}
            color="text-emerald-600"
            bgColor="bg-emerald-500/10"
          />
          <StatCard
            icon={AlertTriangle}
            label="Abonnements expirés"
            value={stats.expired_subscriptions}
            color="text-red-500"
            bgColor="bg-red-500/10"
          />
          <StatCard
            icon={TrendingUp}
            label="Revenu du mois"
            value={`${(stats.monthly_revenue || 0).toLocaleString()} F`}
            color="text-blue-600"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            icon={ArrowUpRight}
            label="Recharges du mois"
            value={`${(stats.monthly_recharges || 0).toLocaleString()} F`}
            color="text-purple-600"
            bgColor="bg-purple-500/10"
          />
          <StatCard
            icon={Clock}
            label="Recharges en attente"
            value={stats.pending_recharges}
            color="text-amber-600"
            bgColor="bg-amber-500/10"
          />
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[
          { key: "overview", label: "Vue d'ensemble" },
          { key: "pending", label: `Demandes (${pendingPayments.length})` },
          { key: "subscriptions", label: "Abonnements" },
          { key: "recharges", label: "Recharges" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.key
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent subscriptions */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Derniers abonnements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subscriptions.slice(0, 5).map((sub) => (
                <SubItem key={sub.id} sub={sub} />
              ))}
              {subscriptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun abonnement</p>
              )}
            </CardContent>
          </Card>

          {/* Recent recharges */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Dernières recharges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recharges.slice(0, 5).map((r) => (
                <RechargeItem key={r.id} recharge={r} />
              ))}
              {recharges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune recharge</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglet : Demandes en attente */}
      {activeTab === "pending" && (
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Demandes de paiement en attente</CardTitle>
            <CardDescription>Paiements soumis par les propriétaires, en attente de votre validation</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune demande en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {p.amount?.toLocaleString()} FCFA
                          </p>
                          <Badge variant="secondary" className="text-[10px]">
                            {p.type === "subscription" ? "Abonnement" : "Recharge"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.tenant_name} — Réf: <span className="font-mono">{p.reference || "—"}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setPaymentToConfirm(p); setShowConfirmPaymentModal(true); }}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Confirmer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                        onClick={() => handleRejectPayment(p.id)}
                        disabled={actionLoading}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "subscriptions" && (
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Tous les abonnements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30"
                >
                  <SubItem sub={sub} />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRenewSubscription(sub.id)}
                      disabled={actionLoading}
                      title="Renouveler"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    {sub.status === "active" && !sub.is_expired && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleCancelSubscription(sub.id)}
                        disabled={actionLoading}
                        title="Résilier"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {subscriptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun abonnement</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "recharges" && (
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Toutes les recharges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recharges.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30"
                >
                  <RechargeItem recharge={r} />
                </div>
              ))}
              {recharges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune recharge</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal : Activer un abonnement */}
      {showActivateModal && (
        <Modal onClose={() => setShowActivateModal(false)} title="Activer un abonnement">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Entreprise</label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-background text-sm"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
              >
                <option value="">Sélectionner une entreprise</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Durée (mois)</label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-background text-sm"
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value))}
              >
                {[1, 2, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>{m} mois — {(25000 * m).toLocaleString()} FCFA</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Réf. paiement (optionnel)</label>
              <input
                type="text"
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-background text-sm"
                placeholder="Référence Orange Money..."
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleActivateSubscription}
              disabled={!selectedTenant || actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Activer l'abonnement
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal : Enregistrer une recharge */}
      {showRechargeModal && (
        <Modal onClose={() => setShowRechargeModal(false)} title="Enregistrer une recharge">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Entreprise</label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-background text-sm"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
              >
                <option value="">Sélectionner une entreprise</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Montant (FCFA)</label>
              <input
                type="number"
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-background text-sm"
                placeholder="Ex: 50000"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Réf. transaction (optionnel)</label>
              <input
                type="text"
                className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-background text-sm"
                placeholder="Référence Orange Money..."
                value={rechargeRef}
                onChange={(e) => setRechargeRef(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Notes (optionnel)</label>
              <textarea
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
                rows={2}
                placeholder="Notes internes..."
                value={rechargeNotes}
                onChange={(e) => setRechargeNotes(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleRegisterRecharge}
              disabled={!selectedTenant || !rechargeAmount || actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer la recharge
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal : Confirmation de validation de paiement */}
      {showConfirmPaymentModal && paymentToConfirm && (
        <Modal onClose={() => { setShowConfirmPaymentModal(false); setPaymentToConfirm(null); }} title="Confirmer le paiement">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Êtes-vous sûr de vouloir valider ce paiement ? Cette action est irréversible.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-semibold text-foreground">{paymentToConfirm.amount?.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground">{paymentToConfirm.type === "subscription" ? "Abonnement" : "Recharge"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entreprise</span>
                <span className="text-foreground">{paymentToConfirm.tenant_name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Référence</span>
                <span className="font-mono text-foreground">{paymentToConfirm.reference || "—"}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowConfirmPaymentModal(false); setPaymentToConfirm(null); }}
                disabled={actionLoading}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleConfirmPayment(paymentToConfirm.id)}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Valider le paiement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================
// COMPOSANTS UTILITAIRES
// ============================================

function StatCard({ icon: Icon, label, value, color, bgColor }: {
  icon: any; label: string; value: number | string; color: string; bgColor: string;
}) {
  return (
    <Card className="border border-border/50">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bgColor)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SubItem({ sub }: { sub: any }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg",
        sub.is_expired ? "bg-red-100 dark:bg-red-900/40" : "bg-emerald-100 dark:bg-emerald-900/40"
      )}>
        {sub.is_expired ? (
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{sub.tenant_name}</p>
          <Badge
            variant={sub.is_expired ? "destructive" : sub.status === "cancelled" ? "secondary" : "default"}
            className="text-[10px]"
          >
            {sub.is_expired ? "Expiré" : sub.status === "cancelled" ? "Résilié" : "Actif"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {sub.amount?.toLocaleString()} FCFA — Expire le{" "}
          {sub.end_date ? new Date(sub.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
          {!sub.is_expired && sub.days_remaining !== undefined && (
            <span className="ml-1 text-emerald-600">({sub.days_remaining}j restants)</span>
          )}
        </p>
      </div>
    </div>
  );
}

function RechargeItem({ recharge }: { recharge: any }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg",
        recharge.status === "credited"
          ? "bg-emerald-100 dark:bg-emerald-900/40"
          : recharge.status === "rejected"
            ? "bg-red-100 dark:bg-red-900/40"
            : "bg-amber-100 dark:bg-amber-900/40"
      )}>
        {recharge.status === "credited" ? (
          <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : recharge.status === "rejected" ? (
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        ) : (
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {recharge.amount?.toLocaleString()} FCFA
          </p>
          <Badge
            variant={recharge.status === "credited" ? "default" : recharge.status === "rejected" ? "destructive" : "secondary"}
            className="text-[10px]"
          >
            {recharge.status === "credited" ? "Crédité" : recharge.status === "rejected" ? "Rejeté" : "En attente"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {recharge.tenant_name}
          {recharge.reference && ` — Réf: ${recharge.reference}`}
          {" — "}
          {recharge.created_at ? new Date(recharge.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}
        </p>
      </div>
    </div>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
