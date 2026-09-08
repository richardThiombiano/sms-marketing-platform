import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Modal,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

// ============================================
// PROFILE SECTION
// ============================================

function ProfileSection() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    api.getProfile().then((data) => {
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setEmail(data.email || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setError(''); setSuccess('');
    try {
      await api.updateProfile({ first_name: firstName, last_name: lastName, email });
      setSuccess('Profil mis à jour');
      fetchUser();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally { setIsSaving(false); }
  };

  return (
    <View style={{ marginBottom: 20, padding:20, marginTop:10, backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 }}>Profil</Text>
      {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{error}</Text></View> : null}
      {success ? <View style={{ backgroundColor: '#DCFCE7', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#059669' }}>{success}</Text></View> : null}

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Prénom</Text>
          <TextInput value={firstName} onChangeText={setFirstName} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nom</Text>
          <TextInput value={lastName} onChangeText={setLastName} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
        </View>
      </View>

      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
        style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }} />

      <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
        <View style={{ backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Enregistrer</Text>}
        </View>
      </Pressable>
    </View>
  );
}

// ============================================
// PASSWORD SECTION
// ============================================

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    const { validatePassword } = require('@/lib/password-validation');
    const { valid, error: pwdError } = validatePassword(newPassword);
    if (!valid) { setError(pwdError); return; }
    setIsSaving(true); setError(''); setSuccess('');
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess('Mot de passe modifié');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally { setIsSaving(false); }
  };

  return (
    <View style={{ marginBottom: 20, padding:20, marginTop:10, backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 }}>Sécurité</Text>
      {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{error}</Text></View> : null}
      {success ? <View style={{ backgroundColor: '#DCFCE7', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#059669' }}>{success}</Text></View> : null}

      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Mot de passe actuel</Text>
      <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry
        style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 14 }} />

      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nouveau mot de passe</Text>
      <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry
        style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 14 }} />

      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Confirmer</Text>
      <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry
        style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }} />

      <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
        <View style={{ backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Changer le mot de passe</Text>}
        </View>
      </Pressable>
    </View>
  );
}

// ============================================
// COMPANY SECTION
// ============================================

function CompanySection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCompany().then((data) => {
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setError(''); setSuccess('');
    try {
      await api.updateCompany({ name, email, phone });
      setSuccess('Entreprise mise à jour');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally { setIsSaving(false); }
  };

  return (
    <View style={{ marginBottom: 20, padding:20, marginTop:10, backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 }}>Entreprise</Text>
      {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{error}</Text></View> : null}
      {success ? <View style={{ backgroundColor: '#DCFCE7', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#059669' }}>{success}</Text></View> : null}

      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nom de l'entreprise</Text>
      <TextInput value={name} onChangeText={setName}
        style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 14 }} />

      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Email entreprise</Text>
      <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
        style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 14 }} />

      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Téléphone</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad"
        style={{ backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }} />

      <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
        <View style={{ backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Enregistrer</Text>}
        </View>
      </Pressable>
    </View>
  );
}

// ============================================
// EDIT TEAM MEMBER MODAL
// ============================================

function EditTeamMemberModal({ visible, member, onClose, onUpdated }: { visible: boolean; member: any; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', role: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setForm({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        role: member.role || 'member',
      });
      setError('');
    }
  }, [member]);

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.first_name) {
      setError('Le prénom est obligatoire'); return;
    }
    setIsSaving(true); setError('');
    try {
      await api.updateTeamMember(member.id, { first_name: form.first_name, last_name: form.last_name, role: form.role });
      onUpdated(); onClose();
    } catch (err: any) { setError(err.message || 'Erreur lors de la mise à jour'); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Modifier le membre</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{error}</Text></View> : null}

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Informations personnelles</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Prénom *</Text>
          <TextInput value={form.first_name} onChangeText={(v) => updateForm('first_name', v)} style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 12 }} />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nom</Text>
          <TextInput value={form.last_name} onChangeText={(v) => updateForm('last_name', v)} style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }} />

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rôle</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {['member', 'admin'].map((r) => (
              <Pressable key={r} onPress={() => updateForm('role', r)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: form.role === r ? '#4F46E5' : '#FFF', borderWidth: 1, borderColor: form.role === r ? '#4F46E5' : '#E2E8F0', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: form.role === r ? '#FFF' : '#64748B' }}>{r === 'member' ? 'Membre' : 'Admin'}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleSubmit} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
            <View style={{ backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Enregistrer les modifications</Text>}
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ============================================
// TEAM SECTION
// ============================================

function TeamSection() {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editMember, setEditMember] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const loadMembers = () => {
    api.getTeam().then((data) => setMembers(data.items)).catch(() => {}).finally(() => setIsLoading(false));
  };

  useEffect(() => { loadMembers(); }, []);

  const handleAddMember = async () => {
    if (!addForm.username || !addForm.email || !addForm.first_name || !addForm.password) {
      setAddError('Remplissez tous les champs obligatoires'); return;
    }
    if (addForm.username.length < 3 || !/^[a-z0-9._]+$/.test(addForm.username)) {
      setAddError('Username : min 3 caractères, lettres minuscules, chiffres, points, underscores'); return;
    }
    const { validatePassword } = require('@/lib/password-validation');
    const { valid, error: pwdError } = validatePassword(addForm.password);
    if (!valid) { setAddError(pwdError); return; }
    setAddLoading(true); setAddError('');
    try {
      await api.addTeamMember({ username: addForm.username, email: addForm.email, first_name: addForm.first_name, last_name: addForm.last_name, password: addForm.password, role: 'member' });
      setShowAddModal(false);
      setAddForm({ username: '', email: '', first_name: '', last_name: '', password: '' });
      loadMembers();
    } catch (err: any) { setAddError(err.message || 'Erreur'); }
    finally { setAddLoading(false); }
  };

  const handleRemove = (userId: string, name: string) => {
    Alert.alert('Supprimer', `Retirer ${name} de l'équipe ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.removeTeamMember(userId); setMembers((prev) => prev.filter((m) => m.id !== userId)); } catch (err: any) { Alert.alert('Erreur', err.message); }
      }},
    ]);
  };

  const handleToggle = (member: any) => {
    const action = member.is_active ? 'Désactiver' : 'Activer';
    Alert.alert(action, `${action} le compte de ${member.first_name} ${member.last_name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: async () => {
        try {
          await api.updateTeamMember(member.id, { is_active: !member.is_active });
          setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, is_active: !m.is_active } : m));
        } catch (err: any) { Alert.alert('Erreur', err.message); }
      }},
    ]);
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />;

  return (
    <View style={{ marginBottom: 20, padding:20, marginTop:10, backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Équipe</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={({ pressed }) => ({ backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, opacity: pressed ? 0.8 : 1 })}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF' }}>+ Inviter</Text>
        </Pressable>
      </View>
      {members.length === 0 ? (
        <Text style={{ fontSize: 14, color: '#94A3B8' }}>Aucun membre</Text>
      ) : (
        members.map((m) => (
          <View key={m.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4F46E5' }}>{(m.first_name?.[0] || '') + (m.last_name?.[0] || '')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{m.first_name} {m.last_name}</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>{m.email} • {m.role}</Text>
              </View>
              <View style={{ backgroundColor: m.is_active ? '#DCFCE7' : '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, fontWeight: '600', color: m.is_active ? '#166534' : '#991B1B' }}>{m.is_active ? 'Actif' : 'Inactif'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable onPress={() => setEditMember(m)} style={({ pressed }) => ({ flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#4F46E5' }}>Modifier</Text>
              </Pressable>
              <Pressable onPress={() => handleToggle(m)} style={({ pressed }) => ({ flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: m.is_active ? '#FEF2F2' : '#F0FDF4', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: m.is_active ? '#DC2626' : '#059669' }}>{m.is_active ? 'Désactiver' : 'Activer'}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemove(m.id, `${m.first_name} ${m.last_name}`)} style={({ pressed }) => ({ paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
              </Pressable>
            </View>
          </View>
        ))
      )}
      <EditTeamMemberModal visible={!!editMember} member={editMember} onClose={() => setEditMember(null)} onUpdated={loadMembers} />

      {/* Add Member Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Inviter un membre</Text>
            <Pressable onPress={() => { setShowAddModal(false); setAddError(''); }}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {addError ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }}><Text style={{ fontSize: 12, color: '#DC2626' }}>{addError}</Text></View> : null}

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Username *</Text>
            <TextInput value={addForm.username} onChangeText={(v) => setAddForm((p) => ({ ...p, username: v.toLowerCase().replace(/[^a-z0-9._]/g, '') }))} placeholder="ex: jean.dupont" autoCapitalize="none" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 12 }} />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Prénom *</Text>
                <TextInput value={addForm.first_name} onChangeText={(v) => setAddForm((p) => ({ ...p, first_name: v }))} style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Nom</Text>
                <TextInput value={addForm.last_name} onChangeText={(v) => setAddForm((p) => ({ ...p, last_name: v }))} style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B' }} />
              </View>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Email *</Text>
            <TextInput value={addForm.email} onChangeText={(v) => setAddForm((p) => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" placeholder="email@exemple.com" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 12 }} />

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Mot de passe *</Text>
            <TextInput value={addForm.password} onChangeText={(v) => setAddForm((p) => ({ ...p, password: v }))} secureTextEntry placeholder="Min. 6 caractères" style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 20 }} />

            <Pressable onPress={handleAddMember} disabled={addLoading} style={({ pressed }) => ({ opacity: pressed || addLoading ? 0.8 : 1 })}>
              <View style={{ backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                {addLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Inviter le membre</Text>}
              </View>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ============================================
// MAIN SETTINGS SCREEN
// ============================================

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profil', icon: 'person-outline' as const },
    { id: 'password', label: 'Sécurité', icon: 'lock-closed-outline' as const },
    ...(isOwner ? [
      { id: 'company', label: 'Entreprise', icon: 'business-outline' as const },
      { id: 'team', label: 'Équipe', icon: 'people-outline' as const },
    ] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={24} color="#1E293B" /></Pressable>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Paramètres</Text>
      </View>

      {/* Tab Selector */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 6 }}>
        {tabs.map((tab) => (
          <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: activeTab === tab.id ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: activeTab === tab.id ? '#4F46E5' : '#E2E8F0', gap: 6 }}>
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? '#FFFFFF' : '#64748B'} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab.id ? '#FFFFFF' : '#64748B' }}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'password' && <PasswordSection />}
        {activeTab === 'company' && isOwner && <CompanySection />}
        {activeTab === 'team' && isOwner && <TeamSection />}
      </ScrollView>
    </SafeAreaView>
  );
}
