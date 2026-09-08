import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';

function timeAgo(d: string | null): string {
  if (!d) return 'Jamais';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function WorkerCard({ title, subtitle, icon, iconColor, status, stats, lastRun, lastName, frequency }: {
  title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string;
  status: string; stats: { label: string; value: number }[]; lastRun: string | null; lastName?: string; frequency: string;
}) {
  const isActive = status === 'active';
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: iconColor + '15', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>{title}</Text>
            <Text style={{ fontSize: 11, color: '#64748B' }}>{subtitle}</Text>
          </View>
        </View>
        <View style={{ backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: isActive ? '#166534' : '#64748B' }}>{isActive ? 'Actif' : 'En veille'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        {stats.map((s) => (
          <View key={s.label} style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>{s.value}</Text>
            <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Details */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: '#64748B' }}>Dernière exécution</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{timeAgo(lastRun)}</Text>
        </View>
        {lastName && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Dernière action</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }} numberOfLines={1}>{lastName}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: '#64748B' }}>Fréquence</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{frequency}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AdminWorkersTab() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const d = await api.getWorkersStatus();
      setData(d);
    } catch {} finally { setIsLoading(false); setRefreshing(false); }
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
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B' }}>Workers</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Monitoring des processus</Text>
          </View>
          <Pressable onPress={loadData} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}>
            <Ionicons name="refresh" size={22} color="#EA580C" />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Scheduler */}
          <WorkerCard
            title="Scheduler"
            subtitle="Campagnes programmées"
            icon="calendar-outline"
            iconColor="#2563EB"
            status={data?.scheduler?.status || 'idle'}
            stats={[
              { label: 'En attente', value: data?.scheduler?.pending_campaigns || 0 },
              { label: 'Envoyées (24h)', value: data?.scheduler?.campaigns_last_24h || 0 },
            ]}
            lastRun={data?.scheduler?.last_run_at}
            lastName={data?.scheduler?.last_campaign_name}
            frequency="Toutes les 60s"
          />

          {/* Automation Worker */}
          <WorkerCard
            title="Automation Worker"
            subtitle="Envois automatiques"
            icon="flash-outline"
            iconColor="#D97706"
            status={data?.automation_worker?.status || 'idle'}
            stats={[
              { label: 'Automations actives', value: data?.automation_worker?.active_automations || 0 },
              { label: 'SMS envoyés (total)', value: data?.automation_worker?.total_sms_sent || 0 },
            ]}
            lastRun={data?.automation_worker?.last_run_at}
            lastName={data?.automation_worker?.last_automation_name}
            frequency="Toutes les 5 min"
          />

          {/* Global Stats 24h */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#CFFAFE', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="send" size={18} color="#0891B2" />
            </View>
            <View style={{ flex: 1, flexDirection: 'row', gap: 20 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>{data?.global?.messages_last_24h || 0}</Text>
                <Text style={{ fontSize: 10, color: '#64748B' }}>Messages (24h)</Text>
              </View>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#DC2626' }}>{data?.global?.messages_failed_24h || 0}</Text>
                <Text style={{ fontSize: 10, color: '#64748B' }}>Échoués (24h)</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          {data?.recent_activity && data.recent_activity.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12 }}>Activité récente</Text>
              {data.recent_activity
                .sort((a: any, b: any) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
                .slice(0, 8)
                .map((item: any, index: number) => (
                  <View key={index} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: item.type === 'campaign' ? '#DBEAFE' : '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Ionicons name={item.type === 'campaign' ? 'megaphone' : 'flash'} size={14} color={item.type === 'campaign' ? '#2563EB' : '#D97706'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 10, color: '#64748B' }}>{item.total_sent} envoyé(s){item.total_failed > 0 ? ` • ${item.total_failed} échoué(s)` : ''}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#94A3B8' }}>{timeAgo(item.executed_at)}</Text>
                  </View>
                ))}
            </View>
          )}

          {/* Instructions */}
          <View style={{ backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16, marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Ionicons name="information-circle-outline" size={20} color="#EA580C" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>Lancement des workers</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Les workers doivent être lancés sur le serveur :</Text>
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, gap: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>$ python run_scheduler.py</Text>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>$ python run_automations.py</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
