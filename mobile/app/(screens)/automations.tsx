import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Modal, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';

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

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  birthday: { label: 'Anniversaire', color: '#7C3AED', bg: '#EDE9FE', icon: 'gift-outline' },
  welcome: { label: 'Bienvenue', color: '#2563EB', bg: '#DBEAFE', icon: 'hand-left-outline' },
  inactivity: { label: 'Inactivité', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
  recurring: { label: 'Récurrent', color: '#059669', bg: '#DCFCE7', icon: 'refresh-outline' },
};

const typeOptions = [
  { value: 'birthday', label: 'Anniversaire' },
  { value: 'welcome', label: 'Bienvenue' },
  { value: 'inactivity', label: 'Inactivité' },
  { value: 'recurring', label: 'Récurrent' },
];

// Automation Modal
function AutomationModal({ visible, onClose, onSaved, automation }: {
  visible: boolean; onClose: () => void; onSaved: () => void; automation: Automation | null;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('birthday');
  const [messageContent, setMessageContent] = useState('');
  const [inactivityDays, setInactivityDays] = useState('30');
  const [recurringInterval, setRecurringInterval] = useState('weekly');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      api.getGroups({ page: 1, page_size: 50 }).then((d) => setGroups(d.items)).catch(() => {});
      api.getTemplates({ page: 1, page_size: 50 }).then((d) => setTemplates(d.items)).catch(() => {});
      if (automation) {
        setName(automation.name);
        setType(automation.type);
        setMessageContent(automation.message_content || '');
        setInactivityDays(automation.trigger_config?.inactivity_days?.toString() || '30');
        setRecurringInterval(automation.trigger_config?.interval || 'weekly');
        setTargetGroupId(automation.target_filters?.group_id || '');
        setSelectedTemplateId(automation.template_id || '');
      } else {
        setName(''); setType('birthday'); setMessageContent(''); setInactivityDays('30'); setRecurringInterval('weekly'); setTargetGroupId(''); setSelectedTemplateId('');
      }
      setError('');
    }
  }, [visible, automation]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) setMessageContent(tpl.content);
    }
  };

  const handleSave = async () => {
    if (!name || !messageContent) { setError('Le nom et le message sont obligatoires'); return; }
    setIsSaving(true); setError('');
    try {
      const triggerConfig: Record<string, any> = {};
      if (type === 'inactivity') triggerConfig.inactivity_days = parseInt(inactivityDays);
      if (type === 'recurring') triggerConfig.interval = recurringInterval;

      const payload = {
        name,
        type,
        template_id: selectedTemplateId || undefined,
        message_content: messageContent,
        trigger_config: triggerConfig,
        target_filters: targetGroupId ? { group_id: targetGroupId } : undefined,
      };

      if (automation) {
        await api.updateAutomation(automation.id, payload);
      } else {
        await api.createAutomation(payload);
      }
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>{automation ? 'Modifier' : 'Nouvelle automatisation'}</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 }}><Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text></View> : null}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nom *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Ex: Bienvenue nouveau client" placeholderTextColor="#94A3B8"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }} />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {typeOptions.map((opt) => (
              <Pressable key={opt.value} onPress={() => setType(opt.value)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: type === opt.value ? '#F59E0B' : '#FFFFFF', borderWidth: 1, borderColor: type === opt.value ? '#F59E0B' : '#E2E8F0', marginRight: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: type === opt.value ? '#FFFFFF' : '#64748B' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {type === 'inactivity' && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Jours d'inactivité</Text>
              <TextInput value={inactivityDays} onChangeText={setInactivityDays} keyboardType="number-pad"
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }} />
            </>
          )}

          {type === 'recurring' && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Intervalle</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {['daily', 'weekly', 'monthly'].map((interval) => (
                  <Pressable key={interval} onPress={() => setRecurringInterval(interval)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: recurringInterval === interval ? '#F59E0B' : '#FFFFFF', borderWidth: 1, borderColor: recurringInterval === interval ? '#F59E0B' : '#E2E8F0', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: recurringInterval === interval ? '#FFFFFF' : '#64748B' }}>
                      {interval === 'daily' ? 'Quotidien' : interval === 'weekly' ? 'Hebdo' : 'Mensuel'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Template (optionnel)</Text>
          {templates.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <Pressable onPress={() => handleTemplateSelect('')}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: !selectedTemplateId ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: !selectedTemplateId ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}>
                <Text style={{ fontSize: 12, color: !selectedTemplateId ? '#4F46E5' : '#64748B' }}>Personnalisé</Text>
              </Pressable>
              {templates.map((tpl) => (
                <Pressable key={tpl.id} onPress={() => handleTemplateSelect(tpl.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: selectedTemplateId === tpl.id ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: selectedTemplateId === tpl.id ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}>
                  <Text style={{ fontSize: 12, color: selectedTemplateId === tpl.id ? '#4F46E5' : '#64748B' }}>{tpl.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Message *</Text>
          <TextInput value={messageContent} onChangeText={setMessageContent} placeholder="Message automatique..." placeholderTextColor="#94A3B8" multiline
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16, minHeight: 100, textAlignVertical: 'top' }} />

          {groups.length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Groupe cible</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <Pressable onPress={() => setTargetGroupId('')}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: !targetGroupId ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: !targetGroupId ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}>
                  <Text style={{ fontSize: 12, color: !targetGroupId ? '#4F46E5' : '#64748B' }}>Tous</Text>
                </Pressable>
                {groups.map((g) => (
                  <Pressable key={g.id} onPress={() => setTargetGroupId(g.id)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: targetGroupId === g.id ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: targetGroupId === g.id ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}>
                    <Text style={{ fontSize: 12, color: targetGroupId === g.id ? '#4F46E5' : '#64748B' }}>{g.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1, marginTop: 8 })}>
            <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> :
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{automation ? 'Enregistrer' : 'Créer'}</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function AutomationsScreen() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editAutomation, setEditAutomation] = useState<Automation | null>(null);

  const loadAutomations = useCallback(async () => {
    try {
      const data = await api.getAutomations({ page: 1, page_size: 50 });
      setAutomations(data.items);
      setTotal(data.total);
    } catch {} finally { setIsLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadAutomations(); }, []);

  const onRefresh = () => { setRefreshing(true); loadAutomations(); };

  const handleToggle = async (automation: Automation) => {
    try {
      await api.toggleAutomation(automation.id);
      setAutomations((prev) => prev.map((a) => a.id === automation.id ? { ...a, is_active: !a.is_active } : a));
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleDelete = (automation: Automation) => {
    Alert.alert('Supprimer', `Supprimer "${automation.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.deleteAutomation(automation.id); loadAutomations(); } catch (err: any) { Alert.alert('Erreur', err.message); }
      }},
    ]);
  };

  if (isLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#4F46E5" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={24} color="#1E293B" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Automatisations</Text>
          <Text style={{ fontSize: 12, color: '#64748B' }}>{total} automatisations</Text>
        </View>
        <Pressable onPress={() => { setEditAutomation(null); setShowModal(true); }} style={({ pressed }) => ({ backgroundColor: '#F59E0B', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={automations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Ionicons name="flash-outline" size={48} color="#CBD5E1" /><Text style={{ fontSize: 15, color: '#94A3B8', marginTop: 12 }}>Aucune automatisation</Text></View>}
        renderItem={({ item }) => {
          const cfg = typeConfig[item.type] || { label: item.type, color: '#64748B', bg: '#F1F5F9', icon: 'help-circle-outline' as const };
          return (
            <Pressable onPress={() => { setEditAutomation(item); setShowModal(true); }} style={({ pressed }) => ({ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, opacity: pressed ? 0.95 : 1 })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: cfg.color, fontWeight: '500' }}>{cfg.label}</Text>
                </View>
                <Switch
                  value={item.is_active}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{ true: '#4F46E5', false: '#E2E8F0' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {item.message_content && (
                <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }} numberOfLines={1}>{item.message_content}</Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>{item.total_sent} envoyés</Text>
                <Pressable onPress={() => handleDelete(item)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <AutomationModal visible={showModal} onClose={() => { setShowModal(false); setEditAutomation(null); }} onSaved={loadAutomations} automation={editAutomation} />
    </SafeAreaView>
  );
}
