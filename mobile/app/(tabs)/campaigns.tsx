import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, FlatList, Modal, TextInput,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';

// Types
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
  created_at: string;
}

const tabs = ['Toutes', 'Envoyées', 'En cours', 'Programmées', 'Annulées', 'Brouillons'];
const statusMap: Record<number, string | undefined> = { 0: undefined, 1: 'sent', 2: 'sending', 3: 'scheduled', 4: 'cancelled', 5: 'draft' };

const typeOptions = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'birthday', label: 'Anniversaire' },
  { value: 'reminder', label: 'Rappel' },
  { value: 'transactional', label: 'Transactionnel' },
];

// ============================================
// DATE TIME PICKER MOBILE
// ============================================

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const TIME_SLOTS_MOBILE = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
];

function DateTimePickerMobile({
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
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
  };

  const handleDayPress = (day: number) => {
    const month = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onDateChange(`${viewYear}-${month}-${dayStr}`);
  };

  const isToday = (day: number) => day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const month = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return selectedDate === `${viewYear}-${month}-${dayStr}`;
  };
  const isPast = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Build calendar grid
  const emptyCells = Array.from({ length: firstDay });
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <View style={{ gap: 16 }}>
      {/* Calendar */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 }}>
        {/* Month nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Pressable onPress={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
            <Ionicons name="chevron-back" size={18} color="#64748B" />
          </Pressable>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
            {MONTH_NAMES_FR[viewMonth]} {viewYear}
          </Text>
          <Pressable onPress={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* Day names */}
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {DAY_NAMES_FR.map((d) => (
            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#94A3B8' }}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Days grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {emptyCells.map((_, i) => (
            <View key={`e-${i}`} style={{ width: '14.28%', height: 36 }} />
          ))}
          {dayCells.map((day) => {
            const past = isPast(day);
            const selected = isSelected(day);
            const todayDay = isToday(day);
            return (
              <View key={day} style={{ width: '14.28%', alignItems: 'center', marginBottom: 4 }}>
                <Pressable
                  disabled={past}
                  onPress={() => handleDayPress(day)}
                  style={{
                    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: selected ? '#4F46E5' : todayDay ? '#F1F5F9' : 'transparent',
                    borderWidth: todayDay && !selected ? 1.5 : 0,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: selected || todayDay ? '700' : '500',
                    color: past ? '#CBD5E1' : selected ? '#FFFFFF' : '#1E293B',
                  }}>
                    {day}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {/* Time picker */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 10 }}>Heure d'envoi</Text>
        <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TIME_SLOTS_MOBILE.map((time) => {
              const now = new Date();
              const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              const isSelectedToday = selectedDate === todayStr;
              const [h, m] = time.split(':').map(Number);
              const isPastTime = isSelectedToday && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));

              return (
                <Pressable
                  key={time}
                  disabled={isPastTime}
                  onPress={() => onTimeChange(time)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: isPastTime ? '#F8FAFC' : selectedTime === time ? '#4F46E5' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: isPastTime ? '#F1F5F9' : selectedTime === time ? '#4F46E5' : '#E2E8F0',
                    opacity: isPastTime ? 0.4 : 1,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isPastTime ? '#CBD5E1' : selectedTime === time ? '#FFFFFF' : '#64748B' }}>
                    {time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Summary */}
      {selectedDate ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#C7D2FE' }}>
          <Ionicons name="time-outline" size={16} color="#4F46E5" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4F46E5', flex: 1 }}>
            Envoi prévu : {formatSelectedDate()} à {selectedTime}
          </Text>
          <Pressable onPress={() => { onDateChange(''); onTimeChange('09:00'); }}>
            <Ionicons name="close-circle" size={18} color="#4F46E5" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'sent': return { label: 'Envoyée', bg: '#DCFCE7', color: '#166534', icon: 'checkmark-circle' as const };
    case 'sending': return { label: 'En cours', bg: '#FEF3C7', color: '#92400E', icon: 'time' as const };
    case 'scheduled': return { label: 'Programmée', bg: '#E0E7FF', color: '#3730A3', icon: 'calendar' as const };
    case 'draft': return { label: 'Brouillon', bg: '#F1F5F9', color: '#475569', icon: 'document' as const };
    case 'cancelled': return { label: 'Annulée', bg: '#FEE2E2', color: '#991B1B', icon: 'close-circle' as const };
    default: return { label: status, bg: '#F1F5F9', color: '#475569', icon: 'document' as const };
  }
}

// Create Campaign Modal
function CreateCampaignModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('marketing');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      // Reset le formulaire à chaque ouverture
      setName('');
      setContent('');
      setType('marketing');
      setTargetGroupId('');
      setSelectedTemplateId('');
      setScheduledAt('');
      setError('');
      setIsSaving(false);
      api.getGroups({ page: 1, page_size: 50 }).then((d) => setGroups(d.items)).catch(() => {});
      api.getTemplates({ page: 1, page_size: 50 }).then((d) => setTemplates(d.items)).catch(() => {});
    }
  }, [visible]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) setContent(tpl.content);
    }
  };

  const handleSave = async (sendNow: boolean) => {
    if (!name || !content) {
      setError('Le nom et le contenu sont obligatoires');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const hasSchedule = !!scheduledAt.trim();
      const campaign = await api.createCampaign({
        name,
        content,
        type,
        target_group_id: targetGroupId || undefined,
        scheduled_at: hasSchedule ? scheduledAt.trim().replace(' ', 'T') + ':00' : undefined,
      });
      if (sendNow && campaign.id) {
        if (hasSchedule) {
          // Une date/heure a été sélectionnée → programmer l'envoi
          await api.scheduleCampaign(campaign.id, scheduledAt.trim().replace(' ', 'T') + ':00');
        } else {
          // Pas de date → envoi immédiat
          await api.sendCampaign(campaign.id);
        }
      }
      onCreated();
      onClose();
      setName(''); setContent(''); setType('marketing'); setTargetGroupId(''); setSelectedTemplateId(''); setScheduledAt('');
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Nouvelle campagne</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text>
            </View>
          ) : null}

          {/* Name */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nom de la campagne *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Promo été 2024"
            placeholderTextColor="#94A3B8"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }}
          />

          {/* Type */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {typeOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: type === opt.value ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: type === opt.value ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: type === opt.value ? '#FFFFFF' : '#64748B' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Target Group - Always visible */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Destinataires</Text>
          {groups.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  onPress={() => setTargetGroupId('')}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: !targetGroupId ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: !targetGroupId ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: !targetGroupId ? '#FFFFFF' : '#1E293B' }}>Tous les abonnés</Text>
                </Pressable>
                {groups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setTargetGroupId(g.id)}
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: targetGroupId === g.id ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: targetGroupId === g.id ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: targetGroupId === g.id ? '#FFFFFF' : '#1E293B' }}>{g.name}</Text>
                    <Text style={{ fontSize: 10, color: targetGroupId === g.id ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: 2 }}>{g.contact_count} contacts</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>
                {targetGroupId ? 'Envoi aux contacts de ce groupe uniquement' : 'Envoi à tous vos contacts abonnés'}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
              <Text style={{ fontSize: 12, color: '#92400E', flex: 1 }}>Aucun groupe disponible. Créez d'abord un groupe dans la section Groupes.</Text>
            </View>
          )}

          {/* Template */}
          {templates.length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Template (optionnel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <Pressable
                  onPress={() => handleTemplateSelect('')}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: !selectedTemplateId ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: !selectedTemplateId ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
                >
                  <Text style={{ fontSize: 12, color: !selectedTemplateId ? '#4F46E5' : '#64748B' }}>Aucun</Text>
                </Pressable>
                {templates.map((tpl) => (
                  <Pressable
                    key={tpl.id}
                    onPress={() => handleTemplateSelect(tpl.id)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: selectedTemplateId === tpl.id ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: selectedTemplateId === tpl.id ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
                  >
                    <Text style={{ fontSize: 12, color: selectedTemplateId === tpl.id ? '#4F46E5' : '#64748B' }}>{tpl.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {/* Content */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Message *</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Votre message SMS..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 8, minHeight: 100, textAlignVertical: 'top' }}
          />
          <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 16 }}>{content.length}/160 caractères • {Math.ceil(content.length / 160) || 1} segment(s)</Text>

          {/* Scheduling */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Programmer l'envoi (optionnel)</Text>
          <DateTimePickerMobile
            selectedDate={scheduledAt.split(' ')[0] || ''}
            selectedTime={scheduledAt.split(' ')[0] ? (scheduledAt.split(' ')[1] || '09:00') : ''}
            onDateChange={(date) => {
              const timePart = scheduledAt.split(' ')[1] || '09:00';
              setScheduledAt(date ? `${date} ${timePart}` : '');
            }}
            onTimeChange={(time) => {
              const datePart = scheduledAt.split(' ')[0] || '';
              if (datePart) setScheduledAt(`${datePart} ${time}`);
            }}
          />

          {/* Submit Buttons */}
          <View style={{ gap: 10 }}>
            <Pressable onPress={() => handleSave(true)} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name={scheduledAt.trim() ? "time-outline" : "send"} size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                      {scheduledAt.trim() ? 'Créer et Programmer' : 'Créer et Envoyer'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => handleSave(false)} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
              <View style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', flexDirection: 'row', gap: 8 }}>
                <Ionicons name="save-outline" size={18} color="#64748B" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B' }}>Enregistrer en brouillon</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Edit Campaign Modal
function EditCampaignModal({ visible, campaign, onClose, onSaved }: {
  visible: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('marketing');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && campaign) {
      setName(campaign.name);
      setContent(campaign.content);
      setType(campaign.type);
      setTargetGroupId(campaign.target_group_id || '');
      if (campaign.scheduled_at) {
        const d = new Date(campaign.scheduled_at);
        setScheduledDate(d.toISOString().split('T')[0]);
        setScheduledTime(d.toTimeString().slice(0, 5));
      } else {
        setScheduledDate('');
        setScheduledTime('');
      }
      setError('');
      setSelectedTemplateId('');
      api.getGroups({ page: 1, page_size: 50 }).then((d) => setGroups(d.items)).catch(() => {});
      api.getTemplates({ page: 1, page_size: 50 }).then((d) => setTemplates(d.items)).catch(() => {});
    }
  }, [visible, campaign]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const tpl = templates.find((t: any) => t.id === templateId);
      if (tpl) setContent(tpl.content);
    }
  };

  const handleSave = async () => {
    if (!name || !content) {
      setError('Le nom et le contenu sont obligatoires');
      return;
    }
    if (!campaign) return;
    setIsSaving(true);
    setError('');
    try {
      await api.updateCampaign(campaign.id, {
        name,
        content,
        type,
        target_group_id: targetGroupId || undefined,
      });
      // Si une date de programmation est définie, programmer la campagne
      if (scheduledDate && scheduledTime) {
        const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
        await api.scheduleCampaign(campaign.id, scheduledAt);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setIsSaving(false);
    }
  };

  if (!campaign) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Modifier la campagne</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text>
            </View>
          ) : null}

          {/* Nom */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nom de la campagne *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom de la campagne"
            placeholderTextColor="#94A3B8"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }}
          />

          {/* Type */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {typeOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: type === opt.value ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: type === opt.value ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: type === opt.value ? '#4F46E5' : '#64748B' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Template */}
          {templates.length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Template (optionnel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <Pressable
                  onPress={() => handleTemplateSelect('')}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: !selectedTemplateId ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: !selectedTemplateId ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
                >
                  <Text style={{ fontSize: 12, color: !selectedTemplateId ? '#4F46E5' : '#64748B' }}>Garder le message actuel</Text>
                </Pressable>
                {templates.map((tpl: any) => (
                  <Pressable
                    key={tpl.id}
                    onPress={() => handleTemplateSelect(tpl.id)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: selectedTemplateId === tpl.id ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: selectedTemplateId === tpl.id ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
                  >
                    <Text style={{ fontSize: 12, color: selectedTemplateId === tpl.id ? '#4F46E5' : '#64748B' }}>{tpl.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {/* Content */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Message *</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Votre message SMS..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 8, minHeight: 100, textAlignVertical: 'top' }}
          />
          <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 16 }}>{content.length}/160 caractères • {Math.ceil(content.length / 160) || 1} segment(s)</Text>

          {/* Group */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Destinataires</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <Pressable
              onPress={() => setTargetGroupId('')}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: !targetGroupId ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: !targetGroupId ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
            >
              <Text style={{ fontSize: 12, color: !targetGroupId ? '#4F46E5' : '#64748B' }}>Tous les contacts</Text>
            </Pressable>
            {groups.map((g: any) => (
              <Pressable
                key={g.id}
                onPress={() => setTargetGroupId(g.id)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: targetGroupId === g.id ? '#EEF2FF' : '#FFFFFF', borderWidth: 1, borderColor: targetGroupId === g.id ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}
              >
                <Text style={{ fontSize: 12, color: targetGroupId === g.id ? '#4F46E5' : '#64748B' }}>{g.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Scheduling */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Programmer l'envoi (optionnel)</Text>
          <DateTimePickerMobile
            selectedDate={scheduledDate}
            selectedTime={scheduledTime || '09:00'}
            onDateChange={setScheduledDate}
            onTimeChange={setScheduledTime}
          />

          {/* Save Button */}
          <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Enregistrer</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Schedule Campaign Modal
function ScheduleCampaignModal({ visible, campaign, onClose, onScheduled }: {
  visible: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setDate('');
      setTime('09:00');
      setError('');
    }
  }, [visible]);

  const handleSchedule = async () => {
    if (!date || !time) {
      setError('Veuillez choisir une date et une heure');
      return;
    }
    if (!campaign) return;
    setIsSaving(true);
    setError('');
    try {
      const scheduledAt = `${date}T${time}:00`;
      await api.scheduleCampaign(campaign.id, scheduledAt);
      onScheduled();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la programmation');
    } finally {
      setIsSaving(false);
    }
  };

  if (!campaign) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, maxHeight: '85%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Programmer l'envoi</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{campaign.name}</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

          {error ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text>
            </View>
          ) : null}

          <DateTimePickerMobile
            selectedDate={date}
            selectedTime={time}
            onDateChange={setDate}
            onTimeChange={setTime}
          />

          <View style={{ height: 20 }} />
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={onClose} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}>
              <View style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B' }}>Annuler</Text>
              </View>
            </Pressable>
            <Pressable onPress={handleSchedule} disabled={isSaving} style={({ pressed }) => ({ flex: 1, opacity: pressed || isSaving ? 0.7 : 1 })}>
              <LinearGradient
                colors={['#F59E0B', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="calendar" size={16} color="#FFFFFF" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Programmer</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Campaign Detail Modal
function CampaignDetailModal({ visible, campaign, onClose }: {
  visible: boolean;
  campaign: Campaign | null;
  onClose: () => void;
}) {
  const [groupName, setGroupName] = useState<string | null>(null);

  useEffect(() => {
    if (visible && campaign?.target_group_id) {
      api.getGroups({ page: 1, page_size: 100 })
        .then((data) => {
          const group = data.items.find((g: any) => g.id === campaign.target_group_id);
          if (group) setGroupName(group.name);
        })
        .catch(() => {});
    } else {
      setGroupName(null);
    }
  }, [visible, campaign?.target_group_id]);

  if (!campaign) return null;

  const statusConfig = getStatusConfig(campaign.status);
  const deliveryRate = campaign.total_sent > 0
    ? Math.round((campaign.total_delivered / campaign.total_sent) * 100)
    : 0;
  const failRate = campaign.total_sent > 0
    ? Math.round((campaign.total_failed / campaign.total_sent) * 100)
    : 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Détail de la campagne</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{campaign.name}</Text>
          </View>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Statut */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: statusConfig.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={statusConfig.icon} size={20} color={statusConfig.color} />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>{statusConfig.label}</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>{campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)}</Text>
            </View>
          </View>

          {/* Groupe cible */}
          {campaign.target_group_id && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
              <Ionicons name="people" size={18} color="#4F46E5" />
              <View>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>Groupe cible</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{groupName || 'Chargement...'}</Text>
              </View>
            </View>
          )}

          {/* Message */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Message</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#1E293B', lineHeight: 20 }}>{campaign.content}</Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 8 }}>
              {campaign.content.length} caractères • {Math.ceil(campaign.content.length / 160) || 1} segment(s)
            </Text>
          </View>

          {/* Statistiques */}
          {campaign.total_recipients > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Statistiques</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>{campaign.total_recipients}</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Destinataires</Text>
                </View>
                <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#3B82F6' }}>{campaign.total_sent}</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Envoyés</Text>
                </View>
                <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#059669' }}>{campaign.total_delivered}</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Délivrés ({deliveryRate}%)</Text>
                </View>
                <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#DC2626' }}>{campaign.total_failed}</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Échoués ({failRate}%)</Text>
                </View>
              </View>
            </>
          )}

          {/* Dates */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dates</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Créée le</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{formatDate(campaign.created_at)}</Text>
            </View>
            {campaign.scheduled_at && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>Programmée pour</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{formatDate(campaign.scheduled_at)}</Text>
              </View>
            )}
            {campaign.sent_at && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>Envoyée le</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{formatDate(campaign.sent_at)}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function CampaignsScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const loadCampaigns = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    try {
      const data = await api.getCampaigns({ page: currentPage, page_size: 20 });
      setCampaigns(data.items);
      setTotal(data.total);
      if (reset) setPage(1);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    loadCampaigns(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCampaigns(true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCampaigns(true);
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const filterStatus = statusMap[activeTab];
    if (!filterStatus) return true;
    return c.status === filterStatus;
  });

  const handleSend = (campaign: Campaign) => {
    Alert.alert(
      'Envoyer la campagne',
      `Envoyer "${campaign.name}" maintenant ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            try {
              await api.sendCampaign(campaign.id);
              loadCampaigns(true);
              Alert.alert('Succès', 'Campagne envoyée');
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Erreur lors de l\'envoi');
            }
          },
        },
      ]
    );
  };

  const handleCancel = (campaign: Campaign) => {
    Alert.alert(
      'Annuler la campagne',
      `Annuler "${campaign.name}" ? Elle ne sera pas envoyée.`,
      [
        { text: 'Retour', style: 'cancel' },
        {
          text: 'Annuler la campagne',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelCampaign(campaign.id);
              loadCampaigns(true);
              Alert.alert('Succès', 'Campagne annulée');
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Erreur lors de l\'annulation');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowEdit(true);
  };

  const handleSchedule = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowSchedule(true);
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
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#1E293B' }}>Campagnes</Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{total} campagnes au total</Text>
        </View>
        <Pressable onPress={() => setShowCreate(true)} style={({ pressed }) => ({ backgroundColor: '#4F46E5', width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {tabs.map((tab, index) => (
            <Pressable key={tab} onPress={() => setActiveTab(index)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: activeTab === index ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: activeTab === index ? '#4F46E5' : '#E2E8F0' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: activeTab === index ? '#FFFFFF' : '#64748B' }}>{tab}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Campaign List */}
      <FlatList
        data={filteredCampaigns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="megaphone-outline" size={48} color="#CBD5E1" />
            <Text style={{ fontSize: 15, color: '#94A3B8', marginTop: 12 }}>Aucune campagne</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusConfig = getStatusConfig(item.status);
          return (
            <Pressable style={({ pressed }) => ({ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, opacity: pressed ? 0.95 : 1 })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>{item.name}</Text>
                  <Text style={{ fontSize: 13, color: '#64748B' }} numberOfLines={1}>{item.content}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: statusConfig.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, gap: 4 }}>
                  <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: statusConfig.color }}>{statusConfig.label}</Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="people-outline" size={14} color="#64748B" />
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>{item.total_recipients}</Text>
                  </View>
                  {item.total_delivered > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-done" size={14} color="#059669" />
                      <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                        {item.total_recipients > 0 ? Math.round((item.total_delivered / item.total_recipients) * 100) : 0}%
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={() => { setSelectedCampaign(item); setShowDetail(true); }} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                    <Ionicons name="eye-outline" size={18} color="#4F46E5" />
                  </Pressable>
                  {(item.status === 'draft' || item.status === 'scheduled') && (
                    <Pressable onPress={() => handleEdit(item)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                      <Ionicons name="create-outline" size={18} color="#64748B" />
                    </Pressable>
                  )}
                  {item.status === 'draft' && (
                    <Pressable onPress={() => handleSchedule(item)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                      <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
                    </Pressable>
                  )}
                  {item.status === 'draft' && (
                    <Pressable onPress={() => handleSend(item)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                      <Ionicons name="send" size={18} color="#4F46E5" />
                    </Pressable>
                  )}
                  {item.status === 'scheduled' && (
                    <Pressable onPress={() => handleCancel(item)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                      <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                    </Pressable>
                  )}
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Pressable onPress={() => setShowCreate(true)} style={({ pressed }) => ({ position: 'absolute', bottom: 100, right: 20, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] })}>
        <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 }}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>

      <CreateCampaignModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={() => loadCampaigns(true)} />

      <CampaignDetailModal
        visible={showDetail}
        campaign={selectedCampaign}
        onClose={() => { setShowDetail(false); setSelectedCampaign(null); }}
      />

      <EditCampaignModal
        visible={showEdit}
        campaign={selectedCampaign}
        onClose={() => { setShowEdit(false); setSelectedCampaign(null); }}
        onSaved={() => loadCampaigns(true)}
      />

      <ScheduleCampaignModal
        visible={showSchedule}
        campaign={selectedCampaign}
        onClose={() => { setShowSchedule(false); setSelectedCampaign(null); }}
        onScheduled={() => loadCampaigns(true)}
      />
    </SafeAreaView>
  );
}
