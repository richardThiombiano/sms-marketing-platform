import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Href } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  subtitle: string;
  onPress: () => void;
}

function MenuItem({ icon, iconColor, label, subtitle, onPress }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: iconColor + '15', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>{label}</Text>
        <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </Pressable>
  );
}

export default function MoreScreen() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'superadmin';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#1E293B' }}>Plus</Text>
          <Text style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>Outils et paramètres</Text>
        </View>

        {/* Admin Section - Only for superadmin */}
        {isSuperAdmin && (
          <View style={{ marginTop: 20, marginHorizontal: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#EA580C', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Administration</Text>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#FED7AA' }}>
              <MenuItem
                icon="shield-checkmark-outline"
                iconColor="#EA580C"
                label="Dashboard Admin"
                subtitle="Vue d'ensemble de la plateforme"
                onPress={() => router.push('/(screens)/admin' as Href)}
              />
              <View style={{ height: 1, backgroundColor: '#FEF3C7', marginHorizontal: 16 }} />
              <MenuItem
                icon="business-outline"
                iconColor="#EA580C"
                label="Entreprises"
                subtitle="Gérer les tenants"
                onPress={() => router.push('/(screens)/admin/tenants' as Href)}
              />
              <View style={{ height: 1, backgroundColor: '#FEF3C7', marginHorizontal: 16 }} />
              <MenuItem
                icon="people-outline"
                iconColor="#EA580C"
                label="Utilisateurs"
                subtitle="Gérer tous les utilisateurs"
                onPress={() => router.push('/(screens)/admin/users' as Href)}
              />
              <View style={{ height: 1, backgroundColor: '#FEF3C7', marginHorizontal: 16 }} />
              <MenuItem
                icon="person-add-outline"
                iconColor="#EA580C"
                label="Inscriptions"
                subtitle="Demandes en attente"
                onPress={() => router.push('/(screens)/admin/registrations' as Href)}
              />
              <View style={{ height: 1, backgroundColor: '#FEF3C7', marginHorizontal: 16 }} />
              <MenuItem
                icon="hardware-chip-outline"
                iconColor="#EA580C"
                label="Workers"
                subtitle="Monitoring des processus"
                onPress={() => router.push('/(screens)/admin/workers' as Href)}
              />
            </View>
          </View>
        )}

        {/* Gestion Section */}
        <View style={{ marginTop: 20, marginHorizontal: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gestion</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <MenuItem
              icon="folder-open-outline"
              iconColor="#0891B2"
              label="Groupes"
              subtitle="Gérer vos groupes de contacts"
              onPress={() => router.push('/(screens)/groups' as Href)}
            />
            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 }} />
            <MenuItem
              icon="document-text-outline"
              iconColor="#EC4899"
              label="Templates"
              subtitle="Modèles de messages SMS"
              onPress={() => router.push('/(screens)/templates' as Href)}
            />
            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 }} />
            <MenuItem
              icon="flash-outline"
              iconColor="#F59E0B"
              label="Automatisations"
              subtitle="Programmation d'envois automatiques"
              onPress={() => router.push('/(screens)/automations' as Href)}
            />
          </View>
        </View>

        {/* Statistiques Section */}
        <View style={{ marginTop: 24, marginHorizontal: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Analyse</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <MenuItem
              icon="bar-chart-outline"
              iconColor="#6366F1"
              label="Statistiques"
              subtitle="Consommation et performance SMS"
              onPress={() => router.push('/(screens)/stats' as Href)}
            />
          </View>
        </View>

        {/* Compte Section */}
        <View style={{ marginTop: 24, marginHorizontal: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Compte</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            {user?.role === 'owner' && (
              <>
                <MenuItem
                  icon="card-outline"
                  iconColor="#EA580C"
                  label="Facturation"
                  subtitle="Abonnement et recharges"
                  onPress={() => router.push('/(screens)/billing' as Href)}
                />
                <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 }} />
              </>
            )}
            <MenuItem
              icon="settings-outline"
              iconColor="#64748B"
              label="Paramètres"
              subtitle="Profil, sécurité, entreprise"
              onPress={() => router.push('/(screens)/settings' as Href)}
            />
            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 }} />
            <MenuItem
              icon="notifications-outline"
              iconColor="#2563EB"
              label="Notifications"
              subtitle="Gérer vos notifications"
              onPress={() => router.push('/(screens)/notifications' as Href)}
            />
          </View>
        </View>

        {/* Déconnexion */}
        <View style={{ marginTop: 24, marginHorizontal: 20 }}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            })}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#DC2626', marginLeft: 8 }}>Se déconnecter</Text>
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: '#94A3B8' }}>SMS Pro Mobile v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
