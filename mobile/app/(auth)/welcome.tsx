import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const features = [
  { icon: 'chatbubbles-outline' as const, title: 'Campagnes SMS', desc: 'Envois ciblés et personnalisés' },
  { icon: 'people-outline' as const, title: 'Gestion contacts', desc: 'Import, groupes, segmentation' },
  { icon: 'flash-outline' as const, title: 'Automations', desc: 'Anniversaires, rappels, bienvenue' },
  { icon: 'bar-chart-outline' as const, title: 'Statistiques', desc: 'Suivi en temps réel' },
];

export default function WelcomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        >
          {/* Hero Section */}
          <View style={{ alignItems: 'center', paddingTop: 50, paddingHorizontal: 24 }}>
            {/* Logo */}
            <View style={{ position: 'relative', marginBottom: 32 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 24,
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)',
              }}>
                <Ionicons name="chatbubbles" size={40} color="#A78BFA" />
              </View>
              {/* Glow */}
              <View style={{
                position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
                backgroundColor: 'rgba(139, 92, 246, 0.08)', borderRadius: 60,
              }} />
            </View>

            {/* Title */}
            <Text style={{
              fontSize: 36, fontWeight: '900', color: '#FFFFFF',
              textAlign: 'center', letterSpacing: -0.5,
            }}>
              SMS Pro
            </Text>
            <Text style={{
              fontSize: 16, color: 'rgba(255,255,255,0.4)',
              textAlign: 'center', marginTop: 8, lineHeight: 22,
              maxWidth: 280,
            }}>
              Transformez chaque SMS en opportunité pour votre business
            </Text>
          </View>

          {/* Features */}
          <View style={{ paddingHorizontal: 20, marginTop: 40 }}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              padding: 20,
            }}>
              {features.map((f, i) => (
                <View key={f.title} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingVertical: 14,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: 'rgba(255,255,255,0.05)',
                }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={f.icon} size={20} color="#A78BFA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{f.title}</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{f.desc}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color="#34D399" />
                </View>
              ))}
            </View>
          </View>

          {/* Pricing badge */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <View style={{
              backgroundColor: 'rgba(139, 92, 246, 0.08)',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(139, 92, 246, 0.2)',
              padding: 20,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 12, color: '#A78BFA', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                Abonnement mensuel
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 4 }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: '#FFFFFF' }}>25 000</Text>
                <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>FCFA</Text>
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                Toutes fonctionnalités incluses
              </Text>
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={{ paddingHorizontal: 20, marginTop: 32, gap: 12 }}>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
            >
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16, paddingVertical: 18,
                  alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'row', gap: 8,
                  shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  Créer mon compte
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(auth)/login')}
              style={({ pressed }) => ({
                borderRadius: 16, paddingVertical: 18,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                J'ai déjà un compte
              </Text>
            </Pressable>
          </View>

          {/* Trust */}
          <View style={{ alignItems: 'center', marginTop: 28, gap: 12, paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
              <TrustBadge text="Inscription gratuite" />
              <TrustBadge text="Activation rapide" />
              <TrustBadge text="Sans engagement" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TrustBadge({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name="checkmark-circle" size={14} color="#34D399" />
      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{text}</Text>
    </View>
  );
}
