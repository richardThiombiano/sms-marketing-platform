import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Modal, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';

interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  marketing: { label: 'Marketing', color: '#2563EB', bg: '#DBEAFE' },
  birthday: { label: 'Anniversaire', color: '#7C3AED', bg: '#EDE9FE' },
  reminder: { label: 'Rappel', color: '#D97706', bg: '#FEF3C7' },
  transactional: { label: 'Transactionnel', color: '#059669', bg: '#DCFCE7' },
  welcome: { label: 'Bienvenue', color: '#0891B2', bg: '#CFFAFE' },
};

const categoryOptions = [
  { value: '', label: 'Aucune' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'birthday', label: 'Anniversaire' },
  { value: 'reminder', label: 'Rappel' },
  { value: 'transactional', label: 'Transactionnel' },
  { value: 'welcome', label: 'Bienvenue' },
];

// Template Modal
function TemplateModal({ visible, onClose, onSaved, template }: {
  visible: boolean; onClose: () => void; onSaved: () => void; template: Template | null;
}) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setCategory(template.category || '');
    } else {
      setName(''); setContent(''); setCategory('');
    }
    setError('');
  }, [template, visible]);

  const detectedVars = (content.match(/\{\{(\w+)\}\}/g) || []).map((v) => v.replace(/\{\{|\}\}/g, ''));

  const handleSave = async () => {
    if (!name || !content) { setError('Le nom et le contenu sont obligatoires'); return; }
    setIsSaving(true); setError('');
    try {
      if (template) {
        await api.updateTemplate(template.id, { name, content, category: category || undefined, variables: detectedVars });
      } else {
        await api.createTemplate({ name, content, category: category || undefined, variables: detectedVars });
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>{template ? 'Modifier le template' : 'Nouveau template'}</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 }}><Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text></View> : null}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nom *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Ex: Promo du mois" placeholderTextColor="#94A3B8"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }} />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {categoryOptions.map((opt) => (
              <Pressable key={opt.value} onPress={() => setCategory(opt.value)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: category === opt.value ? '#EC4899' : '#FFFFFF', borderWidth: 1, borderColor: category === opt.value ? '#EC4899' : '#E2E8F0', marginRight: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: category === opt.value ? '#FFFFFF' : '#64748B' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Contenu *</Text>
          <TextInput value={content} onChangeText={setContent} placeholder="Bonjour {{prenom}}, votre..." placeholderTextColor="#94A3B8" multiline
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 8, minHeight: 120, textAlignVertical: 'top' }} />
          <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>{content.length}/160 • Utilisez {'{{variable}}'} pour les champs dynamiques</Text>

          {/* Variable insertion buttons */}
          <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>Insérer une variable :</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {['first_name', 'last_name', 'phone', 'city'].map((v) => (
              <Pressable key={v} onPress={() => setContent((prev) => prev + `{{${v}}}`)}
                style={({ pressed }) => ({ backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#4F46E5', fontFamily: 'monospace' }}>{`{{${v}}}`}</Text>
              </Pressable>
            ))}
          </View>

          {detectedVars.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {detectedVars.map((v) => (
                <View key={v} style={{ backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#4F46E5' }}>{`{{${v}}}`}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1, marginTop: 8 })}>
            <LinearGradient colors={['#EC4899', '#F472B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> :
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{template ? 'Enregistrer' : 'Créer le template'}</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.getTemplates({ page: 1, page_size: 50 });
      setTemplates(data.items);
      setTotal(data.total);
    } catch {} finally { setIsLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadTemplates(); }, []);

  const onRefresh = () => { setRefreshing(true); loadTemplates(); };

  const handleDelete = (tpl: Template) => {
    Alert.alert('Supprimer', `Supprimer "${tpl.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.deleteTemplate(tpl.id); loadTemplates(); } catch (err: any) { Alert.alert('Erreur', err.message); }
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
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Templates</Text>
          <Text style={{ fontSize: 12, color: '#64748B' }}>{total} modèles</Text>
        </View>
        <Pressable onPress={() => { setEditTemplate(null); setShowModal(true); }} style={({ pressed }) => ({ backgroundColor: '#EC4899', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Ionicons name="document-text-outline" size={48} color="#CBD5E1" /><Text style={{ fontSize: 15, color: '#94A3B8', marginTop: 12 }}>Aucun template</Text></View>}
        renderItem={({ item }) => {
          const cat = item.category && categoryConfig[item.category] ? categoryConfig[item.category] : null;
          return (
            <Pressable onPress={() => { setEditTemplate(item); setShowModal(true); }} style={({ pressed }) => ({ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, opacity: pressed ? 0.95 : 1 })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>{item.name}</Text>
                  {cat && (
                    <View style={{ alignSelf: 'flex-start', backgroundColor: cat.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: cat.color }}>{cat.label}</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => handleDelete(item)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
              <Text style={{ fontSize: 13, color: '#64748B' }} numberOfLines={2}>{item.content}</Text>
              {item.variables && item.variables.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {item.variables.map((v) => (
                    <View key={v} style={{ backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: '#64748B' }}>{`{{${v}}}`}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <TemplateModal visible={showModal} onClose={() => { setShowModal(false); setEditTemplate(null); }} onSaved={loadTemplates} template={editTemplate} />
    </SafeAreaView>
  );
}
