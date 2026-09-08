"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Send,
  FileText,
  Search,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  BarChart3,
  Users,
  ArrowUpRight,
  BookCheck,
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

interface WhatsAppStats {
  total_messages: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  delivery_rate: number;
  read_rate: number;
  approved_templates: number;
}

interface WhatsAppMessage {
  id: string;
  phone: string;
  content: string;
  channel: string;
  type: string;
  status: string;
  provider_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
}

interface WhatsAppTemplate {
  id: string;
  meta_template_id: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  components: any;
  body_text: string | null;
  header_text: string | null;
  footer_text: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string | null;
}

// ============================================
// CONFIG
// ============================================

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  sent: { label: "Envoy\u00e9", icon: Send, className: "bg-blue-500/10 text-blue-600 border-blue-200" },
  delivered: { label: "D\u00e9livr\u00e9", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  read: { label: "Lu", icon: Eye, className: "bg-purple-500/10 text-purple-600 border-purple-200" },
  failed: { label: "\u00c9chou\u00e9", icon: XCircle, className: "bg-red-500/10 text-red-500 border-red-200" },
  queued: { label: "En file", icon: Clock, className: "bg-gray-500/10 text-gray-600 border-gray-200" },
};

const templateStatusConfig: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Approuv\u00e9", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  PENDING: { label: "En attente", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  REJECTED: { label: "Rejet\u00e9", className: "bg-red-500/10 text-red-500 border-red-200" },
  DISABLED: { label: "D\u00e9sactiv\u00e9", className: "bg-gray-500/10 text-gray-600 border-gray-200" },
};

type TabType = "dashboard" | "send" | "templates" | "messages";

// ============================================
// MAIN COMPONENT
// ============================================

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotalPages, setMessagesTotalPages] = useState(1);
  const [templatesPage, setTemplatesPage] = useState(1);
  const [templatesTotalPages, setTemplatesTotalPages] = useState(1);

  // Envoi
  const [sendPhone, setSendPhone] = useState("");
  const [sendTemplate, setSendTemplate] = useState("");
  const [sendLanguage, setSendLanguage] = useState("fr");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Bulk
  const [bulkPhones, setBulkPhones] = useState("");
  const [bulkTemplate, setBulkTemplate] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ total: number; sent: number; failed: number } | null>(null);

  // Sync
  const [syncing, setSyncing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getWhatsAppStats();
      setStats(data);
    } catch {
      // silencieux
    }
  }, []);

  const loadMessages = useCallback(async (page = 1) => {
    try {
      const data = await api.getWhatsAppMessages({ page, page_size: 15 });
      setMessages(data.items);
      setMessagesTotalPages(data.total_pages);
    } catch {
      // silencieux
    }
  }, []);

  const loadTemplates = useCallback(async (page = 1) => {
    try {
      const data = await api.getWhatsAppTemplates({ page, page_size: 15 });
      setTemplates(data.items);
      setTemplatesTotalPages(data.total_pages);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadMessages(), loadTemplates()]).finally(() => setLoading(false));
  }, [loadStats, loadMessages, loadTemplates]);

  const handleSendTemplate = async () => {
    if (!sendPhone || !sendTemplate) return;
    setSending(true);
    setSendResult(null);
    try {
      const result = await api.sendWhatsAppTemplate({
        phone: sendPhone,
        template_name: sendTemplate,
        language_code: sendLanguage,
      });
      setSendResult({ success: true, message: `Message envoy\u00e9 \u00e0 ${result.phone} (statut: ${result.status})` });
      setSendPhone("");
      loadStats();
      loadMessages();
    } catch (e: any) {
      setSendResult({ success: false, message: e.message || "Erreur d'envoi" });
    } finally {
      setSending(false);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkPhones || !bulkTemplate) return;
    setBulkSending(true);
    setBulkResult(null);
    try {
      const phones = bulkPhones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
      const result = await api.sendWhatsAppBulk({
        phones,
        template_name: bulkTemplate,
        language_code: sendLanguage,
      });
      setBulkResult(result);
      setBulkPhones("");
      loadStats();
      loadMessages();
    } catch (e: any) {
      setBulkResult({ total: 0, sent: 0, failed: 0 });
    } finally {
      setBulkSending(false);
    }
  };

  const handleSyncTemplates = async () => {
    setSyncing(true);
    try {
      await api.syncWhatsAppTemplates();
      await loadTemplates();
    } catch {
      // silencieux
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Supprimer ce template ?")) return;
    try {
      await api.deleteWhatsAppTemplate(id);
      await loadTemplates();
    } catch {
      // silencieux
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-green-500" />
            WhatsApp Business
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envoyez des messages WhatsApp via templates approuv\u00e9s par Meta
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {[
          { key: "dashboard" as TabType, label: "Vue d'ensemble", icon: BarChart3 },
          { key: "send" as TabType, label: "Envoyer", icon: Send },
          { key: "templates" as TabType, label: "Templates", icon: FileText },
          { key: "messages" as TabType, label: "Historique", icon: MessageCircle },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <DashboardTab stats={stats} />}
      {activeTab === "send" && (
        <SendTab
          sendPhone={sendPhone}
          setSendPhone={setSendPhone}
          sendTemplate={sendTemplate}
          setSendTemplate={setSendTemplate}
          sendLanguage={sendLanguage}
          setSendLanguage={setSendLanguage}
          sending={sending}
          sendResult={sendResult}
          onSend={handleSendTemplate}
          bulkPhones={bulkPhones}
          setBulkPhones={setBulkPhones}
          bulkTemplate={bulkTemplate}
          setBulkTemplate={setBulkTemplate}
          bulkSending={bulkSending}
          bulkResult={bulkResult}
          onBulkSend={handleBulkSend}
          templates={templates}
        />
      )}
      {activeTab === "templates" && (
        <TemplatesTab
          templates={templates}
          page={templatesPage}
          totalPages={templatesTotalPages}
          onPageChange={(p) => { setTemplatesPage(p); loadTemplates(p); }}
          onSync={handleSyncTemplates}
          syncing={syncing}
          onDelete={handleDeleteTemplate}
        />
      )}
      {activeTab === "messages" && (
        <MessagesTab
          messages={messages}
          page={messagesPage}
          totalPages={messagesTotalPages}
          onPageChange={(p) => { setMessagesPage(p); loadMessages(p); }}
        />
      )}
    </div>
  );
}

// ============================================
// DASHBOARD TAB
// ============================================

function DashboardTab({ stats }: { stats: WhatsAppStats | null }) {
  if (!stats) return null;

  const statCards = [
    { label: "Messages envoy\u00e9s", value: stats.total_messages, icon: Send, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "D\u00e9livr\u00e9s", value: stats.delivered, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Lus", value: stats.read, icon: Eye, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "\u00c9chou\u00e9s", value: stats.failed, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Taux de livraison", value: `${stats.delivery_rate}%`, icon: ArrowUpRight, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Taux de lecture", value: `${stats.read_rate}%`, icon: BookCheck, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Templates approuv\u00e9s", value: stats.approved_templates, icon: FileText, color: "text-pink-500", bg: "bg-pink-500/10" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", card.bg)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// SEND TAB
// ============================================

function SendTab({
  sendPhone, setSendPhone,
  sendTemplate, setSendTemplate,
  sendLanguage, setSendLanguage,
  sending, sendResult, onSend,
  bulkPhones, setBulkPhones,
  bulkTemplate, setBulkTemplate,
  bulkSending, bulkResult, onBulkSend,
  templates,
}: any) {
  const approvedTemplates = templates.filter((t: WhatsAppTemplate) => t.status === "APPROVED");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Envoi unique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-green-500" />
            Envoi unique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Num\u00e9ro de t\u00e9l\u00e9phone</label>
            <Input
              placeholder="Ex: 22670000000"
              value={sendPhone}
              onChange={(e) => setSendPhone(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Template</label>
            <select
              value={sendTemplate}
              onChange={(e) => setSendTemplate(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">S\u00e9lectionner un template...</option>
              {approvedTemplates.map((t: WhatsAppTemplate) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.language}) - {t.category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Langue</label>
            <select
              value={sendLanguage}
              onChange={(e) => setSendLanguage(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="fr">Fran\u00e7ais</option>
              <option value="en">English</option>
              <option value="en_US">English (US)</option>
            </select>
          </div>
          <Button
            onClick={onSend}
            disabled={!sendPhone || !sendTemplate || sending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer via WhatsApp
          </Button>
          {sendResult && (
            <div className={cn("p-3 rounded-lg text-sm", sendResult.success ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500")}>
              {sendResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Envoi en masse */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            Envoi en masse (Broadcast)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Num\u00e9ros (un par ligne ou s\u00e9par\u00e9s par des virgules)</label>
            <textarea
              placeholder={"22670000000\n22671111111\n22672222222"}
              value={bulkPhones}
              onChange={(e) => setBulkPhones(e.target.value)}
              className="mt-1 w-full h-32 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Template</label>
            <select
              value={bulkTemplate}
              onChange={(e) => setBulkTemplate(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">S\u00e9lectionner un template...</option>
              {approvedTemplates.map((t: WhatsAppTemplate) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.language}) - {t.category}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={onBulkSend}
            disabled={!bulkPhones || !bulkTemplate || bulkSending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {bulkSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer le broadcast
          </Button>
          {bulkResult && (
            <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
              <p>Total : {bulkResult.total} destinataires</p>
              <p className="text-emerald-600">Envoy\u00e9s : {bulkResult.sent}</p>
              {bulkResult.failed > 0 && <p className="text-red-500">\u00c9chou\u00e9s : {bulkResult.failed}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// TEMPLATES TAB
// ============================================

function TemplatesTab({
  templates, page, totalPages, onPageChange, onSync, syncing, onDelete,
}: {
  templates: WhatsAppTemplate[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSync: () => void;
  syncing: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Templates WhatsApp Business approuv\u00e9s par Meta
        </p>
        <Button
          onClick={onSync}
          disabled={syncing}
          variant="outline"
          size="sm"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Synchroniser avec Meta
        </Button>
      </div>

      {/* Liste */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun template WhatsApp</p>
            <p className="text-xs text-muted-foreground mt-1">
              Synchronisez vos templates depuis Meta ou cr\u00e9ez-en de nouveaux
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const statusCfg = templateStatusConfig[template.status] || templateStatusConfig.PENDING;
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground text-sm">{template.name}</h3>
                      <p className="text-xs text-muted-foreground">{template.language} \u2022 {template.category}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", statusCfg.className)}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                  {template.body_text && (
                    <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/50 rounded p-2">
                      {template.body_text}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[10px] text-muted-foreground">
                      {template.last_synced_at
                        ? `Sync: ${new Date(template.last_synced_at).toLocaleDateString("fr-FR")}`
                        : "Non synchronis\u00e9"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                      onClick={() => onDelete(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MESSAGES TAB
// ============================================

function MessagesTab({
  messages, page, totalPages, onPageChange,
}: {
  messages: WhatsAppMessage[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun message WhatsApp envoy\u00e9</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Destinataire</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contenu</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => {
                    const cfg = statusConfig[msg.status] || statusConfig.queued;
                    const StatusIcon = cfg.icon;
                    const contactName = [msg.contact_first_name, msg.contact_last_name].filter(Boolean).join(" ");
                    return (
                      <tr key={msg.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{msg.phone}</p>
                            {contactName && <p className="text-xs text-muted-foreground">{contactName}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{msg.content}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-[10px] gap-1", cfg.className)}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {msg.sent_at
                            ? new Date(msg.sent_at).toLocaleDateString("fr-FR", {
                                day: "2-digit", month: "2-digit", year: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
