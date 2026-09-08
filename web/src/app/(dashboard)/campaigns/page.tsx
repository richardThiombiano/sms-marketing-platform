"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Send,
  Plus,
  Search,
  Filter,
  Calendar,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  FileText,
  MoreHorizontal,
  Users,
  Zap,
  X,
  Loader2,
  Edit,
  Eye,
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

interface Campaign {
  id: string;
  name: string;
  content: string;
  type: string;
  status: string;
  target_group_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_clicked: number;
  is_ab_test: boolean;
  created_at: string;
}

// ============================================
// CONFIG
// ============================================

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  sent: {
    label: "Envoyé",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  },
  sending: {
    label: "En cours",
    icon: PlayCircle,
    className: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  scheduled: {
    label: "Programmé",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  draft: {
    label: "Brouillon",
    icon: FileText,
    className: "bg-gray-500/10 text-gray-600 border-gray-200",
  },
  cancelled: {
    label: "Annulé",
    icon: XCircle,
    className: "bg-red-500/10 text-red-500 border-red-200",
  },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  marketing: { label: "Marketing", color: "text-blue-600" },
  birthday: { label: "Anniversaire", color: "text-purple-600" },
  reminder: { label: "Rappel", color: "text-amber-600" },
  transactional: { label: "Transactionnel", color: "text-emerald-600" },
};

// ============================================
// DATE TIME PICKER INLINE
// ============================================

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const TIME_SLOTS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00", "22:30", "23:00", "23:30",
];

function DateTimePickerInline({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
}: {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Lundi = 0
  };

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const month = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    onDateChange(`${viewYear}-${month}-${dayStr}`);
  };

  const isToday = (day: number) => {
    return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const month = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return selectedDate === `${viewYear}-${month}-${dayStr}`;
  };

  const isPast = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  // Format selected date for display
  const formatSelectedDate = () => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="rounded-lg border border-border/50 bg-background p-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={prevMonth} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold text-foreground">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button type="button" onClick={nextMonth} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Day names header */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((day) => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Empty cells for days before the 1st */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const past = isPast(day);
            const selected = isSelected(day);
            const todayDay = isToday(day);

            return (
              <button
                key={day}
                type="button"
                disabled={past}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "h-8 w-full rounded-md text-xs font-medium transition-all duration-150",
                  past && "text-muted-foreground/30 cursor-not-allowed",
                  !past && !selected && "hover:bg-primary/10 hover:text-primary cursor-pointer",
                  !past && !selected && todayDay && "bg-muted text-foreground font-bold ring-1 ring-border",
                  selected && "bg-primary text-white shadow-sm shadow-primary/30",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time picker */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Heure d'envoi</label>
        <div className="grid grid-cols-6 gap-1.5 max-h-[120px] overflow-y-auto rounded-lg border border-border/50 bg-background p-2">
          {TIME_SLOTS.map((time) => {
            // Désactiver les créneaux passés si la date sélectionnée est aujourd'hui
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const isSelectedToday = selectedDate === todayStr;
            const [h, m] = time.split(":").map(Number);
            const isPastTime = isSelectedToday && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));

            return (
              <button
                key={time}
                type="button"
                disabled={isPastTime}
                onClick={() => onTimeChange(time)}
                className={cn(
                  "px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                  isPastTime
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : selectedTime === time
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {selectedDate && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">
            Envoi prévu : {formatSelectedDate()} à {selectedTime}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// CREATE CAMPAIGN MODAL
// ============================================

function CreateCampaignModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [campaignType, setCampaignType] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [costEstimate, setCostEstimate] = useState<{ segments: number; total_cost: number | null; unit_price: number | null; is_exact: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset le formulaire à chaque ouverture
      setCampaignType("");
      setName("");
      setContent("");
      setTargetGroupId("");
      setScheduledDate("");
      setScheduledTime("");
      setSelectedTemplateId("");
      setError("");
      setIsSaving(false);
      api.getGroups({ page: 1, page_size: 50 })
        .then((data) => setGroups(data.items))
        .catch(() => {});
      api.getTemplates({ page: 1, page_size: 50 })
        .then((data) => setTemplates(data.items))
        .catch(() => {});
    }
  }, [isOpen]);

  // Estimation du coût de la campagne
  useEffect(() => {
    if (!content || content.length < 1) {
      setCostEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        // Utiliser un numéro burkinabè fictif pour estimer le prix par segment
        const result = await api.estimateSmsCost("+22670000000", content);
        setCostEstimate({
          segments: result.segments,
          total_cost: result.total_cost,
          unit_price: result.unit_price,
          is_exact: result.is_exact,
        });
      } catch {
        setCostEstimate(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [content]);

  if (!isOpen) return null;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        setContent(tpl.content);
      }
    }
  };

  const types = [
    { id: "marketing", title: "Marketing", desc: "Promotions, offres spéciales", icon: Target, color: "from-blue-500 to-blue-600" },
    { id: "birthday", title: "Anniversaire", desc: "Messages automatiques", icon: Calendar, color: "from-purple-500 to-purple-600" },
    { id: "reminder", title: "Rappel", desc: "RDV, renouvellements", icon: Clock, color: "from-amber-500 to-orange-500" },
    { id: "transactional", title: "Transactionnel", desc: "Confirmations, OTP", icon: Zap, color: "from-emerald-500 to-emerald-600" },
  ];

  const handleSave = async (sendNow: boolean) => {
    if (!campaignType || !name || !content) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const hasSchedule = !!(scheduledDate && scheduledTime);
      const campaign = await api.createCampaign({
        name,
        content,
        type: campaignType,
        target_group_id: targetGroupId || undefined,
        scheduled_at: hasSchedule ? `${scheduledDate}T${scheduledTime}:00` : undefined,
      });
      if (sendNow && campaign.id) {
        if (hasSchedule) {
          // Une date/heure a été sélectionnée → programmer l'envoi
          await api.scheduleCampaign(campaign.id, `${scheduledDate}T${scheduledTime}:00`);
        } else {
          // Pas de date → envoi immédiat
          await api.sendCampaign(campaign.id);
        }
      }
      onCreated();
      onClose();
      setName("");
      setContent("");
      setCampaignType("");
      setTargetGroupId("");
      setScheduledDate("");
      setScheduledTime("09:00");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Nouvelle campagne</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Créez et envoyez une campagne SMS</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Type */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Type de campagne</label>
            <div className="grid grid-cols-2 gap-3">
              {types.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setCampaignType(type.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    campaignType === type.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 hover:border-border hover:bg-muted/20"
                  )}
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm", type.color)}>
                    <type.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{type.title}</p>
                    <p className="text-xs text-muted-foreground">{type.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de la campagne</label>
              <Input
                placeholder="Ex: Promo Été 2024"
                className="h-11 bg-muted/30 border-border/50"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Template (optionnel)</label>
              <select
                className="h-11 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
              >
                <option value="">Rédiger un message personnalisé</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.category ? `(${tpl.category})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message SMS</label>
              <div className="relative">
                <textarea
                  placeholder="Tapez votre message ici... Utilisez {{first_name}} pour personnaliser."
                  className="w-full h-32 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="absolute bottom-3 right-3">
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-2 py-0.5">
                    {content.length}/160 caractères
                  </span>
                </div>
              </div>
              {costEstimate && costEstimate.unit_price != null && (
                <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {costEstimate.segments} segment(s) × {costEstimate.unit_price} FCFA
                    </span>
                    <span className="font-semibold text-foreground">
                      {costEstimate.total_cost?.toFixed(2)} FCFA / SMS
                    </span>
                  </div>
                  {targetGroupId && groups.find((g) => g.id === targetGroupId) && (
                    <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-border/30">
                      <span className="text-muted-foreground">
                        {groups.find((g) => g.id === targetGroupId)?.contact_count || 0} destinataire(s)
                      </span>
                      <span className="font-bold text-primary">
                        Coût total estimé : {((costEstimate.total_cost || 0) * (groups.find((g) => g.id === targetGroupId)?.contact_count || 0)).toLocaleString()} FCFA
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Groupe cible */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Destinataires</label>
            <select
              className="h-11 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
            >
              <option value="">Tous les contacts abonnés</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.contact_count} contacts)
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {targetGroupId
                ? "La campagne sera envoyée uniquement aux contacts de ce groupe"
                : "La campagne sera envoyée à tous vos contacts abonnés"}
            </p>
          </div>

          {/* Programmer l'envoi */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Programmer l'envoi (optionnel)</label>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Date et heure d'envoi</p>
                  <p className="text-xs text-muted-foreground">La campagne sera envoyée automatiquement</p>
                </div>
                {scheduledDate && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => { setScheduledDate(""); setScheduledTime("09:00"); }}>
                    Effacer
                  </Button>
                )}
              </div>

              {/* Calendar grid */}
              <DateTimePickerInline
                selectedDate={scheduledDate}
                selectedTime={scheduledTime}
                onDateChange={(date) => {
                  setScheduledDate(date);
                  if (date && !scheduledTime) setScheduledTime("09:00");
                }}
                onTimeChange={setScheduledTime}
              />
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => handleSave(false)} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Sauvegarder
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25"
              onClick={() => handleSave(true)}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (scheduledDate ? <Clock className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />)}
              {scheduledDate ? "Programmer" : "Envoyer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CAMPAIGN CARD
// ============================================

function CampaignCard({ campaign, onView, onEdit, onSend, onSchedule, onCancel }: {
  campaign: Campaign;
  onView: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  onSend: (campaign: Campaign) => void;
  onSchedule: (campaign: Campaign) => void;
  onCancel: (campaign: Campaign) => void;
}) {
  const status = statusConfig[campaign.status] || statusConfig.draft;
  const type = typeConfig[campaign.type] || typeConfig.marketing;
  const StatusIcon = status.icon;
  const deliveryRate =
    campaign.total_sent > 0
      ? ((campaign.total_delivered / campaign.total_sent) * 100).toFixed(1)
      : "—";
  const clickRate =
    campaign.total_delivered > 0
      ? ((campaign.total_clicked / campaign.total_delivered) * 100).toFixed(1)
      : "—";

  return (
    <Card className="border border-border/50 hover:border-border hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
              <Target className="h-5 w-5 text-primary/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground truncate">{campaign.name}</h3>
                <Badge variant="outline" className={cn("text-[10px] font-semibold", status.className)}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{campaign.content}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className={cn("text-[11px] font-medium", type.color)}>{type.label}</span>
                {campaign.total_recipients > 0 && (
                  <>
                    <span className="text-[11px] text-muted-foreground">
                      {campaign.total_recipients} destinataires
                    </span>
                    <span className="text-[11px] text-muted-foreground">{deliveryRate}% délivré</span>
                    {campaign.total_clicked > 0 && (
                      <span className="text-[11px] text-emerald-600 font-medium">{clickRate}% clics</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => onView(campaign)} title="Voir détail">
              <Eye className="h-4 w-4" />
            </Button>
            {campaign.status === "draft" && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => onEdit(campaign)} title="Modifier">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                  onClick={() => onSchedule(campaign)} title="Programmer">
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
                  onClick={() => onSend(campaign)} title="Envoyer">
                  <Send className="h-4 w-4" />
                </Button>
              </>
            )}
            {campaign.status === "scheduled" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                onClick={() => onCancel(campaign)} title="Annuler">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { page: String(page), page_size: "20" };
      if (statusFilter) params.status = statusFilter;
      const data = await api.getCampaigns(params as any);
      setCampaigns(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = searchQuery
    ? campaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : campaigns;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Campagnes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos campagnes SMS • {total} campagne{total > 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="h-9 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/25"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle campagne
        </Button>
      </div>

      {/* Filters */}
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une campagne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 bg-muted/30 border-border/50"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: null, label: "Toutes" },
                { value: "draft", label: "Brouillons" },
                { value: "scheduled", label: "Programmées" },
                { value: "cancelled", label: "Annulées" },
                { value: "sending", label: "En cours" },
                { value: "sent", label: "Envoyées" },
              ].map((filter) => (
                <Button
                  key={filter.label}
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setPage(1);
                  }}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Campaigns List */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {filteredCampaigns.length === 0 ? (
            <Card className="border border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Aucune campagne</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Créez votre première campagne pour commencer
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 bg-gradient-to-r from-primary to-purple-600 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une campagne
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onView={(c) => { setSelectedCampaign(c); setShowDetailModal(true); }}
                onEdit={(c) => { setSelectedCampaign(c); setShowEditModal(true); }}
                onSend={(c) => { setSelectedCampaign(c); setShowSendConfirm(true); }}
                onSchedule={(c) => { setSelectedCampaign(c); setShowScheduleModal(true); }}
                onCancel={(c) => { setSelectedCampaign(c); setShowCancelConfirm(true); }}
              />
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchCampaigns}
      />

      {/* Edit Modal */}
      {showEditModal && selectedCampaign && (
        <EditCampaignModal
          campaign={selectedCampaign}
          onClose={() => { setShowEditModal(false); setSelectedCampaign(null); }}
          onSaved={fetchCampaigns}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedCampaign && (
        <ScheduleCampaignModal
          campaign={selectedCampaign}
          onClose={() => { setShowScheduleModal(false); setSelectedCampaign(null); }}
          onScheduled={fetchCampaigns}
        />
      )}

      {/* Send Confirmation */}
      {showSendConfirm && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowSendConfirm(false); setSelectedCampaign(null); }} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Send className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Envoyer la campagne</h3>
                <p className="text-sm text-muted-foreground mt-0.5">"{selectedCampaign.name}" sera envoyée immédiatement.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowSendConfirm(false); setSelectedCampaign(null); }}>
                Annuler
              </Button>
              <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={async () => {
                  try {
                    await api.sendCampaign(selectedCampaign.id);
                    fetchCampaigns();
                  } catch {}
                  setShowSendConfirm(false);
                  setSelectedCampaign(null);
                }}>
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {showCancelConfirm && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowCancelConfirm(false); setSelectedCampaign(null); }} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Annuler la campagne</h3>
                <p className="text-sm text-muted-foreground mt-0.5">"{selectedCampaign.name}" ne sera pas envoyée.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowCancelConfirm(false); setSelectedCampaign(null); }}>
                Retour
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={async () => {
                  try {
                    await api.cancelCampaign(selectedCampaign.id);
                    fetchCampaigns();
                  } catch {}
                  setShowCancelConfirm(false);
                  setSelectedCampaign(null);
                }}>
                <XCircle className="mr-2 h-4 w-4" />
                Annuler la campagne
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => { setShowDetailModal(false); setSelectedCampaign(null); }}
        />
      )}
    </div>
  );
}


// ============================================
// EDIT CAMPAIGN MODAL
// ============================================

function EditCampaignModal({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(campaign.name);
  const [content, setContent] = useState(campaign.content);
  const [campaignType, setCampaignType] = useState(campaign.type);
  const [targetGroupId, setTargetGroupId] = useState(campaign.target_group_id || "");
  const [scheduledDate, setScheduledDate] = useState(campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().split("T")[0] : "");
  const [scheduledTime, setScheduledTime] = useState(campaign.scheduled_at ? new Date(campaign.scheduled_at).toTimeString().slice(0, 5) : "09:00");
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getGroups({ page: 1, page_size: 50 })
      .then((data) => setGroups(data.items))
      .catch(() => {});
    api.getTemplates({ page: 1, page_size: 50 })
      .then((data) => setTemplates(data.items))
      .catch(() => {});
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        setContent(tpl.content);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content || !campaignType) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await api.updateCampaign(campaign.id, {
        name,
        content,
        type: campaignType,
        target_group_id: targetGroupId || undefined,
      });
      if (scheduledDate && scheduledTime) {
        await api.scheduleCampaign(campaign.id, `${scheduledDate}T${scheduledTime}:00`);
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
            <h3 className="text-lg font-semibold text-foreground">Modifier la campagne</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{campaign.name}</p>
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
            <label className="text-sm font-medium">Nom de la campagne</label>
            <Input className="h-10 bg-muted/30 border-border/50" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm"
              value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
              <option value="marketing">Marketing</option>
              <option value="birthday">Anniversaire</option>
              <option value="reminder">Rappel</option>
              <option value="transactional">Transactionnel</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Template (optionnel)</label>
            <select className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm"
              value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
              <option value="">Garder le message actuel</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.name} {tpl.category ? `(${tpl.category})` : ""}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message SMS</label>
            <textarea
              className="w-full h-28 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={content} onChange={(e) => setContent(e.target.value)} />
            <span className="text-[10px] text-muted-foreground">{content.length}/160 caractères</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Destinataires</label>
            <select className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm"
              value={targetGroupId} onChange={(e) => setTargetGroupId(e.target.value)}>
              <option value="">Tous les contacts abonnés</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.contact_count} contacts)</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">Programmer l'envoi (optionnel)</label>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Date et heure d'envoi</p>
                  <p className="text-xs text-muted-foreground">La campagne sera envoyée automatiquement</p>
                </div>
                {scheduledDate && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => { setScheduledDate(""); setScheduledTime("09:00"); }}>
                    Effacer
                  </Button>
                )}
              </div>
              <DateTimePickerInline
                selectedDate={scheduledDate}
                selectedTime={scheduledTime}
                onDateChange={setScheduledDate}
                onTimeChange={setScheduledTime}
              />
            </div>
          </div>
          <Separator />
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// CAMPAIGN DETAIL MODAL
// ============================================

function CampaignDetailModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const status = statusConfig[campaign.status] || statusConfig.draft;
  const type = typeConfig[campaign.type] || typeConfig.marketing;
  const StatusIcon = status.icon;
  const deliveryRate = campaign.total_sent > 0
    ? ((campaign.total_delivered / campaign.total_sent) * 100).toFixed(1)
    : "0";
  const failRate = campaign.total_sent > 0
    ? ((campaign.total_failed / campaign.total_sent) * 100).toFixed(1)
    : "0";

  const [groupName, setGroupName] = useState<string | null>(null);

  useEffect(() => {
    if (campaign.target_group_id) {
      api.getGroups({ page: 1, page_size: 100 })
        .then((data) => {
          const group = data.items.find((g: any) => g.id === campaign.target_group_id);
          if (group) setGroupName(group.name);
        })
        .catch(() => {});
    }
  }, [campaign.target_group_id]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Détail de la campagne</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{campaign.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Statut et type */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", status.className)}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{status.label}</p>
              <p className={cn("text-xs font-medium", type.color)}>{type.label}</p>
            </div>
          </div>

          {/* Groupe cible */}
          {campaign.target_group_id && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Groupe cible</p>
                <p className="text-sm font-medium text-foreground">{groupName || "Chargement..."}</p>
              </div>
            </div>
          )}

          {/* Contenu du message */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</p>
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-sm text-foreground whitespace-pre-wrap">{campaign.content}</p>
              <p className="text-[10px] text-muted-foreground mt-2">
                {campaign.content.length} caractères • {Math.ceil(campaign.content.length / 160) || 1} segment(s)
              </p>
            </div>
          </div>

          {/* Statistiques d'envoi */}
          {campaign.total_recipients > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statistiques</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/50 text-center">
                  <p className="text-lg font-bold text-foreground">{campaign.total_recipients}</p>
                  <p className="text-[10px] text-muted-foreground">Destinataires</p>
                </div>
                <div className="p-3 rounded-lg border border-border/50 text-center">
                  <p className="text-lg font-bold text-blue-600">{campaign.total_sent}</p>
                  <p className="text-[10px] text-muted-foreground">Envoyés</p>
                </div>
                <div className="p-3 rounded-lg border border-border/50 text-center">
                  <p className="text-lg font-bold text-emerald-600">{campaign.total_delivered}</p>
                  <p className="text-[10px] text-muted-foreground">Délivrés ({deliveryRate}%)</p>
                </div>
                <div className="p-3 rounded-lg border border-border/50 text-center">
                  <p className="text-lg font-bold text-red-500">{campaign.total_failed}</p>
                  <p className="text-[10px] text-muted-foreground">Échoués ({failRate}%)</p>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Créée le</span>
                <span className="text-sm font-medium text-foreground">{formatDate(campaign.created_at)}</span>
              </div>
              {campaign.scheduled_at && (
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Programmée pour</span>
                  <span className="text-sm font-medium text-foreground">{formatDate(campaign.scheduled_at)}</span>
                </div>
              )}
              {campaign.sent_at && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Envoyée le</span>
                  <span className="text-sm font-medium text-foreground">{formatDate(campaign.sent_at)}</span>
                </div>
              )}
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SCHEDULE CAMPAIGN MODAL
// ============================================

function ScheduleCampaignModal({
  campaign,
  onClose,
  onScheduled,
}: {
  campaign: Campaign;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate || !scheduledTime) {
      setError("Veuillez choisir une date et une heure");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
      await api.scheduleCampaign(campaign.id, scheduledAt);
      onScheduled();
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
      <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Programmer l'envoi</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{campaign.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
          )}
          <DateTimePickerInline
            selectedDate={scheduledDate}
            selectedTime={scheduledTime}
            onDateChange={setScheduledDate}
            onTimeChange={setScheduledTime}
          />
          <Separator />
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white" disabled={isSaving || !scheduledDate}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
              Programmer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
