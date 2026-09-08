"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Edit,
  Power,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const roleConfig: Record<string, { label: string; className: string }> = {
  superadmin: { label: "Super Admin", className: "bg-orange-500/10 text-orange-600 border-orange-200" },
  owner: { label: "Propriétaire", className: "bg-blue-500/10 text-blue-600 border-blue-200" },
  admin: { label: "Admin", className: "bg-purple-500/10 text-purple-600 border-purple-200" },
  member: { label: "Membre", className: "bg-gray-500/10 text-gray-600 border-gray-200" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<boolean | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [togglingUser, setTogglingUser] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, page_size: 20 };
      if (searchQuery) params.search = searchQuery;
      if (filterRole) params.role = filterRole;
      if (filterStatus !== null) params.is_active = filterStatus;
      const data = await api.getAdminUsers(params);
      setUsers(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch {}
    setIsLoading(false);
  }, [page, searchQuery, filterRole, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Jamais";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} utilisateur(s) sur la plateforme</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20">
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="h-9 pl-9 bg-muted/30 border-border/50"
              />
            </div>
            <select
              className="h-9 rounded-md border border-border/50 bg-muted/30 px-3 text-sm"
              value={filterRole || ""}
              onChange={(e) => { setFilterRole(e.target.value || null); setPage(1); }}
            >
              <option value="">Tous les rôles</option>
              <option value="superadmin">Super Admin</option>
              <option value="owner">Propriétaire</option>
              <option value="admin">Admin</option>
              <option value="member">Membre</option>
            </select>
            <select
              className="h-9 rounded-md border border-border/50 bg-muted/30 px-3 text-sm"
              value={filterStatus === null ? "" : filterStatus ? "true" : "false"}
              onChange={(e) => { setFilterStatus(e.target.value === "" ? null : e.target.value === "true"); setPage(1); }}
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
            {(searchQuery || filterRole || filterStatus !== null) && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground"
                onClick={() => { setSearchQuery(""); setFilterRole(null); setFilterStatus(null); setPage(1); }}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
      ) : (
        <Card className="border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Utilisateur</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Entreprise</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Rôle</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Dernière connexion</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Inscription</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const role = roleConfig[user.role] || roleConfig.member;
                  return (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {user.first_name || ""} {user.last_name || ""}
                          </p>
                          <p className="text-xs text-muted-foreground">@{user.username} — {user.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">{user.tenant_name}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn("text-[10px] font-semibold", role.className)}>
                          {role.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn("text-[10px]",
                          user.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-red-500/10 text-red-500 border-red-200"
                        )}>
                          {user.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-muted-foreground">{formatDate(user.last_login_at)}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => { setEditingUser(user); setShowEditModal(true); }}
                            title="Modifier">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className={cn("h-8 w-8", user.is_active ? "text-muted-foreground hover:text-red-500" : "text-muted-foreground hover:text-emerald-500")}
                            onClick={() => { setTogglingUser(user); setShowToggleConfirm(true); }}
                            title={user.is_active ? "Désactiver" : "Activer"}
                            disabled={user.role === "superadmin"}>
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => { setDeletingUserId(user.id); setShowDeleteConfirm(true); }}
                            title="Supprimer"
                            disabled={user.role === "superadmin"}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Suivant <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchUsers}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => { setShowEditModal(false); setEditingUser(null); }}
          onSaved={fetchUsers}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowDeleteConfirm(false); setDeletingUserId(null); }} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Supprimer l'utilisateur</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowDeleteConfirm(false); setDeletingUserId(null); }}>
                Annuler
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={async () => {
                  if (deletingUserId) {
                    await api.deleteAdminUser(deletingUserId);
                    fetchUsers();
                    setShowDeleteConfirm(false);
                    setDeletingUserId(null);
                  }
                }}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Confirmation */}
      {showToggleConfirm && togglingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowToggleConfirm(false); setTogglingUser(null); }} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full",
                togglingUser.is_active ? "bg-red-500/10" : "bg-emerald-500/10"
              )}>
                <Power className={cn("h-5 w-5", togglingUser.is_active ? "text-red-500" : "text-emerald-500")} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {togglingUser.is_active ? "Désactiver" : "Activer"} l'utilisateur
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {togglingUser.is_active
                    ? `${togglingUser.first_name || ""} ${togglingUser.last_name || ""} ne pourra plus se connecter.`
                    : `${togglingUser.first_name || ""} ${togglingUser.last_name || ""} pourra à nouveau se connecter.`}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowToggleConfirm(false); setTogglingUser(null); }}>
                Annuler
              </Button>
              <Button className={cn("flex-1 text-white",
                togglingUser.is_active ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
              )}
                onClick={async () => {
                  await api.toggleAdminUser(togglingUser.id);
                  fetchUsers();
                  setShowToggleConfirm(false);
                  setTogglingUser(null);
                }}>
                <Power className="mr-2 h-4 w-4" />
                {togglingUser.is_active ? "Désactiver" : "Activer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [form, setForm] = useState({
    tenant_id: "", username: "", email: "", first_name: "", last_name: "", password: "", role: "member",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAdminTenants({ page: 1, page_size: 100 })
      .then((data) => setTenants(data.items))
      .catch(() => {});
  }, []);

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tenant_id || !form.email || !form.first_name || !form.password || !form.username) {
      setError("Remplissez tous les champs obligatoires");
      return;
    }
    if (form.username.length < 3 || !/^[a-z0-9._]+$/.test(form.username)) {
      setError("Le username doit contenir min 3 caractères (lettres minuscules, chiffres, points, underscores)");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await api.createAdminUser(form);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création");
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Nouvel utilisateur</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Ajouter un utilisateur à une entreprise</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Entreprise *</label>
            <select
              className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={form.tenant_id}
              onChange={(e) => updateForm("tenant_id", e.target.value)}
              required
            >
              <option value="">Sélectionner une entreprise</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prénom *</label>
              <Input className="h-10 bg-muted/30 border-border/50" value={form.first_name}
                onChange={(e) => updateForm("first_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input className="h-10 bg-muted/30 border-border/50" value={form.last_name}
                onChange={(e) => updateForm("last_name", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Username *</label>
            <Input className="h-10 bg-muted/30 border-border/50" placeholder="ex: jean.dupont" value={form.username}
              onChange={(e) => updateForm("username", e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} required />
            <p className="text-[11px] text-muted-foreground">Lettres minuscules, chiffres, points et underscores</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email *</label>
            <Input type="email" className="h-10 bg-muted/30 border-border/50" value={form.email}
              onChange={(e) => updateForm("email", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe *</label>
              <Input type="password" className="h-10 bg-muted/30 border-border/50" value={form.password}
                onChange={(e) => updateForm("password", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rôle</label>
              <select
                className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.role}
                onChange={(e) => updateForm("role", e.target.value)}
              >
                <option value="member">Membre</option>
                <option value="admin">Admin</option>
                <option value="owner">Propriétaire</option>
              </select>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Créer l'utilisateur
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


function EditUserModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    username: user.username || "",
    email: user.email || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    role: user.role || "member",
    is_active: user.is_active ?? true,
    password: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const data: any = { ...form };
      if (!data.password) delete data.password;
      await api.updateAdminUser(user.id, data);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur");
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Modifier l'utilisateur</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email} — {user.tenant_name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prénom</label>
              <Input className="h-10 bg-muted/30 border-border/50" value={form.first_name}
                onChange={(e) => updateForm("first_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input className="h-10 bg-muted/30 border-border/50" value={form.last_name}
                onChange={(e) => updateForm("last_name", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input className="h-10 bg-muted/30 border-border/50" value={form.username}
              onChange={(e) => updateForm("username", e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" className="h-10 bg-muted/30 border-border/50" value={form.email}
              onChange={(e) => updateForm("email", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rôle</label>
              <select
                className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.role}
                onChange={(e) => updateForm("role", e.target.value)}
              >
                <option value="member">Membre</option>
                <option value="admin">Admin</option>
                <option value="owner">Propriétaire</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.is_active ? "true" : "false"}
                onChange={(e) => updateForm("is_active", e.target.value === "true")}
              >
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nouveau mot de passe</label>
            <Input type="password" className="h-10 bg-muted/30 border-border/50"
              placeholder="Laisser vide pour ne pas changer"
              value={form.password}
              onChange={(e) => updateForm("password", e.target.value)} />
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
