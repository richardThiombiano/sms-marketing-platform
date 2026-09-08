"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Send,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  AtSign,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const features = [
  "Campagnes SMS marketing ciblées",
  "Gestion de contacts et segmentation",
  "Automatisations (anniversaires, rappels)",
  "Statistiques en temps réel",
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [senderId, setSenderId] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !email || !phone || !senderId) {
      setError("Remplissez tous les champs obligatoires");
      return;
    }
    if (senderId.length < 3 || senderId.length > 11) {
      setError("Le nom de l'expéditeur doit contenir entre 3 et 11 caractères");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !firstName || !password) {
      setError("Remplissez tous les champs obligatoires");
      return;
    }
    if (username.length < 3 || !/^[a-z0-9._]+$/.test(username)) {
      setError("Le username doit contenir au moins 3 caractères (lettres minuscules, chiffres, points, underscores)");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await api.register({
        company_name: companyName,
        email,
        phone,
        username,
        first_name: firstName,
        last_name: lastName,
        password,
        sender_id: senderId,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  // Écran de succès
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Inscription enregistrée</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Votre demande d'inscription a été enregistrée avec succès.
              Vous recevrez un SMS de confirmation une fois votre compte validé par notre équipe.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Entreprise :</span> {companyName}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Nom de connexion :</span> {username}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Nom de l'expéditeur souhaité :</span> {senderId}
            </p>
          </div>
          <Link href="/auth/login">
            <Button className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 text-white">
              Retour à la connexion
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-700" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">SMS Pro</span>
          </div>

          <div className="space-y-8">
            <h1 className="text-4xl font-bold leading-tight">
              Lancez-vous en
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                quelques minutes
              </span>
            </h1>
            <p className="text-lg text-white/60 max-w-md leading-relaxed">
              Rejoignez les entreprises qui utilisent SMS Pro pour communiquer
              efficacement avec leurs clients.
            </p>
            <div className="space-y-4">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-white/70">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          <div />
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">SMS Pro</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Créer votre compte</h2>
            <p className="text-sm text-muted-foreground">
              {step === 1 ? "Informations sur votre entreprise" : "Vos informations personnelles"}
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold", step >= 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>1</div>
              <span className="text-xs font-medium text-foreground">Entreprise</span>
            </div>
            <div className="flex-1 h-[2px] bg-border rounded-full overflow-hidden">
              <div className={cn("h-full bg-primary transition-all duration-500", step >= 2 ? "w-full" : "w-0")} />
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold", step >= 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>2</div>
              <span className="text-xs font-medium text-muted-foreground">Profil</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Company */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nom de l'entreprise *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Mon Entreprise" className="h-11 pl-10 bg-muted/30 border-border/50" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email professionnel *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="contact@entreprise.com" className="h-11 pl-10 bg-muted/30 border-border/50" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Téléphone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="tel" placeholder="+226 70 00 00 00" className="h-11 pl-10 bg-muted/30 border-border/50" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nom de l'expéditeur souhaité *</label>
                <div className="relative">
                  <Radio className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Nom affiché comme expéditeur" maxLength={11} className="h-11 pl-10 bg-muted/30 border-border/50" value={senderId} onChange={(e) => setSenderId(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))} required />
                </div>
                <p className="text-[11px] text-muted-foreground">Le nom qui apparaîtra comme expéditeur des SMS (3 à 11 caractères)</p>
              </div>

              <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 text-white font-medium shadow-lg shadow-primary/25">
                Continuer <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nom de connexion *</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="nom de connexion" className="h-11 pl-10 bg-muted/30 border-border/50" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} required />
                </div>
                <p className="text-[11px] text-muted-foreground">Lettres minuscules, chiffres, points et underscores</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Prénom *</label>
                  <Input placeholder="Mohamed" className="h-11 bg-muted/30 border-border/50" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nom</label>
                  <Input placeholder="Thiombiano" className="h-11 bg-muted/30 border-border/50" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Mot de passe *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type={showPassword ? "text" : "password"} placeholder="Minimum 6 caractères" className="h-11 pl-10 pr-10 bg-muted/30 border-border/50" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirmer le mot de passe *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="Confirmez votre mot de passe" className="h-11 pl-10 bg-muted/30 border-border/50" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => { setStep(1); setError(""); }}>
                  Retour
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1 h-11 bg-gradient-to-r from-primary to-purple-600 text-white font-medium shadow-lg shadow-primary/25">
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Créer mon compte <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
