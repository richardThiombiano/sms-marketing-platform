import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(identifier.trim(), password);
      const user = useAuthStore.getState().user;
      if (user?.role === 'superadmin') {
        router.replace('/(admin-tabs)' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const message = err?.message || 'Erreur de connexion';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {/* Gradient Header */}
          <LinearGradient
            colors={['#4F46E5', '#7C3AED', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: 60, paddingBottom: 80, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
          >
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="chatbubbles" size={36} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>SMS Pro</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Plateforme SMS Marketing</Text>
          </LinearGradient>

          {/* Form */}
          <View style={{ paddingHorizontal: 24, marginTop: -40 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>Connexion</Text>
              <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>Accédez à votre tableau de bord</Text>

              {/* Error */}
              {error ? (
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={{ fontSize: 13, color: '#DC2626', marginLeft: 8, flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              {/* Identifier Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Identifiant</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Ionicons name="person-outline" size={20} color="#94A3B8" />
                  <TextInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="Nom de connexion ou email"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Mot de passe</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                    style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password */}
              <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)} style={({ pressed }) => ({ alignSelf: 'flex-end', marginBottom: 24, opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#4F46E5' }}>Mot de passe oublié ?</Text>
              </Pressable>

              {/* Login Button */}
              <Pressable onPress={handleLogin} disabled={isLoading} style={({ pressed }) => ({ opacity: pressed || isLoading ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Se connecter</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Register Link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28 }}>
              <Text style={{ fontSize: 14, color: '#64748B' }}>Pas encore de compte ? </Text>
              <Pressable onPress={() => router.push('/(auth)/register' as any)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#4F46E5' }}>S'inscrire</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
