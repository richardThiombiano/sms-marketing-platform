"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Send, ArrowLeft, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Veuillez saisir votre adresse email");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
      // En dev, le token est retourné pour faciliter les tests
      if (result.reset_token) {
        setResetToken(result.reset_token);
      }
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await api.resetPassword(resetToken, newPassword);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la réinitialisation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-[420px] space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
            <Send className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">SMS Pro</span>
        </div>

        {/* Step: Email */}
        {step === "email" && (
          <>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Mot de passe oublié
              </h2>
              <p className="text-sm text-muted-foreground">
                Saisissez votre email. Un code de réinitialisation sera envoyé par SMS au numéro de votre entreprise.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="vous@entreprise.com"
                    className="h-11 pl-10 bg-muted/30 border-border/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 text-white font-medium shadow-lg shadow-primary/25"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Envoyer le code"
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </>
        )}

        {/* Step: Reset */}
        {step === "reset" && (
          <>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Réinitialiser le mot de passe
              </h2>
              <p className="text-sm text-muted-foreground">
                {message || "Saisissez le token reçu et votre nouveau mot de passe."}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Token de réinitialisation</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Collez le token reçu"
                    className="h-11 pl-10 bg-muted/30 border-border/50 font-mono text-xs"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-11 bg-muted/30 border-border/50"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-11 bg-muted/30 border-border/50"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 text-white font-medium shadow-lg shadow-primary/25"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Réinitialiser"
                )}
              </Button>
            </form>

            <div className="text-center">
              <button onClick={() => { setStep("email"); setError(""); }} className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour
              </button>
            </div>
          </>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Mot de passe réinitialisé
              </h2>
              <p className="text-sm text-muted-foreground">
                Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.
              </p>
            </div>
            <Button asChild className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 text-white">
              <Link href="/auth/login">Se connecter</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
