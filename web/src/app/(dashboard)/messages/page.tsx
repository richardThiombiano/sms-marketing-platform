"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  phone: string;
  content: string;
  type: string;
  status: string;
  provider: string | null;
  provider_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  segments_count: number;
  cost: number | null;
  created_at: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
}

// ============================================
// CONFIG
// ============================================

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  queued: {
    label: "En file",
    icon: Clock,
    className: "bg-gray-500/10 text-gray-600 border-gray-200",
  },
  sent: {
    label: "Envoyé",
    icon: Send,
    className: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  delivered: {
    label: "Délivré",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  },
  failed: {
    label: "Échoué",
    icon: XCircle,
    className: "bg-red-500/10 text-red-500 border-red-200",
  },
  rejected: {
    label: "Rejeté",
    icon: AlertCircle,
    className: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
};

// ============================================
// SMS TYPE SELECTOR (partagé entre les 3 modals)
// ============================================

type SmsTypeValue = "transactional" | "marketing" | "promotional" | "birthday" | "reminder";

const SMS_TYPES: { value: SmsTypeValue; label: string }[] = [
  { value: "transactional", label: "Transactionnel" },
  { value: "marketing", label: "Marketing" },
  { value: "promotional", label: "Promotionnel" },
  { value: "birthday", label: "Anniversaire" },
  { value: "reminder", label: "Rappel" },
];

function SmsTypeSelector({
                           value,
                           onChange,
                         }: {
  value: string;
  onChange: (value: SmsTypeValue) => void;
}) {
  return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Type de message</label>
        <div className="flex gap-2 flex-wrap">
          {SMS_TYPES.map((type) => (
              <Button
                  key={type.value}
                  type="button"
                  variant={value === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange(type.value)}
              >
                {type.label}
              </Button>
          ))}
        </div>
      </div>
  );
}

// ============================================
// CONTACT PICKER (recherche + sélection de contacts)
// ============================================

interface PickedContact {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
}

function ContactPicker({
  mode,
  selectedContacts,
  onSelect,
  onRemove,
}: {
  mode: "single" | "multiple";
  selectedContacts: PickedContact[];
  onSelect: (contact: PickedContact) => void;
  onRemove: (contactId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<PickedContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Fermer la dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.getContacts({ page: 1, page_size: 10, search: value.trim() });
        setResults(
          data.items.map((c: any) => ({
            id: c.id,
            phone: c.phone,
            first_name: c.first_name,
            last_name: c.last_name,
          }))
        );
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelect = (contact: PickedContact) => {
    // Éviter les doublons
    if (selectedContacts.some((c) => c.id === contact.id)) return;
    onSelect(contact);
    if (mode === "single") {
      setSearchQuery("");
      setShowResults(false);
    } else {
      setSearchQuery("");
    }
  };

  const getContactLabel = (c: PickedContact) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
    return name ? `${name} (${c.phone})` : c.phone;
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-medium">
        {mode === "single" ? "Sélectionner un contact" : "Sélectionner des contacts"}
      </label>

      {/* Contacts sélectionnés (chips) */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedContacts.map((contact) => (
            <span
              key={contact.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              <Phone className="h-3 w-3" />
              {getContactLabel(contact)}
              <button
                type="button"
                onClick={() => onRemove(contact.id)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Champ de recherche */}
      {(mode === "multiple" || selectedContacts.length === 0) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, téléphone ou email..."
            className="h-10 pl-10 bg-muted/30 border-border/50"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}

          {/* Dropdown résultats */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
              {results.length === 0 ? (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  Aucun contact trouvé
                </div>
              ) : (
                results.map((contact) => {
                  const isAlreadySelected = selectedContacts.some((c) => c.id === contact.id);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      disabled={isAlreadySelected}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        isAlreadySelected
                          ? "opacity-50 cursor-not-allowed bg-muted/30"
                          : "hover:bg-muted/50 cursor-pointer"
                      )}
                      onClick={() => handleSelect(contact)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {(contact.first_name?.[0] || contact.phone[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>
                      </div>
                      {isAlreadySelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Tapez au moins 2 caractères pour rechercher dans vos contacts
      </p>
    </div>
  );
}

// ============================================
// SEND SINGLE SMS MODAL
// ============================================

function SendSmsModal({
  isOpen,
  onClose,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [selectedContact, setSelectedContact] = useState<PickedContact | null>(null);
  const [content, setContent] = useState("");
  const [smsType, setSmsType] = useState<SmsTypeValue | "">("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "contact">("contact");
  const [costEstimate, setCostEstimate] = useState<{ segments: number; total_cost: number | null; country_name: string | null; is_exact: boolean } | null>(null);

  // Estimation du coût en temps réel
  const resolvedPhone = inputMode === "contact" ? selectedContact?.phone || "" : phone;

  useEffect(() => {
    if (!resolvedPhone || !content || content.length < 1) {
      setCostEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await api.estimateSmsCost(resolvedPhone, content);
        setCostEstimate({ segments: result.segments, total_cost: result.total_cost, country_name: result.country_name, is_exact: result.is_exact });
      } catch {
        setCostEstimate(null);
      }
    }, 500); // Debounce 500ms
    return () => clearTimeout(timer);
  }, [resolvedPhone, content]);

  if (!isOpen) return null;

  const handleCancel = () => {
    setPhone("");
    setSelectedContact(null);
    setContent("");
    setSmsType("");
    setError("");
    setInputMode("contact");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedPhone || !content) {
      setError("Le numéro et le message sont obligatoires");
      return;
    }
    if (!smsType) {
      setError("Veuillez sélectionner un type de message");
      return;
    }
    setIsSending(true);
    setError("");
    try {
      await api.sendSms({ phone: resolvedPhone, content, type: smsType });
      setPhone("");
      setSelectedContact(null);
      setContent("");
      setSmsType("");
      setInputMode("contact");
      onSent();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Envoyer un SMS</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Envoi direct à un destinataire</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Toggle mode de saisie */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={inputMode === "contact" ? "default" : "outline"}
              size="sm"
              onClick={() => { setInputMode("contact"); setPhone(""); }}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Depuis les contacts
            </Button>
            <Button
              type="button"
              variant={inputMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => { setInputMode("manual"); setSelectedContact(null); }}
            >
              <Phone className="mr-1.5 h-3.5 w-3.5" />
              Saisie manuelle
            </Button>
          </div>

          {/* Mode contact */}
          {inputMode === "contact" && (
            <ContactPicker
              mode="single"
              selectedContacts={selectedContact ? [selectedContact] : []}
              onSelect={(contact) => setSelectedContact(contact)}
              onRemove={() => setSelectedContact(null)}
            />
          )}

          {/* Mode saisie manuelle */}
          {inputMode === "manual" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Numéro de téléphone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="+226XXXXXXXX"
                  className="h-10 pl-10 bg-muted/30 border-border/50"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          <SmsTypeSelector value={smsType} onChange={setSmsType} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Message *</label>
            <div className="relative">
              <textarea
                placeholder="Tapez votre message ici..."
                className="w-full h-28 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <div className="absolute bottom-3 right-3">
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-2 py-0.5">
                  {content.length}/160 • {Math.ceil(content.length / 160) || 1} segment(s)
                </span>
              </div>
            </div>
            {costEstimate && costEstimate.total_cost != null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {costEstimate.is_exact ? "Coût" : "Coût estimé"} : {costEstimate.total_cost.toFixed(2)} FCFA
                </span>
                <span>•</span>
                <span>{costEstimate.segments} segment(s)</span>
                {costEstimate.country_name && <span>• {costEstimate.country_name}</span>}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={handleCancel} disabled={isSending}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25"
              disabled={isSending || !resolvedPhone}
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SEND BULK SMS MODAL
// ============================================

function SendBulkSmsModal({
  isOpen,
  onClose,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [phones, setPhones] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<PickedContact[]>([]);
  const [content, setContent] = useState("");
  const [smsType, setSmsType] = useState<SmsTypeValue | "">("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "contacts">("contacts");
  const [costEstimate, setCostEstimate] = useState<{ segments: number; unit_price: number | null; total_cost: number | null } | null>(null);

  // Estimation du coût en temps réel
  useEffect(() => {
    if (!content || content.length < 1) {
      setCostEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await api.estimateSmsCost("+22670000000", content);
        setCostEstimate({ segments: result.segments, unit_price: result.unit_price, total_cost: result.total_cost });
      } catch {
        setCostEstimate(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [content]);

  if (!isOpen) return null;

  const handleCancel = () => {
    setPhones("");
    setSelectedContacts([]);
    setContent("");
    setSmsType("");
    setError("");
    setInputMode("contacts");
    onClose();
  };

  // Calcul des numéros finaux selon le mode
  const manualPhoneList = phones
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const allPhones = inputMode === "contacts"
    ? selectedContacts.map((c) => c.phone)
    : manualPhoneList;

  const phoneCount = allPhones.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneCount === 0 || !content) {
      setError("Ajoutez au moins un destinataire et un message");
      return;
    }
    if (!smsType) {
      setError("Veuillez sélectionner un type de message");
      return;
    }
    setIsSending(true);
    setError("");
    try {
      await api.sendBulkSms({ phones: allPhones, content, type: smsType });
      setPhones("");
      setSelectedContacts([]);
      setContent("");
      setSmsType("");
      setInputMode("contacts");
      onSent();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Envoi en masse</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Envoyer à plusieurs destinataires</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Toggle mode de saisie */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={inputMode === "contacts" ? "default" : "outline"}
              size="sm"
              onClick={() => { setInputMode("contacts"); setPhones(""); }}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Depuis les contacts
            </Button>
            <Button
              type="button"
              variant={inputMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => { setInputMode("manual"); setSelectedContacts([]); }}
            >
              <Phone className="mr-1.5 h-3.5 w-3.5" />
              Saisie manuelle
            </Button>
          </div>

          {/* Mode contacts */}
          {inputMode === "contacts" && (
            <ContactPicker
              mode="multiple"
              selectedContacts={selectedContacts}
              onSelect={(contact) => setSelectedContacts((prev) => [...prev, contact])}
              onRemove={(id) => setSelectedContacts((prev) => prev.filter((c) => c.id !== id))}
            />
          )}

          {/* Mode saisie manuelle */}
          {inputMode === "manual" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Numéros de téléphone *</label>
                <span className="text-xs text-muted-foreground">{manualPhoneList.length} numéro(s)</span>
              </div>
              <textarea
                placeholder={"Un numéro par ligne, ou séparés par des virgules\n+226XXXXXXXX\n+226XXXXXXXX\n+33 6 12 34 56 78"}
                className="w-full h-32 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 font-mono"
                value={phones}
                onChange={(e) => setPhones(e.target.value)}
              />
            </div>
          )}

          <SmsTypeSelector value={smsType} onChange={setSmsType} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Message *</label>
            <div className="relative">
              <textarea
                placeholder="Tapez votre message ici..."
                className="w-full h-28 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <div className="absolute bottom-3 right-3">
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-2 py-0.5">
                  {content.length}/160 • {Math.ceil(content.length / 160) || 1} segment(s)
                </span>
              </div>
            </div>
          </div>

          {phoneCount > 0 && content && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
              <p className="font-medium text-foreground">Résumé</p>
              <p className="text-muted-foreground mt-1">
                {phoneCount} destinataire(s) × {costEstimate?.segments || Math.ceil(content.length / 160) || 1} segment(s)
                {costEstimate?.unit_price != null && (
                  <> × {costEstimate.unit_price} FCFA</>
                )}
              </p>
              {costEstimate?.unit_price != null && (
                <p className="font-bold text-primary mt-1">
                  Coût total estimé : {(phoneCount * (costEstimate.total_cost || 0)).toLocaleString()} FCFA
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={handleCancel} disabled={isSending}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25"
              disabled={isSending || phoneCount === 0}
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer ({phoneCount})
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SEND TO GROUPS MODAL
// ============================================

function SendToGroupsModal({
  isOpen,
  onClose,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [smsType, setSmsType] = useState<SmsTypeValue | "">("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [costEstimate, setCostEstimate] = useState<{ segments: number; unit_price: number | null; total_cost: number | null } | null>(null);

  // Estimation du coût en temps réel
  useEffect(() => {
    if (!content || content.length < 1) {
      setCostEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await api.estimateSmsCost("+22670000000", content);
        setCostEstimate({ segments: result.segments, unit_price: result.unit_price, total_cost: result.total_cost });
      } catch {
        setCostEstimate(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingGroups(true);
      setSelectedGroups([]);
      setError("");
      setSuccess("");
      api.getGroups({ page: 1, page_size: 50 })
        .then((data) => setGroups(data.items))
        .catch(() => {})
        .finally(() => setIsLoadingGroups(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = () => {
    setSelectedGroups([]);
    setContent("");
    setSmsType("");
    setError("");
    setSuccess("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroups.length === 0 || !content) {
      setError("Sélectionnez au moins un groupe et rédigez un message");
      return;
    }
    if (!smsType) {
      setError("Veuillez sélectionner un type de message");
      return;
    }
    setIsSending(true);
    setError("");
    setSuccess("");
    try {
      const result = await api.sendToGroups({ group_ids: selectedGroups, content, type: smsType });
      setContent("");
      setSelectedGroups([]);
      setSmsType("");
      onSent();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const totalContacts = groups
    .filter((g) => selectedGroups.includes(g.id))
    .reduce((sum, g) => sum + g.contact_count, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative z-10 w-full max-w-max mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Envoyer à des groupes</h3>
            <p className="text-sm text-muted-foreground mt-0.5">SMS à tous les contacts des groupes sélectionnés</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-200 text-sm text-emerald-600">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Sélectionner les groupes *</label>
            {isLoadingGroups ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Aucun groupe disponible. Créez-en un d'abord.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {groups.map((group) => (
                  <label
                    key={group.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedGroups.includes(group.id)
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:bg-muted/20"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() =>
                        setSelectedGroups((prev) =>
                          prev.includes(group.id)
                            ? prev.filter((id) => id !== group.id)
                            : [...prev, group.id]
                        )
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-200">
                      {group.contact_count} contacts
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </div>

          <SmsTypeSelector value={smsType} onChange={setSmsType} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Message *</label>
            <div className="relative">
              <textarea
                placeholder="Tapez votre message ici..."
                className="w-full h-28 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <div className="absolute bottom-3 right-3">
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-2 py-0.5">
                  {content.length}/160 • {Math.ceil(content.length / 160) || 1} segment(s)
                </span>
              </div>
            </div>
          </div>

          {selectedGroups.length > 0 && content && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
              <p className="font-medium text-foreground">Résumé</p>
              <p className="text-muted-foreground mt-1">
                {selectedGroups.length} groupe(s) • ~{totalContacts} contact(s) × {costEstimate?.segments || Math.ceil(content.length / 160) || 1} segment(s)
                {costEstimate?.unit_price != null && (
                  <> × {costEstimate.unit_price} FCFA</>
                )}
              </p>
              {costEstimate?.unit_price != null && (
                <p className="font-bold text-primary mt-1">
                  Coût total estimé : {(totalContacts * (costEstimate.total_cost || 0)).toLocaleString()} FCFA
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={handleCancel} disabled={isSending}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25"
              disabled={isSending || selectedGroups.length === 0}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Envoyer aux groupes
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

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const fetchBalance = useAuthStore((state) => state.fetchBalance);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, any> = { page, page_size: 20 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (searchPhone) params.phone = searchPhone;
      const data = await api.getMessages(params);
      setMessages(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, typeFilter, searchPhone]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleSearch = (value: string) => {
    setSearchPhone(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        setPage(1);
      }, 500)
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const typeConfig: Record<string, { label: string; className: string }> = {
    transactional: {
      label: "Transactionnel",
      className: "bg-gray-500/10 text-gray-600 border-gray-200",
    },
    marketing: {
      label: "Marketing",
      className: "bg-blue-500/10 text-blue-600 border-blue-200",
    },
    promotional: {
      label: "Promotionnel",
      className: "bg-purple-500/10 text-purple-600 border-purple-200",
    },
    birthday: {
      label: "Anniversaire",
      className: "bg-pink-500/10 text-pink-600 border-pink-200",
    },
    reminder: {
      label: "Rappel",
      className: "bg-amber-500/10 text-amber-600 border-amber-200",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historique et envoi de SMS • {total} message{total > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-9"
            onClick={() => setShowGroupsModal(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Envoyer aux groupes
          </Button>
          <Button
            variant="outline"
            className="h-9"
            onClick={() => setShowBulkModal(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Envoi en masse
          </Button>
          <Button
            onClick={() => setShowSendModal(true)}
            className="h-9 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/25"
          >
            <Send className="mr-2 h-4 w-4" />
            Envoyer un SMS
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total messages", value: total.toLocaleString(), icon: MessageSquare, color: "text-blue-600" },
          { label: "Envoyés", value: messages.filter((m) => m.status === "sent").length.toString(), icon: CheckCircle2, color: "text-blue-600" },
          { label: "Delivrés", value: messages.filter((m) => m.status === "delivered").length.toString(), icon: CheckCircle2, color: "text-green-500" },
          { label: "Échoués", value: messages.filter((m) => m.status === "failed").length.toString(), icon: XCircle, color: "text-red-500" },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro..."
                value={searchPhone}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 pl-9 bg-muted/30 border-border/50"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: null, label: "Tous" },
                { value: "queued", label: "En file" },
                { value: "sent", label: "Envoyés" },
                { value: "delivered", label: "Délivrés" },
                { value: "failed", label: "Échoués" },
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
            <select
              className="h-9 rounded-md border border-border/50 bg-muted/30 px-3 text-sm"
              value={typeFilter || ""}
              onChange={(e) => { setTypeFilter(e.target.value || null); setPage(1); }}
            >
              <option value="">Tous les types</option>
              <option value="transactional">Transactionnel</option>
              <option value="marketing">Marketing</option>
              <option value="birthday">Anniversaire</option>
              <option value="reminder">Rappel</option>
              <option value="promotional">Promotionnel</option>
            </select>
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

      {/* Messages Table */}
      {!isLoading && !error && (
        <Card className="border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Destinataire
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Prénom
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Message
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Date Creation
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Date Envoi
                  </th>                  
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Coût
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                  
                  <th className="w-16 p-4"></th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-sm font-medium text-muted-foreground">Aucun message</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Envoyez votre premier SMS
                      </p>
                      <Button
                        onClick={() => setShowSendModal(true)}
                        className="mt-4 bg-gradient-to-r from-primary to-purple-600 text-white"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer un SMS
                      </Button>
                    </td>
                  </tr>
                ) : (
                  messages.map((message) => {
                    const status = statusConfig[message.status] || statusConfig.queued;
                    const StatusIcon = status.icon;
                    return (
                      <tr
                        key={message.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4">
                          <Badge variant="outline" className={cn("text-[9px] mt-1", (typeConfig[message.type] || typeConfig.transactional).className)}>
                          <span className="text-sm font-mono text-foreground" style={{ fontFamily: "'EB Garamond', Garamond, serif" }}>{message.phone}</span>
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground" style={{ fontFamily: "'EB Garamond', Garamond, serif" }}>
                            {message.contact_first_name || "—"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground" style={{ fontFamily: "'EB Garamond', Garamond, serif" }}>
                            {message.contact_last_name || "—"}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="text-sm text-foreground truncate" style={{ fontFamily: "'EB Garamond', Garamond, serif" }}>{message.content}</p>
                          {/*<Badge variant="outline" className={cn("text-[9px] mt-1", (typeConfig[message.type] || typeConfig.transactional).className)}>*/}
                          {/*  {(typeConfig[message.type] || typeConfig.transactional).label}*/}
                          {/*</Badge>*/}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={cn("text-[9px] mt-1", (typeConfig[message.type] || typeConfig.transactional).className)}>
                            {(typeConfig[message.type] || typeConfig.transactional).label}
                          </Badge>
                        </td>
                        {/*<td className="p-4">*/}
                        {/*  <span className="text-sm text-muted-foreground">{message.segments_count}</span>*/}
                        {/*</td>*/}
                        <td className="p-4">
                          <span className="text-xs text-muted-foreground">{formatDate(message.created_at)}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs text-muted-foreground">{formatDate(message.sent_at)}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-foreground">
                            {message.cost != null ? `${message.cost.toFixed(2)} FCFA` : "—"}
                          </span>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => { setSelectedMessage(message); setShowDetailModal(true); }}
                            title="Voir détail"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Modals */}
      <SendSmsModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSent={() => { fetchMessages(); fetchBalance(); }}
      />
      <SendBulkSmsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSent={() => { fetchMessages(); fetchBalance(); }}
      />
      <SendToGroupsModal
        isOpen={showGroupsModal}
        onClose={() => setShowGroupsModal(false)}
        onSent={() => { fetchMessages(); fetchBalance(); }}
      />

      {/* Message Detail Modal */}
      {showDetailModal && selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          onClose={() => { setShowDetailModal(false); setSelectedMessage(null); }}
          onStatusUpdated={fetchMessages}
        />
      )}
    </div>
  );
}


// ============================================
// MESSAGE DETAIL MODAL
// ============================================

function MessageDetailModal({
  message,
  onClose,
  onStatusUpdated,
}: {
  message: Message;
  onClose: () => void;
  onStatusUpdated: () => void;
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const status = statusConfig[message.status] || statusConfig.queued;
  const StatusIcon = status.icon;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const result = await api.checkMessageStatus(message.id);
      const statusLabels: Record<string, string> = {
        delivered: "Délivré",
        sent: "Envoyé",
        enroute: "En cours",
        expired: "Expiré",
        deleted: "Supprimé",
        undeliverable: "Non délivrable",
        unknown: "Inconnu",
        pending: "En attente",
        queued: "En file",
        failed: "Échoué",
      };
      const translateStatus = (s: string | null) => s ? (statusLabels[s] || s) : "Inconnu";

      if (result.updated) {
        setCheckResult(`Statut mis à jour: ${translateStatus(result.provider_status)}`);
        onStatusUpdated();
      } else if (result.error) {
        setCheckResult(`Erreur: ${result.error}`);
      } else {
        setCheckResult(`Statut inchangé: ${translateStatus(result.provider_status || message.status)}`);
      }
    } catch (err: any) {
      setCheckResult(`Erreur: ${err.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Détail du message</h3>
            <p className="text-sm text-muted-foreground mt-0.5">ID: {message.id}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Statut */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", status.className)}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Statut: {status.label}</p>
              {message.error_message && (
                <p className="text-xs text-red-500 mt-0.5">{message.error_message}</p>
              )}
            </div>
          </div>

          {/* Infos principales */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Destinataire</span>
              <span className="text-sm font-medium font-mono text-foreground">{message.phone}</span>
            </div>
            {(message.contact_first_name || message.contact_last_name) && (
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Contact</span>
                <span className="text-sm font-medium text-foreground">
                  {[message.contact_first_name, message.contact_last_name].filter(Boolean).join(" ")}
                </span>
              </div>
            )}
            <div className="flex justify-between items-start py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Message</span>
              <span className="text-sm text-foreground text-right max-w-[250px]">{message.content}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Date de création</span>
              <span className="text-sm text-foreground">{formatDate(message.created_at)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Date d'envoi</span>
              <span className="text-sm text-foreground">{formatDate(message.sent_at)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Coût</span>
              <span className="text-sm font-medium text-foreground">
                {message.cost != null ? `${message.cost.toFixed(2)} FCFA` : "—"}
              </span>
            </div>
          </div>

          {/* Erreur détaillée */}
          {message.error_message && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-200">
              <p className="text-xs font-semibold text-red-500 mb-1">Message d'erreur</p>
              <p className="text-sm text-red-600">{message.error_message}</p>
            </div>
          )}

          {/* Résultat de vérification */}
          {checkResult && (
            <div className={cn("p-3 rounded-lg text-sm",
              checkResult.includes("Erreur") ? "bg-red-500/5 border border-red-200 text-red-600" :
              checkResult.includes("mis à jour") ? "bg-emerald-500/5 border border-emerald-200 text-emerald-600" :
              "bg-muted/50 border border-border/50 text-muted-foreground"
            )}>
              {checkResult}
            </div>
          )}

          <div className="flex gap-3">
            {message.status !== "failed" && message.status !== "delivered" && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCheckStatus}
                disabled={isChecking}
              >
                {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Vérifier le statut
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
