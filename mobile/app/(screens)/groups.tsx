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

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_dynamic: boolean;
  contact_count: number;
  created_at: string;
}

// Create/Edit Group Modal
function GroupModal({ visible, onClose, onSaved, group }: {
  visible: boolean; onClose: () => void; onSaved: () => void; group: Group | null;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
    } else {
      setName(''); setDescription('');
    }
    setError('');
  }, [group, visible]);

  const handleSave = async () => {
    if (!name) { setError('Le nom est obligatoire'); return; }
    setIsSaving(true); setError('');
    try {
      if (group) {
        await api.updateGroup(group.id, { name, description: description || undefined });
      } else {
        await api.createGroup({ name, description: description || undefined });
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>{group ? 'Modifier le groupe' : 'Nouveau groupe'}</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 }}><Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text></View> : null}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nom du groupe *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Ex: Clients VIP" placeholderTextColor="#94A3B8"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }} />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Description optionnelle" placeholderTextColor="#94A3B8" multiline
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 24, minHeight: 80, textAlignVertical: 'top' }} />

          <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
            <LinearGradient colors={['#0891B2', '#06B6D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> :
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{group ? 'Enregistrer' : 'Créer le groupe'}</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Group Members Modal
function MembersModal({ visible, onClose, group, onMembersChanged }: { visible: boolean; onClose: () => void; group: Group | null; onMembersChanged: () => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMembers, setShowAddMembers] = useState(false);

  useEffect(() => {
    if (visible && group) {
      loadMembers();
    }
  }, [visible, group]);

  const loadMembers = () => {
    if (!group) return;
    setIsLoading(true);
    api.getGroupMembers(group.id, { page: 1, page_size: 50 })
      .then((d) => setMembers(d.items))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const handleRemove = async (contactId: string) => {
    if (!group) return;
    try {
      await api.removeGroupMember(group.id, contactId);
      setMembers((prev) => prev.filter((m) => m.id !== contactId));
      onMembersChanged();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Membres — {group?.name}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => setShowAddMembers(true)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name="person-add" size={22} color="#4F46E5" />
            </Pressable>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
          </View>
        </View>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#4F46E5" /></View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Text style={{ fontSize: 14, color: '#94A3B8' }}>Aucun membre</Text></View>}
            ListHeaderComponent={
              <Pressable onPress={() => setShowAddMembers(true)} style={({ pressed }) => ({ backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="person-add" size={18} color="#4F46E5" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#4F46E5' }}>Ajouter des membres</Text>
              </Pressable>
            }
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{[item.first_name, item.last_name].filter(Boolean).join(' ') || item.phone}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{item.phone}</Text>
                </View>
                <Pressable onPress={() => handleRemove(item.id)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
                  <Ionicons name="remove-circle-outline" size={20} color="#DC2626" />
                </Pressable>
              </View>
            )}
          />
        )}
        {group && <AddMembersModal visible={showAddMembers} onClose={() => setShowAddMembers(false)} group={group} onAdded={() => { loadMembers(); onMembersChanged(); }} />}
      </SafeAreaView>
    </Modal>
  );
}

// Add Members Modal
function AddMembersModal({ visible, onClose, group, onAdded }: { visible: boolean; onClose: () => void; group: Group; onAdded: () => void }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setSelected([]);
      setSearch('');
      api.getContacts({ page: 1, page_size: 100 })
        .then((d) => setContacts(d.items))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [visible]);

  const filteredContacts = search
    ? contacts.filter((c) =>
        (c.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search)
      )
    : contacts;

  const toggleContact = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setIsSaving(true);
    try {
      await api.addGroupMembers(group.id, selected);
      onAdded();
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Ajouter des membres</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>{selected.length} sélectionné(s)</Text>
          </View>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher un contact..." placeholderTextColor="#94A3B8" style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B' }} />
          </View>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#4F46E5" /></View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Text style={{ fontSize: 14, color: '#94A3B8' }}>Aucun contact</Text></View>}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id);
              return (
                <Pressable onPress={() => toggleContact(item.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: isSelected ? '#4F46E5' : '#F1F5F9', opacity: pressed ? 0.9 : 1 })}>
                  <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? '#4F46E5' : '#CBD5E1', backgroundColor: isSelected ? '#4F46E5' : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#1E293B' }}>{[item.first_name, item.last_name].filter(Boolean).join(' ') || item.phone}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>{item.phone}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        {/* Footer Button */}
        {selected.length > 0 && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <Pressable onPress={handleAdd} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <>
                    <Ionicons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Ajouter {selected.length} contact(s)</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      const data = await api.getGroups({ page: 1, page_size: 50 });
      setGroups(data.items);
      setTotal(data.total);
    } catch {} finally {
      setIsLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, []);

  const onRefresh = () => { setRefreshing(true); loadGroups(); };

  const handleDelete = (group: Group) => {
    Alert.alert('Supprimer', `Supprimer le groupe "${group.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.deleteGroup(group.id); loadGroups(); } catch (err: any) { Alert.alert('Erreur', err.message); }
      }},
    ]);
  };

  if (isLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#4F46E5" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={24} color="#1E293B" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Groupes</Text>
          <Text style={{ fontSize: 12, color: '#64748B' }}>{total} groupes</Text>
        </View>
        <Pressable onPress={() => { setEditGroup(null); setShowModal(true); }} style={({ pressed }) => ({ backgroundColor: '#0891B2', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Ionicons name="folder-open-outline" size={48} color="#CBD5E1" /><Text style={{ fontSize: 15, color: '#94A3B8', marginTop: 12 }}>Aucun groupe</Text></View>}
        renderItem={({ item }) => (
          <Pressable onPress={() => { setSelectedGroup(item); setShowMembers(true); }} style={({ pressed }) => ({ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, opacity: pressed ? 0.95 : 1 })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>{item.name}</Text>
                {item.description && <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 6 }} numberOfLines={1}>{item.description}</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="people-outline" size={14} color="#64748B" />
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{item.contact_count} contacts</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => { setEditGroup(item); setShowModal(true); }} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
                  <Ionicons name="pencil-outline" size={18} color="#4F46E5" />
                </Pressable>
                <Pressable onPress={() => handleDelete(item)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
      />

      <GroupModal visible={showModal} onClose={() => { setShowModal(false); setEditGroup(null); }} onSaved={loadGroups} group={editGroup} />
      <MembersModal visible={showMembers} onClose={() => setShowMembers(false)} group={selectedGroup} onMembersChanged={loadGroups} />
    </SafeAreaView>
  );
}
