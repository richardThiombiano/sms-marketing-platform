"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ============================================
// TYPES
// ============================================

interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

const categoryConfig: Record<string, { label: string; className: string }> = {
  marketing: { label: "Marketing", className: "bg-blue-500/10 text-blue-600 border-blue-200" },
  birthday: { label: "Anniversaire", className: "bg-purple-500/10 text-purple-600 border-purple-200" },
  reminder: { label: "Rappel", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  transactional: { label: "Transactionnel", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  welcome: { label: "Bienvenue", className: "bg-cyan-500/10 text-cyan-600 border-cyan-200" },
};

// ============================================
// CREATE/EDIT TEMPLATE MODAL
// ============================================

function TemplateModal({
  isOpen,
  onClose,
  onSaved,
  template,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  template: Template | null;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setCategory(template.category || "");
    } else {
      setName("");
      setContent("");
      setCategory("");
    }
  }, [template, isOpen]);

  if (!isOpen) return null;

  // Détecter les variables dans le contenu
  const detectedVars = (content.match(/\{\{(\w+)\}\}/g) || []).map((v) => v.replace(/\{\{|\}\}/g, ""));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content) {
      setError("Le nom et le contenu sont obligatoires");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      if (template) {
        await api.updateTemplate(template.id, {
          name,
          content,
          category: category || undefined,
          variables: detectedVars,
        });
      } else {
        await api.createTemplate({
          name,
          content,
          category: category || undefined,
          variables: detectedVars,
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

  const insertVariable = (varName: string) => {
    setContent((prev) => prev + `{{${varName}}}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {template ? "Modifier le template" : "Nouveau template"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Modèle de message réutilisable</p>
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
            <label className="text-sm font-medium">Nom du template *</label>
            <Input placeholder="Ex: Promo mensuelle" className="h-10 bg-muted/30 border-border/50"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Catégorie</label>
            <select className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm"
              value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Sans catégorie</option>
              <option value="marketing">Marketing</option>
              <option value="birthday">Anniversaire</option>
              <option value="reminder">Rappel</option>
              <option value="transactional">Transactionnel</option>
              <option value="welcome">Bienvenue</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Contenu du message *</label>
            <textarea
              placeholder="Tapez votre message ici... Utilisez {{first_name}} pour personnaliser."
              className="w-full h-32 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {content.length}/160 • {Math.ceil(content.length / 160) || 1} segment(s)
              </span>
              {detectedVars.length > 0 && (
                <span className="text-[10px] text-primary">
                  Variables: {detectedVars.join(", ")}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Variables disponibles (cliquer pour insérer)</label>
            <div className="flex flex-wrap gap-2">
              {["first_name", "last_name", "phone", "city"].map((v) => (
                <button key={v} type="button"
                  onClick={() => insertVariable(v)}
                  className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono">
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {template ? "Enregistrer" : "Créer"}
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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: any = { page, page_size: 20 };
      if (categoryFilter) params.category = categoryFilter;
      const data = await api.getTemplates(params);
      setTemplates(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTemplate(id);
      fetchTemplates();
      setShowDeleteConfirm(false);
      setDeletingTemplateId(null);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modèles de messages réutilisables • {total} template{total > 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => { setEditingTemplate(null); setShowModal(true); }}
          className="h-9 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      {/* Filters */}
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {[
              { value: null, label: "Tous" },
              { value: "marketing", label: "Marketing" },
              { value: "birthday", label: "Anniversaire" },
              { value: "reminder", label: "Rappel" },
              { value: "transactional", label: "Transactionnel" },
              { value: "welcome", label: "Bienvenue" },
            ].map((filter) => (
              <Button
                key={filter.label}
                variant={categoryFilter === filter.value ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => { setCategoryFilter(filter.value); setPage(1); }}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

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

      {/* Templates Grid */}
      {!isLoading && !error && (
        <>
          {templates.length === 0 ? (
            <Card className="border border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Aucun template</p>
                <p className="text-xs text-muted-foreground mt-1">Créez votre premier modèle de message</p>
                <Button onClick={() => { setEditingTemplate(null); setShowModal(true); }}
                  className="mt-4 bg-gradient-to-r from-primary to-purple-600 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Créer un template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const cat = categoryConfig[template.category || ""] || null;
                return (
                  <Card key={template.id} className="border border-border/50 hover:border-border hover:shadow-md transition-all group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
                            {cat && (
                              <Badge variant="outline" className={cn("text-[9px] mt-0.5", cat.className)}>
                                {cat.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 min-h-[3rem]">
                        {template.content}
                      </p>

                      {template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.variables.map((v) => (
                            <span key={v} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground">
                          {template.content.length} car. • {Math.ceil(template.content.length / 160)} seg.
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => { setEditingTemplate(template); setShowModal(true); }} title="Modifier">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => { setDeletingTemplateId(template.id); setShowDeleteConfirm(true); }} title="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
      <TemplateModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTemplate(null); }}
        onSaved={fetchTemplates}
        template={editingTemplate}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowDeleteConfirm(false); setDeletingTemplateId(null); }} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Supprimer le template</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowDeleteConfirm(false); setDeletingTemplateId(null); }}>
                Annuler
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => { if (deletingTemplateId) handleDelete(deletingTemplateId); }}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
