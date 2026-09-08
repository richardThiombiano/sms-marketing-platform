import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, Href } from 'expo-router';
import { api } from '@/lib/api';

interface AdminStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_contacts: number;
  total_messages: number;
  messages_sent: number;
  messages_failed: number;
  total_campaigns: number;
  total_automations: number;
}

function StatCard({ icon, label, value, subtitle, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: number; subtitle?: string; color: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>{value.toLocaleString()}</Text>
      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 }}>{label}</Text>
      {subtitle && <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{subtitle}</Text>}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, tenantsData, usersData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTenants({ page: 1, page_size: 5 }),
        api.getAdminUsers({ page: 1, page_size: 5 }),
      ]);
      setStats(statsData);
      setTenants(tenantsData.items);
      setUsers(usersData.items);
    } catch {} finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (isLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#EA580C" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <Pressable onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </Pressable>
          <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <LinearGradient colors={['#EA580C', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Administration</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Vue d'ensemble de la plateforme</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Entreprises', icon: 'business-outline' as const, route: '/(screens)/admin/tenants' },
            { label: 'Utilisateurs', icon: 'people-outline' as const, route: '/(screens)/admin/users' },
            { label: 'Workers', icon: 'hardware-chip-outline' as const, route: '/(screens)/admin/workers' },
            { label: 'Facturation', icon: 'card-outline' as const, route: '/(screens)/admin/billing' },
          ].map((action) => (
            <Pressable key={action.label} onPress={() => router.push(action.route as Href)} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name={action.icon} size={18} color="#EA580C" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </Pressable>
          ))}
        </ScrollView>

        {/* Stats Grid */}
        {stats && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <StatCard icon="business" label="Entreprises" value={stats.total_tenants} subtitle={`${stats.active_tenants} actives`} color="#2563EB" />
              <StatCard icon="people" label="Utilisateurs" value={stats.total_users} color="#7C3AED" />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <StatCard icon="person" label="Contacts" value={stats.total_contacts} color="#059669" />
              <StatCard icon="send" label="SMS envoyés" value={stats.messages_sent} subtitle={`${stats.messages_failed} échoués`} color="#0891B2" />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatCard icon="megaphone" label="Campagnes" value={stats.total_campaigns} color="#D97706" />
              <StatCard icon="flash" label="Automations" value={stats.total_automations} color="#DC2626" />
            </View>
          </View>
        )}

        {/* Recent Tenants */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Entreprises récentes</Text>
            <Pressable onPress={() => router.push('/(screens)/admin/tenants' as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#EA580C' }}>Voir tout</Text>
            </Pressable>
          </View>
          {tenants.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#94A3B8' }}>Aucune entreprise</Text>
            </View>
          ) : (
            tenants.map((tenant) => (
              <View key={tenant.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="business" size={16} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{tenant.name}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>{tenant.email}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: tenant.is_active ? '#DCFCE7' : '#FEE2E2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: tenant.is_active ? '#166534' : '#991B1B' }}>
                      {tenant.is_active ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Users */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Utilisateurs récents</Text>
            <Pressable onPress={() => router.push('/(screens)/admin/users' as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#EA580C' }}>Voir tout</Text>
            </Pressable>
          </View>
          {users.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#94A3B8' }}>Aucun utilisateur</Text>
            </View>
          ) : (
            users.map((user) => (
              <View key={user.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="person" size={16} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{user.first_name || ''} {user.last_name || user.email}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>{user.tenant_name}</Text>
                </View>
                <View style={{ backgroundColor: user.role === 'superadmin' ? '#FED7AA' : user.role === 'owner' ? '#DBEAFE' : '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: user.role === 'superadmin' ? '#EA580C' : user.role === 'owner' ? '#2563EB' : '#64748B' }}>{user.role}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
