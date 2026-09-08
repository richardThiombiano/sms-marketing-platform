"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserMinus,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ============================================
// TYPES
// ============================================

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_dynamic: boolean;
  contact_count: number;
  created_at: string;
}

interface GroupMember {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  is_subscribed: boolean;
  tags: string[];
}

// ============================================
// CREATE/EDIT GROUP MODAL
// ============================================

function GroupModal({
  isOpen,
  onClose,
  onSaved,
  group,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  group: Group | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [group, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError("Le nom du groupe est obligatoire");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      if (group) {
        await api.updateGroup(group.id, { name, description: description || undefined });
      } else {
        await api.createGroup({ name, description: description || undefined });
      }
      onSaved();
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
          <h3 className="text-lg font-semibold text-foreground">
            {group ? "Modifier le groupe" : "Nouveau groupe"}
          </h3>
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
            <label className="text-sm font-medium">Nom du groupe *</label>
            <Input placeholder="Ex: Clients VIP" className="h-10 bg-muted/30 border-border/50"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input placeholder="Description optionnelle" className="h-10 bg-muted/30 border-border/50"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Separator />
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {group ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// VIEW MEMBERS MODAL
// ============================================

function MembersModal({
  isOpen,
  onClose,
  group,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
}) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && group) {
      setIsLoading(true);
      api.getGroupMembers(group.id, { page: 1, page_size: 50 })
        .then((data) => {
          setMembers(data.items);
          setTotal(data.total);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, group]);

  if (!isOpen || !group) return null;

  const handleRemove = async (contactId: string) => {
    try {
      await api.removeGroupMember(group.id, contactId);
      setMembers((prev) => prev.filter((m) => m.id !== contactId));
      setTotal((prev) => prev - 1);
    } catch {}
    setRemovingMemberId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>
            <p className="text-sm text-muted-foreground">{total} membre(s)</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun membre dans ce groupe</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.first_name || ""} {member.last_name || ""}{" "}
                      {!member.first_name && !member.last_name && member.phone}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{member.phone}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                    onClick={() => setRemovingMemberId(member.id)}>
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation retrait membre */}
        {removingMemberId && (
          <div className="p-4 border-t border-border bg-red-50/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground">Retirer ce contact du groupe ?</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setRemovingMemberId(null)}>
                  Annuler
                </Button>
                <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => handleRemove(removingMemberId)}>
                  Retirer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ADD MEMBERS MODAL
// ============================================

function AddMembersModal({
  isOpen,
  onClose,
  onAdded,
  group,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  group: Group | null;
}) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Charger tous les contacts une seule fois à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setSelected([]);
      setSearch("");
      api.getContacts({ page: 1, page_size: 100 } as any)
        .then((data) => setContacts(data.items))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen || !group) return null;

  // Filtrer localement par recherche
  const filteredContacts = search
    ? contacts.filter((c) =>
        (c.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || "").includes(search)
      )
    : contacts;

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setIsSaving(true);
    try {
      await api.addGroupMembers(group.id, selected);
      onAdded();
      onClose();
    } catch {}
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ajouter des membres</h3>
            <p className="text-sm text-muted-foreground">Sélectionnez des contacts pour {group.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un contact..." className="h-9 pl-9 bg-muted/30 border-border/50"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-primary font-medium mt-2">{selected.length} contact(s) sélectionné(s)</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun contact trouvé</p>
          ) : (
            filteredContacts.map((contact) => (
              <label key={contact.id}
                className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selected.includes(contact.id) ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/20"
                )}>
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary"
                  checked={selected.includes(contact.id)}
                  onChange={() => setSelected((prev) =>
                    prev.includes(contact.id) ? prev.filter((id) => id !== contact.id) : [...prev, contact.id]
                  )} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {contact.first_name || ""} {contact.last_name || ""} {!contact.first_name && !contact.last_name && contact.phone}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="p-4 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white"
            onClick={handleAdd} disabled={selected.length === 0 || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Ajouter ({selected.length})
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getGroups({ page, page_size: 20 });
      setGroups(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteGroup(id);
      fetchGroups();
      setShowDeleteConfirm(false);
      setDeletingGroupId(null);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Groupes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organisez vos contacts en groupes • {total} groupe{total > 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}
          className="h-9 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau groupe
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Groups Grid */}
      {!isLoading && !error && (
        <>
          {groups.length === 0 ? (
            <Card className="border border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Aucun groupe</p>
                <p className="text-xs text-muted-foreground mt-1">Créez votre premier groupe de contacts</p>
                <Button onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}
                  className="mt-4 bg-gradient-to-r from-primary to-purple-600 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un groupe
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <Card key={group.id} className="border border-border/50 hover:border-border hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                          <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                          {group.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                        {group.contact_count} contact{group.contact_count > 1 ? "s" : ""}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => { setSelectedGroup(group); setShowAddMembersModal(true); }}
                          title="Ajouter des membres">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => { setSelectedGroup(group); setShowMembersModal(true); }}
                          title="Voir les membres">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingGroup(group); setShowGroupModal(true); }}
                          title="Modifier">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => { setDeletingGroupId(group.id); setShowDeleteConfirm(true); }}
                          title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Modals */}
      <GroupModal
        isOpen={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
        onSaved={fetchGroups}
        group={editingGroup}
      />
      <MembersModal
        isOpen={showMembersModal}
        onClose={() => { setShowMembersModal(false); setSelectedGroup(null); }}
        group={selectedGroup}
      />
      <AddMembersModal
        isOpen={showAddMembersModal}
        onClose={() => { setShowAddMembersModal(false); setSelectedGroup(null); }}
        onAdded={fetchGroups}
        group={selectedGroup}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowDeleteConfirm(false); setDeletingGroupId(null); }} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Supprimer le groupe</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowDeleteConfirm(false); setDeletingGroupId(null); }}>
                Annuler
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => { if (deletingGroupId) handleDelete(deletingGroupId); }}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
