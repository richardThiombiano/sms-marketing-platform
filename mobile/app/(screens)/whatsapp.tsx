import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';

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

interface WAMessage {
  id: string;
  phone: string;
  content: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
}

interface WATemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  body_text: string | null;
  last_synced_at: string | null;
}

type TabType = 'dashboard' | 'send' | 'templates' | 'messages';

// ============================================
// STATUS HELPERS
// ============================================

function getStatusConfig(status: string) {
  switch (status) {
    case 'delivered': return { label: 'Délivré', color: '#059669', bg: '#DCFCE7', icon: 'checkmark-done-circle' as const };
    case 'sent': return { label: 'Envoyé', color: '#2563EB', bg: '#DBEAFE', icon: 'paper-plane' as const };
    case 'read': return { label: 'Lu', color: '#7C3AED', bg: '#EDE9FE', icon: 'eye' as const };
    case 'failed': return { label: 'Échoué', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' as const };
    case 'queued': return { label: 'En file', color: '#64748B', bg: '#F1F5F9', icon: 'time' as const };
    default: return { label: status, color: '#64748B', bg: '#F1F5F9', icon: 'help-circle' as const };
  }
}

function getTemplateStatusConfig(status: string) {
  switch (status) {
    case 'APPROVED': return { label: 'Approuvé', color: '#059669', bg: '#DCFCE7' };
    case 'PENDING': return { label: 'En attente', color: '#D97706', bg: '#FEF3C7' };
    case 'REJECTED': return { label: 'Rejeté', color: '#DC2626', bg: '#FEE2E2' };
    case 'DISABLED': return { label: 'Désactivé', color: '#64748B', bg: '#F1F5F9' };
    default: return { label: status, color: '#64748B', bg: '#F1F5F9' };
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function WhatsAppScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotalPages, setMessagesTotalPages] = useState(1);
  const [templatesPage, setTemplatesPage] = useState(1);
  const [templatesTotalPages, setTemplatesTotalPages] = useState(1);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getWhatsAppStats();
      setStats(data);
    } catch {}
  }, []);

  const loadMessages = useCallback(async (page = 1) => {
    try {
      const data = await api.getWhatsAppMessages({ page, page_size: 15 });
      setMessages(data.items || []);
      setMessagesTotalPages(data.total_pages || 1);
    } catch {}
  }, []);

  const loadTemplates = useCallback(async (page = 1) => {
    try {
      const data = await api.getWhatsAppTemplates({ page, page_size: 15 });
      setTemplates(data.items || []);
      setTemplatesTotalPages(data.total_pages || 1);
    } catch {}
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadStats(), loadMessages(), loadTemplates()]);
  }, [loadStats, loadMessages, loadTemplates]);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#25D366" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>WhatsApp</Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Messages via WhatsApp Business</Text>
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#25D36615', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 }}>
        {([
          { key: 'dashboard' as TabType, label: 'Stats', icon: 'bar-chart' as const },
          { key: 'send' as TabType, label: 'Envoyer', icon: 'send' as const },
          { key: 'templates' as TabType, label: 'Templates', icon: 'document-text' as const },
          { key: 'messages' as TabType, label: 'Historique', icon: 'chatbubbles' as const },
        ]).map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              paddingVertical: 10, borderRadius: 10, gap: 4,
              backgroundColor: activeTab === tab.key ? '#FFFFFF' : 'transparent',
              shadowColor: activeTab === tab.key ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: activeTab === tab.key ? 0.08 : 0,
              shadowRadius: 4,
              elevation: activeTab === tab.key ? 2 : 0,
            }}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? '#25D366' : '#94A3B8'} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: activeTab === tab.key ? '#1E293B' : '#94A3B8' }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, marginTop: 16 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25D366" />}
      >
        {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
        {activeTab === 'send' && <SendTab templates={templates} onSent={loadAll} />}
        {activeTab === 'templates' && (
          <TemplatesTab
            templates={templates}
            page={templatesPage}
            totalPages={templatesTotalPages}
            onPageChange={(p) => { setTemplatesPage(p); loadTemplates(p); }}
            onRefresh={() => loadTemplates(templatesPage)}
          />
        )}
        {activeTab === 'messages' && (
          <MessagesTab
            messages={messages}
            page={messagesPage}
            totalPages={messagesTotalPages}
            onPageChange={(p) => { setMessagesPage(p); loadMessages(p); }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// DASHBOARD TAB
// ============================================

function DashboardTab({ stats }: { stats: WhatsAppStats | null }) {
  if (!stats) return null;

  const cards = [
    { label: 'Messages envoyés', value: stats.total_messages, icon: 'send' as const, color: '#2563EB', bg: '#DBEAFE' },
    { label: 'Délivrés', value: stats.delivered, icon: 'checkmark-done-circle' as const, color: '#059669', bg: '#DCFCE7' },
    { label: 'Lus', value: stats.read, icon: 'eye' as const, color: '#7C3AED', bg: '#EDE9FE' },
    { label: 'Échoués', value: stats.failed, icon: 'close-circle' as const, color: '#DC2626', bg: '#FEE2E2' },
    { label: 'Taux livraison', value: `${stats.delivery_rate}%`, icon: 'trending-up' as const, color: '#25D366', bg: '#DCFCE7' },
    { label: 'Taux lecture', value: `${stats.read_rate}%`, icon: 'book' as const, color: '#6366F1', bg: '#E0E7FF' },
    { label: 'Templates approuvés', value: stats.approved_templates, icon: 'document-text' as const, color: '#EC4899', bg: '#FCE7F3' },
  ];

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {cards.map((card) => (
          <View
            key={card.label}
            style={{
              width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: card.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Ionicons name={card.icon} size={18} color={card.color} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1E293B' }}>{card.value}</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{card.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================
// SEND TAB (Envoi unique + Bulk)
// ============================================

function SendTab({ templates, onSent }: { templates: WATemplate[]; onSent: () => void }) {
  const [phone, setPhone] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [language, setLanguage] = useState('fr');
  const [sending, setSending] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Bulk
  const [bulkPhones, setBulkPhones] = useState('');
  const [bulkTemplate, setBulkTemplate] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [showBulkTemplatePicker, setShowBulkTemplatePicker] = useState(false);

  const approvedTemplates = templates.filter((t) => t.status === 'APPROVED');

  const handleSend = async () => {
    if (!phone || !selectedTemplate) {
      Alert.alert('Erreur', 'Veuillez remplir le numéro et sélectionner un template');
      return;
    }
    setSending(true);
    try {
      const result = await api.sendWhatsAppTemplate({
        phone,
        template_name: selectedTemplate,
        language_code: language,
      });
      Alert.alert('Succès', `Message envoyé à ${result.phone} (statut: ${result.status})`);
      setPhone('');
      setSelectedTemplate('');
      onSent();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkPhones || !bulkTemplate) {
      Alert.alert('Erreur', 'Veuillez remplir les numéros et sélectionner un template');
      return;
    }
    setBulkSending(true);
    try {
      const phones = bulkPhones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
      const result = await api.sendWhatsAppBulk({
        phones,
        template_name: bulkTemplate,
        language_code: language,
      });
      Alert.alert('Broadcast envoyé', `Total: ${result.total}\nEnvoyés: ${result.sent}\nÉchoués: ${result.failed}`);
      setBulkPhones('');
      setBulkTemplate('');
      onSent();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Erreur d'envoi en masse");
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Langue selector */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>Langue :</Text>
        {[
          { key: 'fr', label: 'Français' },
          { key: 'en', label: 'English' },
          { key: 'en_US', label: 'English (US)' },
        ].map((lang) => (
          <Pressable
            key={lang.key}
            onPress={() => setLanguage(lang.key)}
            style={{
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
              backgroundColor: language === lang.key ? '#25D366' : '#FFF',
              borderWidth: 1, borderColor: language === lang.key ? '#25D366' : '#E2E8F0',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: language === lang.key ? '#FFF' : '#64748B' }}>{lang.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Envoi unique */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Ionicons name="send" size={18} color="#25D366" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Envoi unique</Text>
        </View>

        {/* Phone input */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Numéro de téléphone</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, marginBottom: 14 }}>
          <Ionicons name="call-outline" size={18} color="#94A3B8" />
          <TextInput
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 15, color: '#1E293B' }}
            placeholder="22670000000"
            placeholderTextColor="#CBD5E1"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Template selector */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Template</Text>
        <Pressable
          onPress={() => setShowTemplatePicker(true)}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 }}
        >
          <Ionicons name="document-text-outline" size={18} color="#94A3B8" />
          <Text style={{ flex: 1, marginLeft: 10, fontSize: 14, color: selectedTemplate ? '#1E293B' : '#CBD5E1' }}>
            {selectedTemplate || 'Sélectionner un template...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#94A3B8" />
        </Pressable>

        {/* Send button */}
        <Pressable
          onPress={handleSend}
          disabled={!phone || !selectedTemplate || sending}
          style={({ pressed }) => ({
            backgroundColor: '#25D366',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed || !phone || !selectedTemplate || sending ? 0.7 : 1,
          })}
        >
          {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={16} color="#FFF" />}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Envoyer via WhatsApp</Text>
        </Pressable>
      </View>

      {/* Envoi en masse */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Ionicons name="people" size={18} color="#25D366" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Envoi en masse (Broadcast)</Text>
        </View>

        {/* Bulk phones */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Numéros (un par ligne ou séparés par des virgules)</Text>
        <TextInput
          style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 14, color: '#1E293B', height: 100, textAlignVertical: 'top', marginBottom: 14 }}
          placeholder={"22670000000\n22671111111\n22672222222"}
          placeholderTextColor="#CBD5E1"
          value={bulkPhones}
          onChangeText={setBulkPhones}
          multiline
          numberOfLines={4}
        />

        {/* Template selector for bulk */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Template</Text>
        <Pressable
          onPress={() => setShowBulkTemplatePicker(true)}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 }}
        >
          <Ionicons name="document-text-outline" size={18} color="#94A3B8" />
          <Text style={{ flex: 1, marginLeft: 10, fontSize: 14, color: bulkTemplate ? '#1E293B' : '#CBD5E1' }}>
            {bulkTemplate || 'Sélectionner un template...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#94A3B8" />
        </Pressable>

        {/* Bulk send button */}
        <Pressable
          onPress={handleBulkSend}
          disabled={!bulkPhones || !bulkTemplate || bulkSending}
          style={({ pressed }) => ({
            backgroundColor: '#25D366',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed || !bulkPhones || !bulkTemplate || bulkSending ? 0.7 : 1,
          })}
        >
          {bulkSending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={16} color="#FFF" />}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Envoyer le broadcast</Text>
        </Pressable>
      </View>

      {/* Template Picker Modal (single) */}
      <TemplatePickerModal
        visible={showTemplatePicker}
        templates={approvedTemplates}
        selected={selectedTemplate}
        onSelect={(name) => { setSelectedTemplate(name); setShowTemplatePicker(false); }}
        onClose={() => setShowTemplatePicker(false)}
      />

      {/* Template Picker Modal (bulk) */}
      <TemplatePickerModal
        visible={showBulkTemplatePicker}
        templates={approvedTemplates}
        selected={bulkTemplate}
        onSelect={(name) => { setBulkTemplate(name); setShowBulkTemplatePicker(false); }}
        onClose={() => setShowBulkTemplatePicker(false)}
      />
    </View>
  );
}

// ============================================
// TEMPLATE PICKER MODAL
// ============================================

function TemplatePickerModal({ visible, templates, selected, onSelect, onClose }: {
  visible: boolean; templates: WATemplate[]; selected: string;
  onSelect: (name: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Choisir un template</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Ionicons name="document-text-outline" size={36} color="#E2E8F0" />
              <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>Aucun template approuvé</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item.name)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, backgroundColor: selected === item.name ? '#F0FDF4' : '#FFF', borderWidth: 1, borderColor: selected === item.name ? '#25D366' : '#E2E8F0' }}
            >
              <Ionicons name="document-text" size={18} color={selected === item.name ? '#25D366' : '#64748B'} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{item.name}</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>{item.language} • {item.category}</Text>
                {item.body_text && <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }} numberOfLines={1}>{item.body_text}</Text>}
              </View>
              {selected === item.name && <Ionicons name="checkmark-circle" size={20} color="#25D366" />}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ============================================
// TEMPLATES TAB (with pagination + delete)
// ============================================

function TemplatesTab({ templates, page, totalPages, onPageChange, onRefresh }: {
  templates: WATemplate[]; page: number; totalPages: number;
  onPageChange: (p: number) => void; onRefresh: () => void;
}) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.syncWhatsAppTemplates();
      Alert.alert('Synchronisation', `${result.synced} templates synchronisés (${result.created} nouveaux)`);
      onRefresh();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (tpl: WATemplate) => {
    Alert.alert('Supprimer', `Supprimer le template "${tpl.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.deleteWhatsAppTemplate(tpl.id);
          onRefresh();
        } catch (err: any) {
          Alert.alert('Erreur', err.message || 'Erreur de suppression');
        }
      }},
    ]);
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Templates</Text>
        <Pressable
          onPress={handleSync}
          disabled={syncing}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
            opacity: pressed || syncing ? 0.6 : 1,
          })}
        >
          {syncing ? <ActivityIndicator size="small" color="#25D366" /> : <Ionicons name="sync" size={16} color="#25D366" />}
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#25D366' }}>Sync Meta</Text>
        </Pressable>
      </View>

      {/* Template list */}
      {templates.length === 0 ? (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
          <Ionicons name="document-text-outline" size={36} color="#E2E8F0" />
          <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>Aucun template WhatsApp</Text>
          <Text style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4 }}>Synchronisez vos templates depuis Meta</Text>
        </View>
      ) : (
        templates.map((tpl) => {
          const statusCfg = getTemplateStatusConfig(tpl.status);
          return (
            <View key={tpl.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{tpl.name}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{tpl.category} • {tpl.language}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ backgroundColor: statusCfg.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: statusCfg.color }}>{statusCfg.label}</Text>
                  </View>
                  <Pressable onPress={() => handleDelete(tpl)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>
              {tpl.body_text && (
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8 }} numberOfLines={3}>{tpl.body_text}</Text>
              )}
              {tpl.last_synced_at && (
                <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 6 }}>
                  Sync: {new Date(tpl.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          );
        })
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </View>
  );
}

// ============================================
// MESSAGES TAB (with pagination)
// ============================================

function MessagesTab({ messages, page, totalPages, onPageChange }: {
  messages: WAMessage[]; page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 }}>Historique</Text>

      {messages.length === 0 ? (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
          <Ionicons name="chatbubbles-outline" size={36} color="#E2E8F0" />
          <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>Aucun message WhatsApp envoyé</Text>
        </View>
      ) : (
        messages.map((msg) => {
          const statusCfg = getStatusConfig(msg.status);
          const contactName = [msg.contact_first_name, msg.contact_last_name].filter(Boolean).join(' ');
          return (
            <View key={msg.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: statusCfg.bg, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name={statusCfg.icon} size={16} color={statusCfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{msg.phone}</Text>
                    <View style={{ backgroundColor: statusCfg.bg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: '600', color: statusCfg.color }}>{statusCfg.label}</Text>
                    </View>
                  </View>
                  {contactName ? <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{contactName}</Text> : null}
                </View>
                {msg.sent_at && (
                  <Text style={{ fontSize: 9, color: '#94A3B8' }}>
                    {new Date(msg.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
              {msg.content && (
                <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 42, marginTop: 4 }} numberOfLines={2}>{msg.content}</Text>
              )}
            </View>
          );
        })
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </View>
  );
}

// ============================================
// PAGINATION CONTROLS
// ============================================

function PaginationControls({ page, totalPages, onPageChange }: {
  page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16, paddingVertical: 8 }}>
      <Pressable
        onPress={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={({ pressed }) => ({
          width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1,
          borderColor: page <= 1 ? '#F1F5F9' : '#E2E8F0',
          alignItems: 'center', justifyContent: 'center',
          opacity: page <= 1 ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="chevron-back" size={18} color={page <= 1 ? '#CBD5E1' : '#1E293B'} />
      </Pressable>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>
        Page {page} / {totalPages}
      </Text>
      <Pressable
        onPress={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        style={({ pressed }) => ({
          width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1,
          borderColor: page >= totalPages ? '#F1F5F9' : '#E2E8F0',
          alignItems: 'center', justifyContent: 'center',
          opacity: page >= totalPages ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="chevron-forward" size={18} color={page >= totalPages ? '#CBD5E1' : '#1E293B'} />
      </Pressable>
    </View>
  );
}
