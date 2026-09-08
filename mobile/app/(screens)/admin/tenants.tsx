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

// ============================================
// CREATE TENANT MODAL
// ============================================
function CreateTenantModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', smsbus_username: '', smsbus_password: '', smsbus_id: '', smsbus_sender_id: '', whatsapp_phone_number_id: '', whatsapp_business_account_id: '', whatsapp_access_token: '', whatsapp_enabled: false, owner_first_name: '', owner_last_name: '', owner_username: '', owner_email: '', owner_password: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (key: string, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.owner_first_name || !form.owner_username || !form.owner_password) {
      setError('Remplissez les champs obligatoires'); return;
    }
    setIsSaving(true); setError('');
    try {
      await api.createAdminTenant(form);
      onCreated(); onClose();
      setForm({ name: '', email: '', phone: '', smsbus_username: '', smsbus_password: '', smsbus_id: '', smsbus_sender_id: '', whatsapp_phone_number_id: '', whatsapp_business_account_id: '', whatsapp_access_token: '', whatsapp_enabled: false, owner_first_name: '', owner_last_name: '', owner_username: '', owner_email: '', owner_password: '' });
    } catch (err: any) { setError(err.message || 'Erreur'); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Nouvelle entreprise</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{error}</Text></View> : null}

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Informations entreprise</Text>
          <TextInput value={form.name} onChangeText={(v) => updateForm('name', v)} placeholder="Nom *" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 }} />
          <TextInput value={form.email} onChangeText={(v) => updateForm('email', v)} placeholder="Email *" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 }} />
          <TextInput value={form.phone} onChangeText={(v) => updateForm('phone', v)} placeholder="Téléphone" keyboardType="phone-pad" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }} />

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paramètres API SMS</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <TextInput value={form.smsbus_username} onChangeText={(v) => updateForm('smsbus_username', v)} placeholder="Username" placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            <TextInput value={form.smsbus_password} onChangeText={(v) => updateForm('smsbus_password', v)} placeholder="Password" secureTextEntry placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TextInput value={form.smsbus_id} onChangeText={(v) => updateForm('smsbus_id', v)} placeholder="Terminal Web ID" placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            <TextInput value={form.smsbus_sender_id} onChangeText={(v) => updateForm('smsbus_sender_id', v)} placeholder="Sender ID" placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>WhatsApp Business API</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 11, color: '#64748B' }}>{form.whatsapp_enabled ? 'Activé' : 'Désactivé'}</Text>
              <Switch value={form.whatsapp_enabled} onValueChange={(v) => updateForm('whatsapp_enabled', v)} trackColor={{ false: '#E2E8F0', true: '#10B981' }} thumbColor="#FFF" />
            </View>
          </View>
          <TextInput value={form.whatsapp_phone_number_id} onChangeText={(v) => updateForm('whatsapp_phone_number_id', v)} placeholder="Phone Number ID" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 }} />
          <TextInput value={form.whatsapp_business_account_id} onChangeText={(v) => updateForm('whatsapp_business_account_id', v)} placeholder="Business Account ID" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 }} />
          <TextInput value={form.whatsapp_access_token} onChangeText={(v) => updateForm('whatsapp_access_token', v)} placeholder="Access Token" secureTextEntry placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }} />

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Compte propriétaire</Text>
          <TextInput value={form.owner_username} onChangeText={(v) => updateForm('owner_username', v.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="Nom de connexion (username) *" autoCapitalize="none" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <TextInput value={form.owner_first_name} onChangeText={(v) => updateForm('owner_first_name', v)} placeholder="Prénom *" placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            <TextInput value={form.owner_last_name} onChangeText={(v) => updateForm('owner_last_name', v)} placeholder="Nom" placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TextInput value={form.owner_email} onChangeText={(v) => updateForm('owner_email', v)} placeholder="Email propriétaire" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            <TextInput value={form.owner_password} onChangeText={(v) => updateForm('owner_password', v)} placeholder="Mot de passe *" secureTextEntry placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
          </View>

          <Pressable onPress={handleSubmit} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
            <LinearGradient colors={['#EA580C', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Créer l'entreprise</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ============================================
// EDIT TENANT MODAL
// ============================================
function EditTenantModal({ visible, tenant, onClose, onUpdated }: { visible: boolean; tenant: any; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', smsbus_username: '', smsbus_password: '', smsbus_id: '', smsbus_sender_id: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (visible && tenant) {
      setForm({
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        smsbus_username: tenant.smsbus_username || '',
        smsbus_password: '',
        smsbus_id: tenant.smsbus_id || '',
        smsbus_sender_id: tenant.smsbus_sender_id || '',
      });
      setError('');
      setSuccess('');
    }
  }, [visible, tenant]);

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      setError('Le nom et l\'email sont obligatoires'); return;
    }
    setIsSaving(true); setError(''); setSuccess('');
    try {
      const data: any = { name: form.name, email: form.email, phone: form.phone, smsbus_username: form.smsbus_username, smsbus_id: form.smsbus_id, smsbus_sender_id: form.smsbus_sender_id };
      if (form.smsbus_password) data.smsbus_password = form.smsbus_password;
      await api.updateAdminTenant(tenant.id, data);
      setSuccess('Entreprise mise à jour');
      onUpdated();
      setTimeout(() => onClose(), 800);
    } catch (err: any) { setError(err.message || 'Erreur'); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Modifier l'entreprise</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{error}</Text></View> : null}
          {success ? <View style={{ backgroundColor: '#DCFCE7', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#059669' }}>{success}</Text></View> : null}

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Informations entreprise</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nom *</Text>
          <TextInput value={form.name} onChangeText={(v) => updateForm('name', v)} placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Email *</Text>
          <TextInput value={form.email} onChangeText={(v) => updateForm('email', v)} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Téléphone</Text>
          <TextInput value={form.phone} onChangeText={(v) => updateForm('phone', v)} keyboardType="phone-pad" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }} />

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paramètres API SMS</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Username</Text>
              <TextInput value={form.smsbus_username} onChangeText={(v) => updateForm('smsbus_username', v)} placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Password</Text>
              <TextInput value={form.smsbus_password} onChangeText={(v) => updateForm('smsbus_password', v)} placeholder="Laisser vide si inchangé" secureTextEntry placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Terminal Web ID</Text>
              <TextInput value={form.smsbus_id} onChangeText={(v) => updateForm('smsbus_id', v)} placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Sender ID</Text>
              <TextInput value={form.smsbus_sender_id} onChangeText={(v) => updateForm('smsbus_sender_id', v)} placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
          </View>

          <Pressable onPress={handleSubmit} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
            <LinearGradient colors={['#EA580C', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Enregistrer</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ============================================
// MAIN SCREEN
// ============================================
export default function AdminTenantsScreen() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  const loadTenants = useCallback(async () => {
    try {
      const params: any = { page: 1, page_size: 50 };
      if (search) params.search = search;
      const data = await api.getAdminTenants(params);
      setTenants(data.items);
      setTotal(data.total);
    } catch {} finally { setIsLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const onRefresh = () => { setRefreshing(true); loadTenants(); };

  const handleToggle = (tenant: any) => {
    Alert.alert(
      tenant.is_active ? 'Désactiver' : 'Activer',
      `${tenant.is_active ? 'Désactiver' : 'Activer'} "${tenant.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: async () => { try { await api.toggleTenant(tenant.id); loadTenants(); } catch (err: any) { Alert.alert('Erreur', err.message); } } },
      ]
    );
  };

  if (isLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#EA580C" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={24} color="#1E293B" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Entreprises</Text>
          <Text style={{ fontSize: 12, color: '#64748B' }}>{total} entreprise(s)</Text>
        </View>
        <Pressable onPress={() => setShowCreate(true)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          <LinearGradient colors={['#EA580C', '#DC2626']} style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={22} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher..." placeholderTextColor="#94A3B8" style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B' }} />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={tenants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Ionicons name="business-outline" size={48} color="#CBD5E1" /><Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 12 }}>Aucune entreprise</Text></View>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: '#64748B' }}>{item.email}</Text>
                {item.slug && <Text style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>{item.slug}</Text>}
              </View>
              <View style={{ backgroundColor: item.is_active ? '#DCFCE7' : '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: item.is_active ? '#166534' : '#991B1B' }}>{item.is_active ? 'Actif' : 'Inactif'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: '#64748B', flex: 1 }}>
                {item.sms_provider?.toUpperCase()}
              </Text>
              {item.owner && <Text style={{ fontSize: 11, color: '#94A3B8' }}>{item.owner.first_name} {item.owner.last_name}</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setSelectedTenant(item)} style={({ pressed }) => ({ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#4F46E5' }}>Modifier</Text>
              </Pressable>
              <Pressable onPress={() => handleToggle(item)} style={({ pressed }) => ({ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: item.is_active ? '#FEF2F2' : '#F0FDF4', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: item.is_active ? '#DC2626' : '#059669' }}>{item.is_active ? 'Désactiver' : 'Activer'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <CreateTenantModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={loadTenants} />
      <EditTenantModal visible={!!selectedTenant} tenant={selectedTenant} onClose={() => setSelectedTenant(null)} onUpdated={loadTenants} />
    </SafeAreaView>
  );
}
