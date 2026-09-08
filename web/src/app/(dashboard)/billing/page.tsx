"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  QrCode,
  Smartphone,
  Receipt,
  ArrowUpRight,
  XCircle,
  Send,
  Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface Subscription {
  id: string;
  status: string;
  amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  is_expired: boolean;
}

interface PaymentInfo {
  merchant_code: string;
  merchant_name: string;
  qr_code_url: string | null;
  subscription_amount: number;
  currency: string;
  instructions: string;
}

interface PaymentHistoryItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  created_at: string;
}

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"payer" | "abonnement" | "historique">("payer");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [subData, payData, paymentsData] = await Promise.all([
        api.getSubscription().catch(() => null),
        api.getPaymentInfo().catch(() => null),
        api.getBillingPayments({ page: 1, page_size: 50 }).catch(() => ({ items: [] })),
      ]);
      setSubscription(subData);
      setPaymentInfo(payData);
      setPayments(paymentsData?.items || []);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Facturation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez votre abonnement et rechargez vos crédits SMS
        </p>
      </div>

      {/* Statut abonnement */}
      <SubscriptionStatus subscription={subscription} />

      {/* Onglets */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[
          { key: "payer", label: "Effectuer un paiement" },
          { key: "abonnement", label: "Mon abonnement" },
          { key: "historique", label: "Historique" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "payer" && paymentInfo && (
        <PaymentForm paymentInfo={paymentInfo} subscription={subscription} onSuccess={loadData} />
      )}

      {activeTab === "abonnement" && paymentInfo && (
        <OrangeMoneyInfo paymentInfo={paymentInfo} />
      )}

      {activeTab === "historique" && (
        <PaymentHistory payments={payments} />
      )}
    </div>
  );
}

// ============================================
// FORMULAIRE DE PAIEMENT
// ============================================

function PaymentForm({ paymentInfo, subscription, onSuccess }: { paymentInfo: PaymentInfo; subscription: Subscription | null; onSuccess: () => void }) {
  const [step, setStep] = useState<"choice" | "ussd" | "reference">("choice");
  const [paymentType, setPaymentType] = useState<"subscription" | "recharge">("subscription");
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(paymentInfo.subscription_amount.toString());
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  const ussdCode = `*144*10*55234342*${amount}#`;

  function handleNext() {
    if (step === "choice") {
      if (paymentType === "subscription") {
        setAmount((paymentInfo.subscription_amount * months).toString());
      }
      setStep("ussd");
    } else if (step === "ussd") {
      setStep("reference");
    }
  }

  function handleBack() {
    if (step === "reference") setStep("ussd");
    else if (step === "ussd") setStep("choice");
  }

  async function handleSubmit() {
    if (!reference.trim()) {
      setError("Veuillez saisir la référence de transaction");
      return;
    }
    setShowConfirmPopup(true);
  }

  async function handleConfirmedSubmit() {
    setShowConfirmPopup(false);
    setIsSubmitting(true);
    setError("");
    try {
      await api.createPaymentRequest({
        type: paymentType,
        amount: parseInt(amount),
        reference: reference.trim(),
      });
      setSuccess(
        "Votre paiement a bien été pris en compte et sera activé sous un délai de 15 minutes après vérification."
      );
      setStep("choice");
      setReference("");
      setMonths(1);
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'envoi");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
            <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Paiement Orange Money</CardTitle>
            <CardDescription>
              {step === "choice" && "Choisissez le type de paiement"}
              {step === "ussd" && "Composez le code USSD pour payer"}
              {step === "reference" && "Saisissez la référence de transaction"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Étape 1 : Choix du type */}
        {step === "choice" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setPaymentType("subscription"); setAmount((paymentInfo.subscription_amount * months).toString()); }}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  paymentType === "subscription"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className={cn("h-5 w-5", paymentType === "subscription" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Abonnement</p>
                    <p className="text-xs text-muted-foreground">
                      {paymentInfo.subscription_amount.toLocaleString()} FCFA / mois
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setPaymentType("recharge"); setAmount(""); }}
                disabled={!subscription || subscription.is_expired}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  !subscription || subscription.is_expired
                    ? "border-border opacity-50 cursor-not-allowed"
                    : paymentType === "recharge"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <ArrowUpRight className={cn("h-5 w-5", paymentType === "recharge" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Recharge crédits SMS</p>
                    <p className="text-xs text-muted-foreground">
                      {!subscription || subscription.is_expired
                        ? "Abonnement actif requis"
                        : "Montant libre (min. 1 000 FCFA)"}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Nombre de mois pour abonnement */}
            {paymentType === "subscription" && (
              <div>
                <label className="text-sm font-medium text-foreground">Durée de l'abonnement</label>
                <select
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={months}
                  onChange={(e) => {
                    const m = parseInt(e.target.value);
                    setMonths(m);
                    setAmount((paymentInfo.subscription_amount * m).toString());
                  }}
                >
                  {[1, 2, 3, 6, 12].map((m) => (
                    <option key={m} value={m}>
                      {m} mois — {(paymentInfo.subscription_amount * m).toLocaleString()} FCFA
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Montant pour recharge */}
            {paymentType === "recharge" && (
              <div>
                <label className="text-sm font-medium text-foreground">Montant (FCFA)</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex: 10000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleNext}
              disabled={!amount || parseInt(amount) < (paymentType === "recharge" ? 1000 : paymentInfo.subscription_amount)}
            >
              Continuer
            </Button>
          </div>
        )}

        {/* Étape 2 : Code USSD */}
        {step === "ussd" && (
          <div className="space-y-5">
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-3">
                Composez ce code sur votre téléphone :
              </p>
              <div className="flex items-center justify-between bg-white dark:bg-background rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                <p className="text-2xl font-bold text-foreground font-mono tracking-wide">
                  {ussdCode}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(ussdCode)}
                >
                  Copier
                </Button>
              </div>
              <div className="mt-4 space-y-2 text-sm text-orange-700 dark:text-orange-400">
                <p>1. Composez le code ci-dessus sur votre téléphone</p>
                <p>2. Confirmez avec votre code secret Orange Money</p>
                <p>3. Vous recevrez un SMS avec la référence de transaction</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Montant à payer</p>
                  <p className="text-lg font-bold text-foreground">
                    {parseInt(amount).toLocaleString()} FCFA
                  </p>
                </div>
                <Badge variant="secondary">
                  {paymentType === "subscription" ? "Abonnement" : "Recharge"}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                Retour
              </Button>
              <Button className="flex-1" onClick={handleNext}>
                J'ai effectué le paiement
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3 : Saisie référence */}
        {step === "reference" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Référence de transaction
              </label>
              <p className="text-xs text-muted-foreground">
                Saisissez la référence reçue par SMS après votre paiement Orange Money
              </p>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  className="w-full h-11 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  placeholder="Ex: MP260801.1234.A56789"
                  value={reference}
                  onChange={(e) => { setReference(e.target.value); setError(""); }}
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Récapitulatif</p>
                  <p className="text-sm font-medium text-foreground">
                    {paymentType === "subscription" ? "Abonnement mensuel" : "Recharge crédits SMS"}
                    {" — "}
                    {parseInt(amount).toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                Retour
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting || !reference.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Confirmer le paiement
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Popup de confirmation */}
    {showConfirmPopup && (
      <>
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowConfirmPopup(false)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40 mb-3">
                <Smartphone className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Confirmer votre paiement</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Vous confirmez avoir effectué un paiement de{" "}
                <span className="font-semibold text-foreground">{parseInt(amount).toLocaleString()} FCFA</span>{" "}
                via Orange Money avec la référence{" "}
                <span className="font-mono font-semibold text-foreground">{reference}</span> ?
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmPopup(false)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmedSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Oui, confirmer
              </Button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  );
}

// ============================================
// STATUT ABONNEMENT
// ============================================

function SubscriptionStatus({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) {
    return (
      <Card className="border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Aucun abonnement actif
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
              Effectuez un paiement ci-dessous pour activer votre abonnement.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isExpired = subscription.is_expired;
  const isExpiringSoon = !isExpired && subscription.days_remaining <= 7;

  return (
    <Card className={cn(
      "border",
      isExpired
        ? "border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800"
        : isExpiringSoon
          ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800"
          : "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800"
    )}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isExpired ? "bg-red-100 dark:bg-red-900/40"
                : isExpiringSoon ? "bg-amber-100 dark:bg-amber-900/40"
                : "bg-emerald-100 dark:bg-emerald-900/40"
            )}>
              {isExpired ? (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className={cn("h-5 w-5", isExpiringSoon ? "text-amber-600" : "text-emerald-600")} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Abonnement</p>
                <Badge variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"} className="text-[10px]">
                  {isExpired ? "Expiré" : isExpiringSoon ? "Expire bientôt" : "Actif"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Expire le {new Date(subscription.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                {!isExpired && ` — ${subscription.days_remaining} jours restants`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// INFOS ORANGE MONEY
// ============================================

function OrangeMoneyInfo({ paymentInfo }: { paymentInfo: PaymentInfo }) {
  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Informations de paiement</CardTitle>
        <CardDescription>Détails de votre compte marchand Orange Money</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Code Marchand</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-foreground font-mono tracking-wider">
              {paymentInfo.merchant_code || "---"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => paymentInfo.merchant_code && navigator.clipboard.writeText(paymentInfo.merchant_code)}
            >
              Copier
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{paymentInfo.merchant_name}</p>
        </div>

        {paymentInfo.qr_code_url && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Scannez pour payer
            </p>
            <div className="border border-border rounded-xl p-3 bg-white">
              <img src={paymentInfo.qr_code_url} alt="QR Code Orange Money" className="w-48 h-48 object-contain" />
            </div>
          </div>
        )}

        <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
          <p className="text-xs text-muted-foreground">Abonnement mensuel</p>
          <p className="text-xl font-bold text-foreground">
            {paymentInfo.subscription_amount.toLocaleString()} {paymentInfo.currency}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// HISTORIQUE DES PAIEMENTS
// ============================================

function PaymentHistory({ payments }: { payments: PaymentHistoryItem[] }) {
  if (payments.length === 0) {
    return (
      <Card className="border border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Aucun paiement</p>
          <p className="text-xs text-muted-foreground mt-1">
            Vos paiements apparaîtront ici
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Historique des paiements</CardTitle>
        <CardDescription>Abonnements et recharges</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  payment.status === "confirmed"
                    ? "bg-emerald-100 dark:bg-emerald-900/40"
                    : payment.status === "rejected"
                      ? "bg-red-100 dark:bg-red-900/40"
                      : "bg-amber-100 dark:bg-amber-900/40"
                )}>
                  {payment.status === "confirmed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : payment.status === "rejected" ? (
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {payment.amount.toLocaleString()} FCFA
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.type === "subscription" ? "Abonnement" : "Recharge"}
                    {payment.reference && ` — Réf: ${payment.reference}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    payment.status === "confirmed" ? "default"
                      : payment.status === "rejected" ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {payment.status === "confirmed" ? "Confirmé"
                    : payment.status === "rejected" ? "Rejeté"
                    : "En attente"}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {payment.created_at
                    ? new Date(payment.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
