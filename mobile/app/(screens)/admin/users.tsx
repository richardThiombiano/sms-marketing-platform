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

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  superadmin: { label: 'Super Admin', color: '#EA580C', bg: '#FED7AA' },
  owner: { label: 'Propriétaire', color: '#2563EB', bg: '#DBEAFE' },
  admin: { label: 'Admin', color: '#7C3AED', bg: '#EDE9FE' },
  member: { label: 'Membre', color: '#64748B', bg: '#F1F5F9' },
};

// Create User Modal
function CreateUserModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [form, setForm] = useState({ tenant_id: '', username: '', email: '', first_name: '', last_name: '', password: '', role: 'member' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      api.getAdminTenants({ page: 1, page_size: 100 }).then((d) => setTenants(d.items)).catch(() => {});
    }
  }, [visible]);

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.tenant_id || !form.email || !form.first_name || !form.password || !form.username) {
      setError('Remplissez les champs obligatoires'); return;
    }
    if (form.username.length < 3 || !/^[a-z0-9._]+$/.test(form.username)) {
      setError('Username : min 3 caractères (lettres minuscules, chiffres, points, underscores)'); return;
    }
    setIsSaving(true); setError('');
    try {
      await api.createAdminUser(form);
      onCreated(); onClose();
      setForm({ tenant_id: '', username: '', email: '', first_name: '', last_name: '', password: '', role: 'member' });
    } catch (err: any) { setError(err.message || 'Erreur'); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Nouvel utilisateur</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{error}</Text></View> : null}

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Entreprise *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {tenants.map((t) => (
              <Pressable key={t.id} onPress={() => updateForm('tenant_id', t.id)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: form.tenant_id === t.id ? '#EA580C' : '#FFF', borderWidth: 1, borderColor: form.tenant_id === t.id ? '#EA580C' : '#E2E8F0', marginRight: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: form.tenant_id === t.id ? '#FFF' : '#64748B' }}>{t.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Prénom *</Text>
              <TextInput value={form.first_name} onChangeText={(v) => updateForm('first_name', v)} style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nom</Text>
              <TextInput value={form.last_name} onChangeText={(v) => updateForm('last_name', v)} style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Username *</Text>
          <TextInput value={form.username} onChangeText={(v) => updateForm('username', v.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="ex: jean.dupont" autoCapitalize="none" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 4 }} />
          <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 12 }}>Lettres minuscules, chiffres, points, underscores</Text>


          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Email *</Text>
          <TextInput value={form.email} onChangeText={(v) => updateForm('email', v)} keyboardType="email-address" autoCapitalize="none" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 12 }} />

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Mot de passe *</Text>
              <TextInput value={form.password} onChangeText={(v) => updateForm('password', v)} secureTextEntry style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Rôle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['member', 'admin', 'owner'].map((r) => (
                  <Pressable key={r} onPress={() => updateForm('role', r)} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: form.role === r ? '#EA580C' : '#F1F5F9', marginRight: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: form.role === r ? '#FFF' : '#64748B' }}>{r}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <Pressable onPress={handleSubmit} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1, marginTop: 8 })}>
            <LinearGradient colors={['#EA580C', '#DC2626']} style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Créer l'utilisateur</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Edit User Modal
function EditUserModal({ visible, user, onClose, onUpdated }: { visible: boolean; user: any; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', role: 'member', password: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (visible && user) {
      setForm({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'member',
        password: '',
      });
      setError('');
      setSuccess('');
    }
  }, [visible, user]);

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.email || !form.first_name) {
      setError('L\'email et le prénom sont obligatoires'); return;
    }
    setIsSaving(true); setError(''); setSuccess('');
    try {
      const data: any = { username: form.username, email: form.email, first_name: form.first_name, last_name: form.last_name, role: form.role };
      if (form.password) data.password = form.password;
      await api.updateAdminUser(user.id, data);
      setSuccess('Utilisateur mis à jour');
      onUpdated();
      setTimeout(() => onClose(), 800);
    } catch (err: any) { setError(err.message || 'Erreur'); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Modifier l'utilisateur</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{error}</Text></View> : null}
          {success ? <View style={{ backgroundColor: '#DCFCE7', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#059669' }}>{success}</Text></View> : null}

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Prénom *</Text>
              <TextInput value={form.first_name} onChangeText={(v) => updateForm('first_name', v)} style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nom</Text>
              <TextInput value={form.last_name} onChangeText={(v) => updateForm('last_name', v)} style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
            </View>
          </View>

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Username</Text>
          <TextInput value={form.username} onChangeText={(v) => updateForm('username', v.toLowerCase().replace(/[^a-z0-9._]/g, ''))} autoCapitalize="none" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 12 }} />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Email *</Text>
          <TextInput value={form.email} onChangeText={(v) => updateForm('email', v)} keyboardType="email-address" autoCapitalize="none" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 12 }} />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nouveau mot de passe</Text>
          <TextInput value={form.password} onChangeText={(v) => updateForm('password', v)} placeholder="Laisser vide si inchangé" secureTextEntry placeholderTextColor="#94A3B8" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 12 }} />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Rôle</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {['member', 'admin', 'owner'].map((r) => (
              <Pressable key={r} onPress={() => updateForm('role', r)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: form.role === r ? '#EA580C' : '#F1F5F9', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: form.role === r ? '#FFF' : '#64748B' }}>{r === 'member' ? 'Membre' : r === 'admin' ? 'Admin' : 'Propriétaire'}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleSubmit} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
            <LinearGradient colors={['#EA580C', '#DC2626']} style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Enregistrer</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Main Screen
export default function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const loadUsers = useCallback(async () => {
    try {
      const params: any = { page: 1, page_size: 50 };
      if (search) params.search = search;
      const data = await api.getAdminUsers(params);
      setUsers(data.items);
      setTotal(data.total);
    } catch {} finally { setIsLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const onRefresh = () => { setRefreshing(true); loadUsers(); };

  const handleToggle = (user: any) => {
    if (user.role === 'superadmin') return;
    Alert.alert(
      user.is_active ? 'Désactiver' : 'Activer',
      `${user.is_active ? 'Désactiver' : 'Activer'} ${user.first_name} ${user.last_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: async () => { try { await api.toggleAdminUser(user.id); loadUsers(); } catch (err: any) { Alert.alert('Erreur', err.message); } } },
      ]
    );
  };

  const handleDelete = (user: any) => {
    if (user.role === 'superadmin') return;
    Alert.alert('Supprimer', `Supprimer ${user.first_name} ${user.last_name} ? Irréversible.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { try { await api.deleteAdminUser(user.id); loadUsers(); } catch (err: any) { Alert.alert('Erreur', err.message); } } },
    ]);
  };

  if (isLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#EA580C" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={24} color="#1E293B" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Utilisateurs</Text>
          <Text style={{ fontSize: 12, color: '#64748B' }}>{total} utilisateur(s)</Text>
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
          <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher par nom, email..." placeholderTextColor="#94A3B8" style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B' }} />
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Ionicons name="people-outline" size={48} color="#CBD5E1" /><Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 12 }}>Aucun utilisateur</Text></View>}
        renderItem={({ item }) => {
          const role = roleConfig[item.role] || roleConfig.member;
          return (
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: role.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: role.color }}>{(item.first_name?.[0] || '') + (item.last_name?.[0] || '')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{item.first_name || ''} {item.last_name || ''}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>@{item.username} — {item.email}</Text>
                </View>
                <View style={{ backgroundColor: role.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: role.color }}>{role.label}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>{item.tenant_name || '—'}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ backgroundColor: item.is_active ? '#DCFCE7' : '#FEE2E2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: item.is_active ? '#166534' : '#991B1B' }}>{item.is_active ? 'Actif' : 'Inactif'}</Text>
                  </View>
                  {item.role !== 'superadmin' && (
                    <>
                      <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 2 })}>
                        <Ionicons name="create-outline" size={16} color="#4F46E5" />
                      </Pressable>
                      <Pressable onPress={() => handleToggle(item)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 2 })}>
                        <Ionicons name="power" size={16} color={item.is_active ? '#DC2626' : '#059669'} />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(item)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 2 })}>
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      <CreateUserModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={loadUsers} />
      <EditUserModal visible={!!selectedUser} user={selectedUser} onClose={() => setSelectedUser(null)} onUpdated={loadUsers} />
    </SafeAreaView>
  );
}
