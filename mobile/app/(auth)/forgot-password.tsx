import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'reset' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await api.forgotPassword(email.trim());
      setMessage(result.message);
      if (result.reset_token) {
        setResetToken(result.reset_token);
      }
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim() || !newPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await api.resetPassword(resetToken.trim(), newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation');
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
            style={{ paddingTop: 60, paddingBottom: 60, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
          >
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="key-outline" size={32} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>
              {step === 'email' ? 'Mot de passe oublié' : step === 'reset' ? 'Réinitialisation' : 'Succès'}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 40 }}>
              {step === 'email'
                ? 'Un code sera envoyé par SMS au numéro de votre entreprise'
                : step === 'reset'
                ? 'Saisissez le token reçu et votre nouveau mot de passe'
                : 'Votre mot de passe a été mis à jour'}
            </Text>
          </LinearGradient>

          {/* Content */}
          <View style={{ paddingHorizontal: 24, marginTop: -20 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10 }}>

              {/* Error */}
              {error ? (
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={{ fontSize: 13, color: '#DC2626', marginLeft: 8, flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              {/* Message info */}
              {message && step === 'reset' ? (
                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={{ fontSize: 12, color: '#16A34A', marginLeft: 8, flex: 1 }}>{message}</Text>
                </View>
              ) : null}

              {/* Step: Email */}
              {step === 'email' && (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Adresse email</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24 }}>
                    <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="votre@email.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }}
                    />
                  </View>

                  {/* Send Button */}
                  <Pressable onPress={handleRequestReset} disabled={isLoading} style={({ pressed }) => ({ opacity: pressed || isLoading ? 0.8 : 1 })}>
                    <LinearGradient
                      colors={['#4F46E5', '#7C3AED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Envoyer le code</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              {/* Step: Reset */}
              {step === 'reset' && (
                <>
                  {/* Token */}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Token de réinitialisation</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 }}>
                    <Ionicons name="key-outline" size={20} color="#94A3B8" />
                    <TextInput
                      value={resetToken}
                      onChangeText={setResetToken}
                      placeholder="Collez le token reçu"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      style={{ flex: 1, marginLeft: 12, fontSize: 13, color: '#1E293B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
                    />
                  </View>

                  {/* New password */}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nouveau mot de passe</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 }}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
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

                  {/* Confirm password */}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Confirmer le mot de passe</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24 }}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      editable={!isLoading}
                      style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }}
                    />
                  </View>

                  {/* Reset Button */}
                  <Pressable onPress={handleResetPassword} disabled={isLoading} style={({ pressed }) => ({ opacity: pressed || isLoading ? 0.8 : 1 })}>
                    <LinearGradient
                      colors={['#4F46E5', '#7C3AED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Réinitialiser</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              {/* Step: Success */}
              {step === 'success' && (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Ionicons name="checkmark-circle" size={36} color="#16A34A" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>Mot de passe réinitialisé</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24 }}>
                    Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                  </Text>
                  <Pressable onPress={() => router.replace('/(auth)/login')} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, width: '100%' })}>
                    <LinearGradient
                      colors={['#4F46E5', '#7C3AED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                    >
                      <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Se connecter</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Back to login link */}
            {step !== 'success' && (
              <Pressable
                onPress={() => step === 'email' ? router.back() : setStep('email')}
                style={({ pressed }) => ({ alignSelf: 'center', marginTop: 24, opacity: pressed ? 0.6 : 1 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="arrow-back" size={16} color="#4F46E5" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#4F46E5' }}>
                    {step === 'email' ? 'Retour à la connexion' : 'Retour'}
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
