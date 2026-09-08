import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function getTypeIcon(type: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case 'campaign': return { icon: 'megaphone-outline', color: '#4F46E5' };
    case 'sms': return { icon: 'chatbubble-outline', color: '#059669' };
    case 'system': return { icon: 'information-circle-outline', color: '#D97706' };
    case 'alert': return { icon: 'warning-outline', color: '#DC2626' };
    default: return { icon: 'notifications-outline', color: '#64748B' };
  }
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications({ page: 1, page_size: 50 });
      setNotifications(data.items);
    } catch {} finally { setIsLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadNotifications(); }, []);

  const onRefresh = () => { setRefreshing(true); loadNotifications(); };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  if (isLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#4F46E5" /></SafeAreaView>;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={24} color="#1E293B" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Notifications</Text>
          {unreadCount > 0 && <Text style={{ fontSize: 12, color: '#4F46E5' }}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#4F46E5' }}>Tout lire</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40 }}><Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" /><Text style={{ fontSize: 15, color: '#94A3B8', marginTop: 12 }}>Aucune notification</Text></View>}
        renderItem={({ item }) => {
          const { icon, color } = getTypeIcon(item.type);
          return (
            <Pressable
              onPress={() => handleRead(item.id)}
              style={({ pressed }) => ({
                flexDirection: 'row', backgroundColor: item.is_read ? '#FFFFFF' : '#EEF2FF', borderRadius: 14, padding: 14, marginBottom: 8,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name={icon} size={18} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: item.is_read ? '500' : '700', color: '#1E293B', marginBottom: 2 }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: '#64748B' }} numberOfLines={2}>{item.message}</Text>
                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
              {!item.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5', marginTop: 4 }} />}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
