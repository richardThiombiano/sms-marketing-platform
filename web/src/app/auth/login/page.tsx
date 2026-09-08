"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/auth-store";
import { getBlockedSeconds, recordFailedAttempt, resetAttempts } from "@/lib/rate-limiter";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [blockedSeconds, setBlockedSeconds] = useState(0);

  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  // Timer pour le countdown de blocage
  useEffect(() => {
    const remaining = getBlockedSeconds();
    if (remaining > 0) setBlockedSeconds(remaining);
  }, []);

  useEffect(() => {
    if (blockedSeconds <= 0) return;
    const timer = setInterval(() => {
      const remaining = getBlockedSeconds();
      setBlockedSeconds(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [blockedSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier si bloqué
    const remaining = getBlockedSeconds();
    if (remaining > 0) {
      setBlockedSeconds(remaining);
      setError(`Trop de tentatives. Réessayez dans ${remaining} secondes.`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(identifier, password);
      resetAttempts();
      const user = useAuthStore.getState().user;
      if (user?.role === "superadmin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      const blockDuration = recordFailedAttempt();
      if (blockDuration > 0) {
        setBlockedSeconds(blockDuration);
        setError(`Trop de tentatives. Réessayez dans ${blockDuration} secondes.`);
      } else {
        setError(err.message || "Identifiant ou mot de passe incorrect");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">SMS Pro</span>
          </div>

          <div className="space-y-6">
            {/*<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm">*/}
            {/*  <Sparkles className="h-3.5 w-3.5 text-amber-400" />*/}
            {/*  <span className="text-white/80">Utilisé par +500 entreprises</span>*/}
            {/*</div>*/}
            <h1 className="text-4xl font-bold leading-tight">
              Engagez vos clients
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                avec le SMS marketing
              </span>
            </h1>
            <p className="text-lg text-white/60 max-w-md leading-relaxed">
              Envoyez des campagnes ciblées, fidélisez vos clients et boostez
              vos ventes avec notre plateforme tout-en-un.
            </p>
          </div>

          <div className="flex items-center gap-8">
            {/*<div>*/}
            {/*  <p className="text-2xl font-bold">98.7%</p>*/}
            {/*  <p className="text-sm text-white/50">Taux de délivrance</p>*/}
            {/*</div>*/}
            {/*<Separator orientation="vertical" className="h-10 bg-white/20" />*/}
            {/*<div>*/}
            {/*  <p className="text-2xl font-bold">+500</p>*/}
            {/*  <p className="text-sm text-white/50">Entreprises</p>*/}
            {/*</div>*/}
            {/*<Separator orientation="vertical" className="h-10 bg-white/20" />*/}
            {/*<div>*/}
            {/*  <p className="text-2xl font-bold">2M+</p>*/}
            {/*  <p className="text-sm text-white/50">SMS envoyés/mois</p>*/}
            {/*</div>*/}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">SMS Pro</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Bon retour parmi nous
            </h2>
            <p className="text-sm text-muted-foreground">
              Connectez-vous à votre compte pour continuer
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Identifiant
              </label>
              <Input
                type="text"
                placeholder="Username ou email"
                className="h-11 bg-muted/30 border-border/50 focus:border-primary/40 focus:ring-primary/20"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Mot de passe
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 pr-10 bg-muted/30 border-border/50 focus:border-primary/40 focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || blockedSeconds > 0}
              className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-medium shadow-lg shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : blockedSeconds > 0 ? (
                <>Réessayer dans {blockedSeconds}s</>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
