import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Modal, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';

interface Message {
  id: string;
  phone: string;
  content: string;
  type: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  segments_count: number;
  created_at: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
}

const statusFilters = ['Tous', 'Délivrés', 'Envoyés', 'En file', 'Échoués'];
const statusMap: Record<number, string | undefined> = { 0: undefined, 1: 'delivered', 2: 'sent', 3: 'queued', 4: 'failed' };

function getStatusConfig(status: string) {
  switch (status) {
    case 'delivered': return { label: 'Délivré', color: '#059669', bg: '#DCFCE7', icon: 'checkmark-done-circle' as const };
    case 'sent': return { label: 'Envoyé', color: '#2563EB', bg: '#DBEAFE', icon: 'paper-plane' as const };
    case 'queued': return { label: 'En file', color: '#64748B', bg: '#F1F5F9', icon: 'time' as const };
    case 'failed': return { label: 'Échoué', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' as const };
    case 'rejected': return { label: 'Rejeté', color: '#D97706', bg: '#FEF3C7', icon: 'alert-circle' as const };
    default: return { label: status, color: '#64748B', bg: '#F1F5F9', icon: 'help-circle' as const };
  }
}

// Message Detail Modal
function MessageDetailModal({ visible, message, onClose, onStatusUpdated }: {
  visible: boolean;
  message: Message | null;
  onClose: () => void;
  onStatusUpdated: () => void;
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  if (!message) return null;

  const statusCfg = getStatusConfig(message.status);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const result = await api.checkMessageStatus(message.id);
      const statusLabels: Record<string, string> = {
        delivered: 'Délivré',
        sent: 'Envoyé',
        enroute: 'En cours',
        expired: 'Expiré',
        deleted: 'Supprimé',
        undeliverable: 'Non délivrable',
        unknown: 'Inconnu',
        pending: 'En attente',
        queued: 'En file',
        failed: 'Échoué',
      };
      const translateStatus = (s: string | null) => s ? (statusLabels[s] || s) : 'Inconnu';

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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Détail du message</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontFamily: 'monospace' }} numberOfLines={1}>ID: {message.id}</Text>
          </View>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Status Card */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: statusCfg.bg, borderRadius: 16, padding: 16, marginBottom: 20, gap: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={statusCfg.icon} size={24} color={statusCfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: statusCfg.color }}>Statut: {statusCfg.label}</Text>
              {message.error_message && (
                <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{message.error_message}</Text>
              )}
            </View>
          </View>

          {/* Info Rows */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 20 }}>
            {/* Destinataire */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Destinataire</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', fontFamily: 'monospace' }}>{message.phone}</Text>
            </View>

            {/* Nom du contact */}
            {(message.contact_first_name || message.contact_last_name) && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>Contact</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#1E293B' }}>
                  {[message.contact_first_name, message.contact_last_name].filter(Boolean).join(' ')}
                </Text>
              </View>
            )}

            {/* Type */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Type</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#1E293B' }}>{({ transactional: 'Transactionnel', marketing: 'Marketing', promotional: 'Promotionnel', birthday: 'Anniversaire', reminder: 'Rappel' } as Record<string, string>)[message.type] || message.type}</Text>
            </View>

            {/* Segments */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Segments</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#1E293B' }}>{message.segments_count}</Text>
            </View>

            {/* Date de création */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Créé le</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#1E293B' }}>{formatDate(message.created_at)}</Text>
            </View>

            {/* Date d'envoi */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Envoyé le</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#1E293B' }}>{formatDate(message.sent_at)}</Text>
            </View>

            {/* Date de livraison */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Délivré le</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#1E293B' }}>{formatDate(message.delivered_at)}</Text>
            </View>
          </View>

          {/* Message Content */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8 }}>CONTENU DU MESSAGE</Text>
            <Text style={{ fontSize: 14, color: '#1E293B', lineHeight: 22 }}>{message.content}</Text>
          </View>

          {/* Error Details */}
          {message.error_message && (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', padding: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626', marginBottom: 6 }}>MESSAGE D'ERREUR</Text>
              <Text style={{ fontSize: 13, color: '#B91C1C', lineHeight: 20 }}>{message.error_message}</Text>
            </View>
          )}

          {/* Check Result */}
          {checkResult && (
            <View style={{
              backgroundColor: checkResult.includes('mis à jour') ? '#F0FDF4' : checkResult.includes('Erreur') ? '#FEF2F2' : '#F8FAFC',
              borderRadius: 12, borderWidth: 1,
              borderColor: checkResult.includes('mis à jour') ? '#BBF7D0' : checkResult.includes('Erreur') ? '#FECACA' : '#E2E8F0',
              padding: 14, marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 13,
                color: checkResult.includes('mis à jour') ? '#16A34A' : checkResult.includes('Erreur') ? '#DC2626' : '#64748B',
              }}>{checkResult}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 30 }}>
            {message.status !== 'failed' && message.status !== 'delivered' && (
              <Pressable onPress={handleCheckStatus} disabled={isChecking} style={({ pressed }) => ({ flex: 1, opacity: pressed || isChecking ? 0.7 : 1 })}>
                <View style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
                  {isChecking ? (
                    <ActivityIndicator color="#4F46E5" size="small" />
                  ) : (
                    <Ionicons name="refresh-outline" size={18} color="#4F46E5" />
                  )}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#4F46E5' }}>Vérifier le statut</Text>
                </View>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}>
              <View style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Fermer</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Send SMS Modal
function SendSmsModal({ visible, onClose, onSent }: { visible: boolean; onClose: () => void; onSent: () => void }) {
  const [sendMode, setSendMode] = useState<'single' | 'bulk' | 'group'>('single');
  const [phone, setPhone] = useState('');
  const [phones, setPhones] = useState('');
  const [content, setContent] = useState('');
  const [smsType, setSmsType] = useState('transactional');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Contact picker states
  const [inputMode, setInputMode] = useState<'contact' | 'manual'>('contact');
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<{ id: string; phone: string; first_name: string | null; last_name: string | null }[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<{ id: string; phone: string; first_name: string | null; last_name: string | null }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estimation du coût
  const [costEstimate, setCostEstimate] = useState<{ segments: number; unit_price: number | null; total_cost: number | null } | null>(null);

  useEffect(() => {
    if (!content || content.length < 1) {
      setCostEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await api.estimateSmsCost('+22670000000', content);
        setCostEstimate({ segments: result.segments, unit_price: result.unit_price, total_cost: result.total_cost });
      } catch {
        setCostEstimate(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    if (visible) {
      // Reset du formulaire à l'ouverture
      setSendMode('single');
      setPhone('');
      setPhones('');
      setContent('');
      setSmsType('transactional');
      setSelectedGroupIds([]);
      setSelectedTemplateId('');
      setError('');
      setSuccess('');
      setInputMode('contact');
      setContactSearch('');
      setContactResults([]);
      setSelectedContacts([]);
      // Charger les données nécessaires
      api.getGroups({ page: 1, page_size: 50 }).then((d) => setGroups(d.items)).catch(() => {});
      api.getTemplates({ page: 1, page_size: 50 }).then((d) => setTemplates(d.items)).catch(() => {});
    }
  }, [visible]);

  const handleContactSearch = (text: string) => {
    setContactSearch(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.trim().length < 2) {
      setContactResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.getContacts({ page: 1, page_size: 10, search: text.trim() });
        setContactResults(data.items.map((c) => ({ id: c.id, phone: c.phone, first_name: c.first_name, last_name: c.last_name })));
      } catch {
        setContactResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const addContact = (contact: { id: string; phone: string; first_name: string | null; last_name: string | null }) => {
    if (selectedContacts.some((c) => c.id === contact.id)) return;
    if (sendMode === 'single') {
      setSelectedContacts([contact]);
    } else {
      setSelectedContacts((prev) => [...prev, contact]);
    }
    setContactSearch('');
    setContactResults([]);
  };

  const removeContact = (contactId: string) => {
    setSelectedContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  const getContactLabel = (c: { phone: string; first_name: string | null; last_name: string | null }) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
    return name ? `${name} (${c.phone})` : c.phone;
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const tpl = templates.find((t: any) => t.id === templateId);
      if (tpl) setContent(tpl.content);
    }
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  };

  const phoneCount = phones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean).length;

  const handleSend = async () => {
    if (!content) {
      setError('Le message est obligatoire');
      return;
    }
    if (!smsType) {
      setError('Veuillez sélectionner un type de message');
      return;
    }
    if (sendMode === 'single') {
      const resolvedPhone = inputMode === 'contact' ? selectedContacts[0]?.phone : phone;
      if (!resolvedPhone) {
        setError(inputMode === 'contact' ? 'Sélectionnez un contact' : 'Le numéro est obligatoire');
        return;
      }
    }
    if (sendMode === 'bulk') {
      if (inputMode === 'contact' && selectedContacts.length === 0) {
        setError('Sélectionnez au moins un contact');
        return;
      }
      if (inputMode === 'manual' && phoneCount === 0) {
        setError('Ajoutez au moins un numéro');
        return;
      }
    }
    if (sendMode === 'group' && selectedGroupIds.length === 0) {
      setError('Sélectionnez au moins un groupe');
      return;
    }
    setIsSending(true);
    setError('');
    setSuccess('');
    try {
      if (sendMode === 'single') {
        const resolvedPhone = inputMode === 'contact' ? selectedContacts[0]?.phone : phone;
        await api.sendSms({ phone: resolvedPhone!, content, type: smsType });
        setSuccess('SMS envoyé avec succès');
      } else if (sendMode === 'bulk') {
        const phoneList = inputMode === 'contact'
          ? selectedContacts.map((c) => c.phone)
          : phones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
        const result = await api.sendBulkSms({ phones: phoneList, content, type: smsType });
        setSuccess(`${result.total_queued} SMS en file d'attente`);
      } else {
        const result = await api.sendToGroups({ group_ids: selectedGroupIds, content, type: smsType });
        setSuccess(`${result.total_queued} SMS en file d'attente`);
      }
      setPhone('');
      setPhones('');
      setContent('');
      setSelectedGroupIds([]);
      setSelectedTemplateId('');
      setSelectedContacts([]);
      onSent();
      setTimeout(() => { onClose(); setSuccess(''); }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Envoyer un SMS</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={{ fontSize: 13, color: '#DC2626', marginLeft: 8 }}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={{ backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={{ fontSize: 13, color: '#059669', marginLeft: 8 }}>{success}</Text>
            </View>
          ) : null}

          {/* Send Mode Toggle */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Mode d'envoi</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
            <Pressable onPress={() => setSendMode('single')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: sendMode === 'single' ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: sendMode === 'single' ? '#4F46E5' : '#E2E8F0', alignItems: 'center' }}>
              <Ionicons name="person" size={14} color={sendMode === 'single' ? '#FFFFFF' : '#64748B'} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: sendMode === 'single' ? '#FFFFFF' : '#64748B', marginTop: 2 }}>Individuel</Text>
            </Pressable>
            <Pressable onPress={() => setSendMode('bulk')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: sendMode === 'bulk' ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: sendMode === 'bulk' ? '#4F46E5' : '#E2E8F0', alignItems: 'center' }}>
              <Ionicons name="list" size={14} color={sendMode === 'bulk' ? '#FFFFFF' : '#64748B'} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: sendMode === 'bulk' ? '#FFFFFF' : '#64748B', marginTop: 2 }}>En masse</Text>
            </Pressable>
            <Pressable onPress={() => setSendMode('group')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: sendMode === 'group' ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: sendMode === 'group' ? '#4F46E5' : '#E2E8F0', alignItems: 'center' }}>
              <Ionicons name="people" size={14} color={sendMode === 'group' ? '#FFFFFF' : '#64748B'} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: sendMode === 'group' ? '#FFFFFF' : '#64748B', marginTop: 2 }}>Par groupe</Text>
            </Pressable>
          </View>

          {/* Single: Phone Input */}
          {sendMode === 'single' && (
            <>
              {/* Input mode toggle */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                <Pressable onPress={() => { setInputMode('contact'); setPhone(''); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: inputMode === 'contact' ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: inputMode === 'contact' ? '#4F46E5' : '#E2E8F0', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <Ionicons name="people-outline" size={13} color={inputMode === 'contact' ? '#4F46E5' : '#64748B'} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: inputMode === 'contact' ? '#4F46E5' : '#64748B' }}>Contacts</Text>
                </Pressable>
                <Pressable onPress={() => { setInputMode('manual'); setSelectedContacts([]); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: inputMode === 'manual' ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: inputMode === 'manual' ? '#4F46E5' : '#E2E8F0', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <Ionicons name="keypad-outline" size={13} color={inputMode === 'manual' ? '#4F46E5' : '#64748B'} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: inputMode === 'manual' ? '#4F46E5' : '#64748B' }}>Manuel</Text>
                </Pressable>
              </View>

              {inputMode === 'contact' ? (
                <>
                  {/* Selected contact chip */}
                  {selectedContacts.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {selectedContacts.map((c) => (
                        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4F46E5' }}>{getContactLabel(c)}</Text>
                          <Pressable onPress={() => removeContact(c.id)}>
                            <Ionicons name="close-circle" size={16} color="#4F46E5" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Search field */}
                  {selectedContacts.length === 0 && (
                    <>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Rechercher un contact</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, marginBottom: 4 }}>
                        <Ionicons name="search-outline" size={18} color="#94A3B8" />
                        <TextInput
                          value={contactSearch}
                          onChangeText={handleContactSearch}
                          placeholder="Nom, téléphone ou email..."
                          placeholderTextColor="#94A3B8"
                          style={{ flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 14, color: '#1E293B' }}
                        />
                        {isSearching && <ActivityIndicator size="small" color="#4F46E5" />}
                      </View>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 8 }}>Min. 2 caractères</Text>
                      {/* Results */}
                      {contactResults.length > 0 && (
                        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, overflow: 'hidden' }}>
                          {contactResults.map((c, idx) => (
                            <Pressable key={c.id} onPress={() => addContact(c)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: idx < contactResults.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9', backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF' })}>
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F46E5' }}>{(c.first_name?.[0] || c.phone[0] || '?').toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Contact'}</Text>
                                <Text style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{c.phone}</Text>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Numéro de téléphone</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+226XXXXXXXX"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }}
                  />
                </>
              )}
            </>
          )}

          {/* Bulk: Multiple phones */}
          {sendMode === 'bulk' && (
            <>
              {/* Input mode toggle */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                <Pressable onPress={() => { setInputMode('contact'); setPhones(''); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: inputMode === 'contact' ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: inputMode === 'contact' ? '#4F46E5' : '#E2E8F0', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <Ionicons name="people-outline" size={13} color={inputMode === 'contact' ? '#4F46E5' : '#64748B'} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: inputMode === 'contact' ? '#4F46E5' : '#64748B' }}>Contacts</Text>
                </Pressable>
                <Pressable onPress={() => { setInputMode('manual'); setSelectedContacts([]); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: inputMode === 'manual' ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: inputMode === 'manual' ? '#4F46E5' : '#E2E8F0', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <Ionicons name="keypad-outline" size={13} color={inputMode === 'manual' ? '#4F46E5' : '#64748B'} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: inputMode === 'manual' ? '#4F46E5' : '#64748B' }}>Manuel</Text>
                </Pressable>
              </View>

              {inputMode === 'contact' ? (
                <>
                  {/* Selected contacts chips */}
                  {selectedContacts.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {selectedContacts.map((c) => (
                        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 4, borderWidth: 1, borderColor: '#C7D2FE' }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#4F46E5' }}>{getContactLabel(c)}</Text>
                          <Pressable onPress={() => removeContact(c.id)}>
                            <Ionicons name="close-circle" size={14} color="#4F46E5" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Search field */}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Rechercher des contacts ({selectedContacts.length})</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, marginBottom: 4 }}>
                    <Ionicons name="search-outline" size={18} color="#94A3B8" />
                    <TextInput
                      value={contactSearch}
                      onChangeText={handleContactSearch}
                      placeholder="Nom, téléphone ou email..."
                      placeholderTextColor="#94A3B8"
                      style={{ flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 14, color: '#1E293B' }}
                    />
                    {isSearching && <ActivityIndicator size="small" color="#4F46E5" />}
                  </View>
                  <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 8 }}>Min. 2 caractères</Text>
                  {/* Results */}
                  {contactResults.length > 0 && (
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, overflow: 'hidden' }}>
                      {contactResults.map((c, idx) => {
                        const alreadySelected = selectedContacts.some((sc) => sc.id === c.id);
                        return (
                          <Pressable key={c.id} onPress={() => !alreadySelected && addContact(c)} disabled={alreadySelected} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: idx < contactResults.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9', backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF', opacity: alreadySelected ? 0.5 : 1 })}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: alreadySelected ? '#DCFCE7' : '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                              {alreadySelected ? (
                                <Ionicons name="checkmark" size={14} color="#059669" />
                              ) : (
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F46E5' }}>{(c.first_name?.[0] || c.phone[0] || '?').toUpperCase()}</Text>
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Contact'}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{c.phone}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>Numéros ({phoneCount})</Text>
                  </View>
                  <TextInput
                    value={phones}
                    onChangeText={setPhones}
                    placeholder={"Un numéro par ligne ou séparés par des virgules\n+226XXXXXXXX\n+226XXXXXXXX"}
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 14, color: '#1E293B', marginBottom: 16, minHeight: 100, textAlignVertical: 'top', fontFamily: 'monospace' }}
                  />
                </>
              )}
            </>
          )}

          {/* Group: Group Selection */}
          {sendMode === 'group' && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Groupes destinataires</Text>
              {groups.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {groups.map((g) => {
                    const isSelected = selectedGroupIds.includes(g.id);
                    return (
                      <Pressable key={g.id} onPress={() => toggleGroup(g.id)}
                        style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: isSelected ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: isSelected ? '#4F46E5' : '#E2E8F0' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isSelected ? '#FFFFFF' : '#1E293B' }}>{g.name}</Text>
                        <Text style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>{g.contact_count} contacts</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, color: '#92400E' }}>Aucun groupe disponible</Text>
                </View>
              )}
            </>
          )}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[{ value: 'transactional', label: 'Transaction.' }, { value: 'marketing', label: 'Marketing' }, { value: 'promotional', label: 'Promo' }, { value: 'birthday', label: 'Anniversaire' }, { value: 'reminder', label: 'Rappel' }].map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSmsType(opt.value)}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: smsType === opt.value ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: smsType === opt.value ? '#4F46E5' : '#E2E8F0' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: smsType === opt.value ? '#FFFFFF' : '#64748B' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Template (optionnel)</Text>
          {templates.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <Pressable
                onPress={() => handleTemplateSelect('')}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: !selectedTemplateId ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: !selectedTemplateId ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: !selectedTemplateId ? '#4F46E5' : '#64748B' }}>Aucun</Text>
              </Pressable>
              {templates.map((tpl: any) => (
                <Pressable
                  key={tpl.id}
                  onPress={() => handleTemplateSelect(tpl.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: selectedTemplateId === tpl.id ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: selectedTemplateId === tpl.id ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: selectedTemplateId === tpl.id ? '#4F46E5' : '#64748B' }}>{tpl.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: '#94A3B8' }}>Aucun template disponible</Text>
            </View>
          )}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Message</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Votre message SMS..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 8, minHeight: 120, textAlignVertical: 'top' }}
          />
          <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: costEstimate ? 8 : 24 }}>{content.length}/160 • {Math.ceil(content.length / 160) || 1} segment(s)</Text>

          {costEstimate && costEstimate.unit_price != null && (
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0', padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#16A34A' }}>
                {sendMode === 'single'
                  ? `Coût : ${costEstimate.total_cost?.toFixed(2)} FCFA`
                  : sendMode === 'bulk'
                    ? `Coût estimé : ${((costEstimate.total_cost || 0) * (inputMode === 'contact' ? selectedContacts.length : phones.split(/[\n,;]+/).filter(Boolean).length)).toLocaleString()} FCFA`
                    : `Coût estimé : ${((costEstimate.total_cost || 0) * groups.filter((g) => selectedGroupIds.includes(g.id)).reduce((s: number, g: any) => s + (g.contact_count || 0), 0)).toLocaleString()} FCFA`
                }
              </Text>
              <Text style={{ fontSize: 10, color: '#4ADE80', marginTop: 2 }}>
                {costEstimate.segments} segment(s) × {costEstimate.unit_price} FCFA/SMS
                {sendMode !== 'single' && (
                  sendMode === 'bulk'
                    ? ` × ${inputMode === 'contact' ? selectedContacts.length : phones.split(/[\n,;]+/).filter(Boolean).length} destinataire(s)`
                    : ` × ${groups.filter((g) => selectedGroupIds.includes(g.id)).reduce((s: number, g: any) => s + (g.contact_count || 0), 0)} contact(s)`
                )}
              </Text>
            </View>
          )}

          <Pressable onPress={handleSend} disabled={isSending} style={({ pressed }) => ({ opacity: pressed || isSending ? 0.8 : 1 })}>
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Envoyer</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function MessagesScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const filterStatus = statusMap[activeFilter];
      const data = await api.getMessages({
        page: 1,
        page_size: 50,
        status: filterStatus,
        phone: search || undefined,
      });
      setMessages(data.items);
      setTotal(data.total);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, search]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMessages();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1E293B' }}>Messages</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{total} messages</Text>
          </View>
          <Pressable onPress={() => setShowSend(true)} style={({ pressed }) => ({ backgroundColor: '#4F46E5', width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 12 }}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par numéro..."
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B' }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {statusFilters.map((filter, index) => (
            <Pressable key={filter} onPress={() => setActiveFilter(index)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: activeFilter === index ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: activeFilter === index ? '#4F46E5' : '#E2E8F0' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: activeFilter === index ? '#FFFFFF' : '#64748B' }}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
            <Text style={{ fontSize: 15, color: '#94A3B8', marginTop: 12 }}>Aucun message</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusConfig = getStatusConfig(item.status);
          return (
            <Pressable onPress={() => setSelectedMessage(item)} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="call-outline" size={14} color="#64748B" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{item.phone}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: statusConfig.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 }}>
                  <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: statusConfig.color }}>{statusConfig.label}</Text>
                </View>
              </View>
              {(item.contact_first_name || item.contact_last_name) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6, paddingLeft: 22 }}>
                  <Ionicons name="person-outline" size={12} color="#94A3B8" />
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                    {[item.contact_first_name, item.contact_last_name].filter(Boolean).join(' ')}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 13, color: '#475569', marginBottom: 8 }} numberOfLines={2}>{item.content}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                  {({ transactional: 'Transactionnel', marketing: 'Marketing', promotional: 'Promotionnel', birthday: 'Anniversaire', reminder: 'Rappel' } as Record<string, string>)[item.type] || item.type} • {item.segments_count} seg.
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
              {item.error_message && (
                <View style={{ marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8 }}>
                  <Text style={{ fontSize: 11, color: '#DC2626' }}>{item.error_message}</Text>
                </View>
              )}
              </View>
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Pressable onPress={() => setShowSend(true)} style={({ pressed }) => ({ position: 'absolute', bottom: 100, right: 20, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] })}>
        <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 }}>
          <Ionicons name="send" size={22} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>

      <SendSmsModal visible={showSend} onClose={() => setShowSend(false)} onSent={loadMessages} />

      <MessageDetailModal
        visible={!!selectedMessage}
        message={selectedMessage}
        onClose={() => setSelectedMessage(null)}
        onStatusUpdated={loadMessages}
      />
    </SafeAreaView>
  );
}
