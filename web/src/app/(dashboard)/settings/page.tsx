"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Building2,
  Users,
  Lock,
  Save,
  Plus,
  Edit,
  Trash2,
  Power,
  Loader2,
  X,
  MessageCircle,
  CheckCircle2,
  Unplug,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === "owner" || user?.role === "superadmin";
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "password", label: "Sécurité", icon: Lock },
    ...(isOwner ? [
      { id: "company", label: "Entreprise", icon: Building2 },
      { id: "team", label: "Équipe", icon: Users },
      { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez votre profil et votre entreprise</p>
      </div>

      <div className="flex gap-6">
        {/* Navigation latérale */}
        <nav className="w-56 shrink-0">
          <div className="sticky top-20 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Contenu */}
        <div className="flex-1 max-w-2xl">
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "password" && <PasswordSection />}
          {activeTab === "company" && isOwner && <CompanySection />}
          {activeTab === "team" && isOwner && <TeamSection />}
          {activeTab === "whatsapp" && isOwner && <WhatsAppSection />}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROFIL
// ============================================

function ProfileSection() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    api.getProfile().then((data) => {
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.updateProfile({ first_name: firstName, last_name: lastName, email });
      setSuccess("Profil mis à jour");
      fetchUser();
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Profil</CardTitle>
            <p className="text-xs text-muted-foreground">Vos informations personnelles</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-emerald-500/10 text-sm text-emerald-600">{success}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prénom</label>
            <Input className="h-10" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom</label>
            <Input className="h-10" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" className="h-10" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-primary to-purple-600 text-white">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// MOT DE PASSE
// ============================================

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess("Mot de passe modifié");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <Lock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base">Mot de passe</CardTitle>
            <p className="text-xs text-muted-foreground">Modifier votre mot de passe</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-emerald-500/10 text-sm text-emerald-600">{success}</div>}

        <div className="space-y-2">
          <label className="text-sm font-medium">Mot de passe actuel</label>
          <Input type="password" className="h-10" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nouveau mot de passe</label>
            <Input type="password" className="h-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirmer</label>
            <Input type="password" className="h-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !currentPassword || !newPassword}
          className="bg-gradient-to-r from-primary to-purple-600 text-white">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
          Changer le mot de passe
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// ENTREPRISE (owner uniquement)
// ============================================

function CompanySection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("");
  const [provider, setProvider] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCompany().then((data) => {
      setName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setPlan(data.plan || "");
      setProvider(data.sms_provider || "");
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.updateCompany({ name, email, phone });
      setSuccess("Informations mises à jour");
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-base">Entreprise</CardTitle>
            <p className="text-xs text-muted-foreground">Informations de votre entreprise</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-emerald-500/10 text-sm text-emerald-600">{success}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom de l'entreprise</label>
            <Input className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" className="h-10" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Téléphone</label>
            <Input className="h-10" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Plan</label>
            <Input className="h-10 bg-muted/50" value={plan} disabled />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider SMS</label>
            <Input className="h-10 bg-muted/50 uppercase" value={provider} disabled />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-primary to-purple-600 text-white">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// ÉQUIPE (owner uniquement)
// ============================================

function TeamSection() {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);

  const fetchTeam = () => {
    setIsLoading(true);
    api.getTeam().then((data) => setMembers(data.items)).catch(() => {}).finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleToggle = async (userId: string, currentActive: boolean) => {
    await api.updateTeamMember(userId, { is_active: !currentActive });
    fetchTeam();
  };

  const handleDelete = async (id: string) => {
    await api.removeTeamMember(id);
    fetchTeam();
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  const roleLabels: Record<string, string> = {
    owner: "Propriétaire",
    admin: "Administrateur",
    member: "Membre",
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">Équipe</CardTitle>
              <p className="text-xs text-muted-foreground">{members.length} membre(s)</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-primary to-purple-600 text-white">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Inviter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">
                      {(member.first_name || "?")[0]}{(member.last_name || "?")[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]",
                    member.role === "owner" ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                    member.role === "admin" ? "bg-purple-500/10 text-purple-600 border-purple-200" :
                    "bg-gray-500/10 text-gray-600 border-gray-200"
                  )}>
                    {roleLabels[member.role] || member.role}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px]",
                    member.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-red-500/10 text-red-500 border-red-200"
                  )}>
                    {member.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  {member.id !== currentUser?.id && member.role !== "owner" && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-500"
                        onClick={() => handleToggle(member.id, member.is_active)}
                        title={member.is_active ? "Désactiver" : "Activer"}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => { setDeletingId(member.id); setShowDeleteConfirm(true); }}
                        title="Retirer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Member Modal */}
        {showAddModal && (
          <AddMemberModal onClose={() => setShowAddModal(false)} onAdded={fetchTeam} />
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowDeleteConfirm(false); setDeletingId(null); }} />
            <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Retirer ce membre</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Cette action est irréversible.</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1"
                  onClick={() => { setShowDeleteConfirm(false); setDeletingId(null); }}>Annuler</Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => { if (deletingId) handleDelete(deletingId); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Retirer
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddMemberModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !firstName || !password) {
      setError("Remplissez tous les champs obligatoires");
      return;
    }
    if (username.length < 3 || !/^[a-z0-9._]+$/.test(username)) {
      setError("Le username doit contenir au moins 3 caractères (lettres minuscules, chiffres, points, underscores)");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await api.addTeamMember({ username, email, first_name: firstName, last_name: lastName, password, role });
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Inviter un membre</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prénom *</label>
              <Input className="h-10" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input className="h-10" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username *</label>
            <Input className="h-10" placeholder="ex: jean.dupont" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} required />
            <p className="text-[11px] text-muted-foreground">Lettres minuscules, chiffres, points et underscores</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email *</label>
            <Input type="email" className="h-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe *</label>
              <Input type="password" className="h-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rôle</label>
              <Input className="h-10 bg-muted/50" value="Membre" disabled />
            </div>
          </div>
          <Separator />
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Inviter
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ============================================
// WHATSAPP EMBEDDED SIGNUP (owner uniquement)
// ============================================

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

function WhatsAppSection() {
  const [status, setStatus] = useState<{
    is_connected: boolean;
    whatsapp_enabled: boolean;
    phone_number_id: string | null;
    business_account_id: string | null;
    display_phone_number: string | null;
    verified_name: string | null;
  } | null>(null);
  const [config, setConfig] = useState<{ app_id: string; config_id: string; api_version: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Charger le statut et la config
  useEffect(() => {
    Promise.all([
      api.getWhatsAppConnectionStatus().catch(() => null),
      api.getWhatsAppSignupConfig().catch(() => null),
    ]).then(([statusData, configData]) => {
      setStatus(statusData);
      setConfig(configData);
      setIsLoading(false);
    });
  }, []);

  // Charger le SDK Facebook JS
  useEffect(() => {
    if (!config?.app_id) return;

    // Si le SDK est déjà chargé
    if (window.FB) {
      setSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: config.app_id,
        cookie: true,
        xfbml: true,
        version: config.api_version,
      });
      setSdkLoaded(true);
    };

    // Injecter le script SDK
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/fr_FR/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [config]);

  const launchEmbeddedSignup = () => {
    if (!window.FB || !config) return;

    setError("");
    setIsConnecting(true);

    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          // Envoyer le code au backend
          api
            .submitWhatsAppSignupCode(response.authResponse.code)
            .then((result) => {
              setSuccess(`WhatsApp connecté ! Numéro : ${result.display_phone_number || result.phone_number_id}`);
              setStatus({
                is_connected: true,
                whatsapp_enabled: true,
                phone_number_id: result.phone_number_id,
                business_account_id: result.waba_id,
                display_phone_number: result.display_phone_number,
                verified_name: result.verified_name,
              });
            })
            .catch((err) => {
              setError(err.message || "Erreur lors de la connexion");
            })
            .finally(() => setIsConnecting(false));
        } else {
          setError("Inscription annulée ou échouée.");
          setIsConnecting(false);
        }
      },
      {
        config_id: config.config_id,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError("");
    setSuccess("");
    try {
      await api.disconnectWhatsApp();
      setStatus({
        is_connected: false,
        whatsapp_enabled: false,
        phone_number_id: null,
        business_account_id: null,
        display_phone_number: null,
        verified_name: null,
      });
      setSuccess("WhatsApp déconnecté");
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-border/50">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-base">WhatsApp Business</CardTitle>
            <p className="text-xs text-muted-foreground">
              Connectez votre compte WhatsApp Business pour envoyer des messages
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-emerald-500/10 text-sm text-emerald-600">{success}</div>}

        {status?.is_connected ? (
          // ─── État connecté ─────────────────────────────────────────
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-200/50">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">WhatsApp connecté</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status.verified_name && <span className="font-medium">{status.verified_name} — </span>}
                  {status.display_phone_number || status.phone_number_id}
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                Actif
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phone Number ID</p>
                <p className="text-xs font-mono text-foreground mt-1">{status.phone_number_id}</p>
              </div>
              <div className="p-3 rounded-lg border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Business Account ID</p>
                <p className="text-xs font-mono text-foreground mt-1">{status.business_account_id}</p>
              </div>
            </div>

            <Separator />

            <Button
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-500/10"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
              Déconnecter WhatsApp
            </Button>
          </div>
        ) : (
          // ─── État non connecté ─────────────────────────────────────
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-3">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <MessageCircle className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Connectez votre WhatsApp Business</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  En quelques clics, reliez votre numéro WhatsApp Business pour envoyer des messages, templates et notifications à vos clients.
                </p>
              </div>

              {config ? (
                <Button
                  onClick={launchEmbeddedSignup}
                  disabled={isConnecting || !sdkLoaded}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white font-medium shadow-lg shadow-emerald-500/20"
                >
                  {isConnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  )}
                  {isConnecting ? "Connexion en cours..." : "Connecter WhatsApp"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  L'Embedded Signup n'est pas encore configuré. Contactez l'administrateur.
                </p>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1">
              <p>• Vous serez redirigé vers Meta pour créer ou sélectionner votre compte WhatsApp Business</p>
              <p>• Un numéro de téléphone sera associé (ne doit pas être déjà utilisé sur WhatsApp)</p>
              <p>• La connexion est instantanée, aucune configuration manuelle nécessaire</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
