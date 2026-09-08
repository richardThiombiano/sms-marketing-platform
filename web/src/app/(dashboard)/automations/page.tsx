"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  Power,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  UserPlus,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ============================================
// TYPES & CONFIG
// ============================================

interface Automation {
  id: string;
  name: string;
  type: string;
  template_id: string | null;
  message_content: string | null;
  is_active: boolean;
  trigger_config: Record<string, any>;
  target_filters: Record<string, any> | null;
  last_run_at: string | null;
  next_run_at: string | null;
  total_sent: number;
  created_at: string | null;
}

const typeConfig: Record<string, { label: string; desc: string; icon: any; className: string }> = {
  birthday: {
    label: "Anniversaire",
    desc: "Envoi automatique le jour de l'anniversaire",
    icon: Calendar,
    className: "bg-purple-500/10 text-purple-600 border-purple-200",
  },
  welcome: {
    label: "Bienvenue",
    desc: "Envoi quand un nouveau contact est ajouté",
    icon: UserPlus,
    className: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  inactivity: {
    label: "Inactivité",
    desc: "Relance après X jours sans message",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  recurring: {
    label: "Récurrent",
    desc: "Envoi répété (hebdo, mensuel...)",
    icon: RefreshCw,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  },
};

// ============================================
// CREATE/EDIT AUTOMATION MODAL
// ============================================

function AutomationModal({
  isOpen,
  onClose,
  onSaved,
  automation,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  automation: Automation | null;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [inactivityDays, setInactivityDays] = useState("30");
  const [recurringInterval, setRecurringInterval] = useState("weekly");
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      api.getTemplates({ page: 1, page_size: 50 }).then((d) => setTemplates(d.items)).catch(() => {});
      api.getGroups({ page: 1, page_size: 50 }).then((d) => setGroups(d.items)).catch(() => {});
      if (automation) {
        setName(automation.name);
        setType(automation.type);
        setMessageContent(automation.message_content || automation.trigger_config?.message_content || "");
        setSelectedTemplateId(automation.template_id || "");
        setTargetGroupId(automation.trigger_config?.target_group_id || "");
        setInactivityDays(automation.trigger_config?.days || "30");
        setRecurringInterval(automation.trigger_config?.interval || "weekly");
      } else {
        setName("");
        setType("");
        setMessageContent("");
        setSelectedTemplateId("");
        setTargetGroupId("");
        setInactivityDays("30");
        setRecurringInterval("weekly");
      }
    }
  }, [isOpen, automation]);

  if (!isOpen) return null;

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    if (id) {
      const tpl = templates.find((t) => t.id === id);
      if (tpl) setMessageContent(tpl.content);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type || !messageContent) {
      setError("Remplissez tous les champs obligatoires");
      return;
    }
    setIsSaving(true);
    setError("");

    const triggerConfig: Record<string, any> = { message_content: messageContent };
    if (type === "inactivity") triggerConfig.days = parseInt(inactivityDays);
    if (type === "recurring") triggerConfig.interval = recurringInterval;
    if (targetGroupId) triggerConfig.target_group_id = targetGroupId;

    try {
      if (automation) {
        await api.updateAutomation(automation.id, {
          name,
          type,
          template_id: selectedTemplateId || undefined,
          message_content: messageContent,
          trigger_config: triggerConfig,
        });
      } else {
        await api.createAutomation({
          name,
          type,
          template_id: selectedTemplateId || undefined,
          message_content: messageContent,
          trigger_config: triggerConfig,
        });
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
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {automation ? "Modifier l'automation" : "Nouvelle programmation"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Envoi automatique de SMS</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Nom *</label>
            <Input placeholder="Ex: Anniversaire clients" className="h-10 bg-muted/30 border-border/50"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type de déclencheur *</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(typeConfig).map(([key, config]) => (
                <button key={key} type="button" onClick={() => setType(key)}
                  className={cn("flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all",
                    type === key ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                  )}>
                  <config.icon className={cn("h-4 w-4", type === key ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-xs font-medium">{config.label}</p>
                    <p className="text-[10px] text-muted-foreground">{config.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Config spécifique au type */}
          {type === "inactivity" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Jours d'inactivité</label>
              <Input type="number" className="h-10 bg-muted/30 border-border/50" min="1"
                value={inactivityDays} onChange={(e) => setInactivityDays(e.target.value)} />
              <p className="text-xs text-muted-foreground">Envoyer après X jours sans message reçu</p>
            </div>
          )}

          {type === "recurring" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Fréquence</label>
              <select className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm"
                value={recurringInterval} onChange={(e) => setRecurringInterval(e.target.value)}>
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuel</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Groupe cible</label>
            <select className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm"
              value={targetGroupId} onChange={(e) => setTargetGroupId(e.target.value)}>
              <option value="">Tous les contacts abonnés</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.contact_count} contacts)</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {targetGroupId ? "L'automation s'appliquera uniquement à ce groupe" : "L'automation s'appliquera à tous vos contacts"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Template (optionnel)</label>
            <select className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm"
              value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
              <option value="">Rédiger un message personnalisé</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message *</label>
            <textarea
              placeholder="Tapez votre message... Utilisez {{first_name}} pour personnaliser."
              className="w-full h-24 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={messageContent} onChange={(e) => setMessageContent(e.target.value)} required />
            <span className="text-[10px] text-muted-foreground">{messageContent.length}/160 caractères</span>
          </div>

          <Separator />
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {automation ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [togglingAutomation, setTogglingAutomation] = useState<Automation | null>(null);

  const fetchAutomations = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getAutomations({ page, page_size: 20 });
      setAutomations(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  const handleDelete = async (id: string) => {
    await api.deleteAutomation(id);
    fetchAutomations();
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  const handleToggle = async (automation: Automation) => {
    await api.toggleAutomation(automation.id);
    fetchAutomations();
    setShowToggleConfirm(false);
    setTogglingAutomation(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Programmation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envois SMS automatiques • {total} automation{total > 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => { setEditingAutomation(null); setShowModal(true); }}
          className="h-9 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle programmation
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Automations Grid */}
      {!isLoading && !error && (
        <>
          {automations.length === 0 ? (
            <Card className="border border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Aucune programmation</p>
                <p className="text-xs text-muted-foreground mt-1">Créez votre première programmation</p>
                <Button onClick={() => { setEditingAutomation(null); setShowModal(true); }}
                  className="mt-4 bg-gradient-to-r from-primary to-purple-600 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Créer une programmation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {automations.map((automation) => {
                const config = typeConfig[automation.type] || typeConfig.birthday;
                const TypeIcon = config.icon;
                return (
                  <Card key={automation.id} className="border border-border/50 hover:border-border hover:shadow-md transition-all group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", config.className.split(" ")[0])}>
                            <TypeIcon className={cn("h-5 w-5", config.className.split(" ")[1])} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-foreground">{automation.name}</h3>
                              <Badge variant="outline" className={cn("text-[9px]",
                                automation.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-gray-500/10 text-gray-500 border-gray-200"
                              )}>
                                {automation.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <Badge variant="outline" className={cn("text-[9px] mt-1", config.className)}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {automation.message_content || automation.trigger_config?.message_content || "—"}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{automation.total_sent} SMS envoyés</span>
                        <span>Dernier: {formatDate(automation.last_run_at)}</span>
                      </div>

                      <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingAutomation(automation); setShowModal(true); }} title="Modifier">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className={cn("h-7 w-7", automation.is_active ? "text-muted-foreground hover:text-red-500" : "text-muted-foreground hover:text-emerald-500")}
                          onClick={() => { setTogglingAutomation(automation); setShowToggleConfirm(true); }}
                          title={automation.is_active ? "Désactiver" : "Activer"}>
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() => { setDeletingId(automation.id); setShowDeleteConfirm(true); }} title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
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

      {/* Create/Edit Modal */}
      <AutomationModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingAutomation(null); }}
        onSaved={fetchAutomations}
        automation={editingAutomation}
      />

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
                <h3 className="text-base font-semibold text-foreground">Supprimer la programmation</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteConfirm(false); setDeletingId(null); }}>
                Annuler
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => { if (deletingId) handleDelete(deletingId); }}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Confirmation */}
      {showToggleConfirm && togglingAutomation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowToggleConfirm(false); setTogglingAutomation(null); }} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full",
                togglingAutomation.is_active ? "bg-red-500/10" : "bg-emerald-500/10")}>
                <Power className={cn("h-5 w-5", togglingAutomation.is_active ? "text-red-500" : "text-emerald-500")} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {togglingAutomation.is_active ? "Désactiver" : "Activer"} l'automation
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  "{togglingAutomation.name}" {togglingAutomation.is_active ? "ne s'exécutera plus" : "reprendra ses envois"}.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowToggleConfirm(false); setTogglingAutomation(null); }}>
                Annuler
              </Button>
              <Button className={cn("flex-1 text-white",
                togglingAutomation.is_active ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600")}
                onClick={() => handleToggle(togglingAutomation)}>
                <Power className="mr-2 h-4 w-4" />
                {togglingAutomation.is_active ? "Désactiver" : "Activer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
