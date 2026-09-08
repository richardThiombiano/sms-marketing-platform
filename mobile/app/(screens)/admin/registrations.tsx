import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';

export default function AdminRegistrationsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await api.getPendingRegistrations({ page: 1, page_size: 50 });
      setRegistrations(data?.items || []);
    } catch {} finally { setIsLoading(false); }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await api.getPendingRegistrations({ page: 1, page_size: 50 });
      setRegistrations(data?.items || []);
    } catch {} finally { setRefreshing(false); }
  }

  function handleApprove(tenantId: string, name: string) {
    Alert.alert('Approuver', `Activer le compte de "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Approuver', onPress: async () => {
        setActionLoading(tenantId);
        try {
          await api.approveRegistration(tenantId);
          await loadData();
        } catch (e: any) { Alert.alert('Erreur', e.message); }
        finally { setActionLoading(null); }
      }},
    ]);
  }

  function handleReject(tenantId: string, name: string) {
    Alert.alert('Rejeter', `Supprimer la demande de "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Rejeter', style: 'destructive', onPress: async () => {
        setActionLoading(tenantId);
        try {
          await api.rejectRegistration(tenantId);
          await loadData();
        } catch (e: any) { Alert.alert('Erreur', e.message); }
        finally { setActionLoading(null); }
      }},
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#EA580C" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Inscriptions</Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Demandes en attente</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
      >
        {registrations.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#CBD5E1" />
            <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 12 }}>Aucune demande en attente</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              {registrations.length} demande{registrations.length > 1 ? 's' : ''} en attente
            </Text>
            {registrations.map((reg) => (
              <View key={reg.id} style={{ backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="business-outline" size={20} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>{reg.company_name}</Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {reg.created_at ? new Date(reg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 6, marginBottom: 14 }}>
                  <InfoRow icon="mail-outline" text={reg.email} />
                  <InfoRow icon="call-outline" text={reg.phone || '—'} />
                  <InfoRow icon="radio-outline" text={`Sender ID : ${reg.sender_id || '—'}`} />
                  {reg.owner && <InfoRow icon="at-outline" text={`${reg.owner.username} — ${reg.owner.first_name} ${reg.owner.last_name}`} />}
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => handleApprove(reg.id, reg.company_name)}
                    disabled={actionLoading === reg.id}
                    style={({ pressed }) => ({ flex: 1, backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 11, alignItems: 'center', opacity: pressed || actionLoading === reg.id ? 0.7 : 1 })}
                  >
                    {actionLoading === reg.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>Approuver</Text>}
                  </Pressable>
                  <Pressable
                    onPress={() => handleReject(reg.id, reg.company_name)}
                    disabled={actionLoading === reg.id}
                    style={({ pressed }) => ({ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA', opacity: pressed ? 0.7 : 1 })}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626' }}>Rejeter</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={14} color="#94A3B8" />
      <Text style={{ fontSize: 13, color: '#64748B' }}>{text}</Text>
    </View>
  );
}
