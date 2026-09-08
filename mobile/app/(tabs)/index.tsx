import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import StatCard from '@/components/StatCard';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

interface DashboardData {
  totalContacts: number;
  totalCampaigns: number;
  smsStats: {
    summary: {
      total: number;
      delivered: number;
      failed: number;
      delivery_rate: number;
    };
  } | null;
  recentCampaigns: any[];
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'sent': return { label: 'Envoyée', bg: '#DCFCE7', color: '#166534' };
    case 'sending': return { label: 'En cours', bg: '#FEF3C7', color: '#92400E' };
    case 'scheduled': return { label: 'Programmée', bg: '#E0E7FF', color: '#3730A3' };
    case 'draft': return { label: 'Brouillon', bg: '#F1F5F9', color: '#475569' };
    case 'cancelled': return { label: 'Annulée', bg: '#FEE2E2', color: '#991B1B' };
    default: return { label: status, bg: '#F1F5F9', color: '#475569' };
  }
}

export default function DashboardScreen() {
  const { user, tenant, smsBalance, fetchSmsBalance } = useAuthStore();
  const [data, setData] = useState<DashboardData>({
    totalContacts: 0,
    totalCampaigns: 0,
    smsStats: null,
    recentCampaigns: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [contacts, campaigns, stats] = await Promise.all([
        api.getContacts({ page: 1, page_size: 1 }).catch(() => ({ total: 0 })),
        api.getCampaigns({ page: 1, page_size: 5 }).catch(() => ({ items: [], total: 0 })),
        api.getSmsStats('30d').catch(() => null),
      ]);

      setData({
        totalContacts: contacts.total,
        totalCampaigns: campaigns.total,
        smsStats: stats,
        recentCampaigns: campaigns.items || [],
      });

      fetchSmsBalance();
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const firstName = user?.first_name || 'Utilisateur';
  const deliveryRate = data.smsStats?.summary?.delivery_rate
    ? `${data.smsStats.summary.delivery_rate.toFixed(1)}%`
    : '—';
  const totalSent = data.smsStats?.summary?.total?.toLocaleString() || '0';

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      >
        {/* Header */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFF' }}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Bonjour, {firstName}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  {tenant?.name || 'SMS Pro'}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="diamond" size={14} color="#FCD34D" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginLeft: 6 }}>
                {smsBalance ? smsBalance.amount.toLocaleString() : '—'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <StatCard
              icon="chatbubbles"
              value={totalSent}
              label="SMS envoyés"
              gradientColors={['#4F46E5', '#6366F1']}
            />
            <StatCard
              icon="checkmark-done-circle"
              value={deliveryRate}
              label="Taux délivrance"
              gradientColors={['#059669', '#10B981']}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard
              icon="people"
              value={data.totalContacts.toLocaleString()}
              label="Contacts"
              gradientColors={['#7C3AED', '#8B5CF6']}
            />
            <StatCard
              icon="diamond"
              value={smsBalance ? `${smsBalance.amount.toLocaleString()}` : '—'}
              label={smsBalance?.currency || 'Crédits'}
              gradientColors={['#D97706', '#F59E0B']}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 }}>Actions rapides</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[
              { icon: 'chatbubble-ellipses' as const, label: 'Envoyer SMS', color: '#4F46E5', route: '/(tabs)/messages' },
              { icon: 'person-add' as const, label: 'Nouveau contact', color: '#7C3AED', route: '/(tabs)/contacts' },
              { icon: 'megaphone' as const, label: 'Campagne', color: '#2563EB', route: '/(tabs)/campaigns' },
              { icon: 'flash' as const, label: 'Automations', color: '#059669', route: '/(screens)/automations' },
            ].map((action, index) => (
              <Pressable
                key={index}
                onPress={() => router.push(action.route as any)}
                style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] })}
              >
                <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: action.color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: action.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center', maxWidth: 70 }}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Campaigns */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Campagnes récentes</Text>
            <Pressable onPress={() => router.push('/(tabs)/campaigns')} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#4F46E5' }}>Voir tout</Text>
            </Pressable>
          </View>

          {data.recentCampaigns.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
              <Ionicons name="megaphone-outline" size={32} color="#CBD5E1" />
              <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 8 }}>Aucune campagne</Text>
            </View>
          ) : (
            data.recentCampaigns.slice(0, 4).map((campaign) => {
              const statusConfig = getStatusConfig(campaign.status);
              return (
                <Pressable key={campaign.id} style={({ pressed }) => ({ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, opacity: pressed ? 0.95 : 1 })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>{campaign.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>{campaign.total_recipients || 0} dest.</Text>
                        {campaign.created_at && (
                          <Text style={{ fontSize: 12, color: '#64748B' }}>
                            {new Date(campaign.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </Text>
                        )}
                        {campaign.total_delivered > 0 && (
                          <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                            {Math.round((campaign.total_delivered / campaign.total_recipients) * 100)}%
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={{ backgroundColor: statusConfig.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: statusConfig.color }}>{statusConfig.label}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
