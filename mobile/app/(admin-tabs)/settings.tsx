import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';

export default function AdminSettingsTab() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <View style={{ paddingTop: 16, paddingBottom: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B' }}>Compte</Text>
          <Text style={{ fontSize: 13, color: '#64748B' }}>Paramètres administrateur</Text>
        </View>

        {/* Profile Card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <LinearGradient colors={['#EA580C', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>
                  {(user?.first_name?.[0] || 'A').toUpperCase()}{(user?.last_name?.[0] || '').toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>
                {user?.first_name || ''} {user?.last_name || ''}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B' }}>{user?.email}</Text>
              <View style={{ backgroundColor: '#FED7AA', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#EA580C' }}>Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>Rôle</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Super Administrateur</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>Statut</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Actif</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="calendar-outline" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>Membre depuis</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable onPress={handleLogout} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#FECACA' }}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#DC2626' }}>Se déconnecter</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
