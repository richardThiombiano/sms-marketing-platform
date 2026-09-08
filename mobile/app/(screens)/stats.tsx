import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Stats {
  period: string;
  summary: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    delivery_rate: number;
    by_type: { marketing: number; transactional: number, promotional: number, birthday: number, reminder: number };
  };
  chart_data: { date: string; total: number; sent: number; failed: number }[];
}

const periods = [
  { value: '7d', label: '7j' },
  { value: '30d', label: '30j' },
  { value: '90d', label: '90j' },
  { value: '12m', label: '12m' },
];

function StatBox({ label, value, icon, color }: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const smsBalance = useAuthStore((s) => s.smsBalance);

  const loadStats = async () => {
    try {
      const data = await api.getSmsStats(period);
      setStats(data);
    } catch {} finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadStats();
  }, [period]);

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  const maxChartValue = stats?.chart_data?.length
    ? Math.max(...stats.chart_data.map((d) => d.total), 1)
    : 1;

  if (isLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#4F46E5" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={24} color="#1E293B" /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Statistiques</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Consommation et performance SMS</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 8 }}>
          {periods.map((p) => (
            <Pressable key={p.value} onPress={() => setPeriod(p.value)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: period === p.value ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: period === p.value ? '#4F46E5' : '#E2E8F0', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: period === p.value ? '#FFFFFF' : '#64748B' }}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Balance Card */}
        {smsBalance && (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="diamond" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Solde actuel</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>{smsBalance.amount.toLocaleString()} {smsBalance.currency}</Text>
            </View>
          </View>
        )}

        {/* Stats Cards */}
        {stats && (
          <>
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <StatBox label="Total envoyés" value={stats.summary.total.toLocaleString()} icon="send-outline" color="#4F46E5" />
                <StatBox label="Délivrés" value={stats.summary.delivered.toLocaleString()} icon="checkmark-done-circle-outline" color="#059669" />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <StatBox label="Échoués" value={stats.summary.failed.toLocaleString()} icon="close-circle-outline" color="#DC2626" />
                <StatBox label="Taux délivrance" value={`${stats.summary.delivery_rate.toFixed(1)}%`} icon="trending-up-outline" color="#7C3AED" />
              </View>
            </View>

            {/* Type breakdown */}
            <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12 }}>Par type</Text>
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#4F46E5' }} />
                    <Text style={{ fontSize: 13, color: '#475569' }}>Marketing</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{stats.summary.by_type.marketing.toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#059669' }} />
                    <Text style={{ fontSize: 13, color: '#475569' }}>Transactionnel</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{stats.summary.by_type.transactional.toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#E11D48' }} />
                    <Text style={{ fontSize: 13, color: '#475569' }}>Promotionnel</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{stats.summary.by_type.promotional.toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View  style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#9333EA' }}   />
                    <Text style={{ fontSize: 13, color: '#475569' }}>Anniversaire</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{stats.summary.by_type.birthday.toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#D97706' }} />
                    <Text style={{ fontSize: 13, color: '#475569' }}>Rappel</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{stats.summary.by_type.reminder.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* Simple Bar Chart */}
            {stats.chart_data && stats.chart_data.length > 0 && (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12 }}>Évolution</Text>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 }}>
                      {stats.chart_data.slice(-20).map((d, i) => {
                        const height = Math.max((d.total / maxChartValue) * 100, 4);
                        const failedHeight = d.failed > 0 ? Math.max((d.failed / maxChartValue) * 100, 2) : 0;
                        return (
                          <View key={i} style={{ alignItems: 'center', width: 20 }}>
                            <View style={{ width: 12, height, backgroundColor: '#4F46E5', borderRadius: 4, marginBottom: 1 }} />
                            {failedHeight > 0 && <View style={{ width: 12, height: failedHeight, backgroundColor: '#FCA5A5', borderRadius: 2 }} />}
                            <Text style={{ fontSize: 8, color: '#94A3B8', marginTop: 4, transform: [{ rotate: '-45deg' }] }}>
                              {new Date(d.date).getDate()}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#4F46E5' }} />
                      <Text style={{ fontSize: 10, color: '#64748B' }}>Envoyés</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#FCA5A5' }} />
                      <Text style={{ fontSize: 10, color: '#64748B' }}>Échoués</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
