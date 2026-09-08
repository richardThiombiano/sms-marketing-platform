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
import { api } from '@/lib/api';

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [senderId, setSenderId] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleStep1 = () => {
    if (!companyName || !email || !phone || !senderId) {
      setError('Remplissez tous les champs obligatoires');
      return;
    }
    if (senderId.length < 3 || senderId.length > 11) {
      setError('Le Sender ID doit contenir entre 3 et 11 caractères');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!username || !firstName || !password) {
      setError('Remplissez tous les champs obligatoires');
      return;
    }
    if (username.length < 3 || !/^[a-z0-9._]+$/.test(username)) {
      setError('Username : min 3 caractères (lettres, chiffres, points, underscores)');
      return;
    }
    const { valid, error: pwdError } = require('@/lib/password-validation').validatePassword(password);
    if (!valid) {
      setError(pwdError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.register({
        company_name: companyName,
        email,
        phone,
        username,
        first_name: firstName,
        last_name: lastName,
        password,
        sender_id: senderId,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  // Écran succès
  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Ionicons name="checkmark-circle" size={36} color="#16A34A" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Inscription enregistrée</Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
            Votre demande a été enregistrée avec succès. Vous recevrez un SMS de confirmation une fois votre compte validé.
          </Text>
          <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, marginTop: 20, width: '100%' }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>Entreprise : <Text style={{ fontWeight: '600', color: '#1E293B' }}>{companyName}</Text></Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>Nom de connexion : <Text style={{ fontWeight: '600', color: '#1E293B' }}>{username}</Text></Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>Nom de l'expéditeur souhaité : <Text style={{ fontWeight: '600', color: '#1E293B' }}>{senderId}</Text></Text>
          </View>
          <Pressable onPress={() => router.replace('/(auth)/login')} style={({ pressed }) => ({ marginTop: 24, opacity: pressed ? 0.8 : 1, width: '100%' })}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Retour à la connexion</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {/* Header gradient */}
          <LinearGradient
            colors={['#4F46E5', '#7C3AED', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: 50, paddingBottom: 60, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
          >
            <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="chatbubbles" size={30} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>SMS Pro</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Créer votre compte</Text>
          </LinearGradient>

          {/* Form */}
          <View style={{ paddingHorizontal: 24, marginTop: -30 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10 }}>
              {/* Progress */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>1</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#4F46E5', fontWeight: '600', marginTop: 4 }}>Entreprise</Text>
                </View>
                <View style={{ flex: 1, height: 2, backgroundColor: step >= 2 ? '#4F46E5' : '#E2E8F0', marginHorizontal: 4 }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: step >= 2 ? '#4F46E5' : '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: step >= 2 ? '#FFF' : '#94A3B8' }}>2</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: step >= 2 ? '#4F46E5' : '#94A3B8', fontWeight: '600', marginTop: 4 }}>Profil</Text>
                </View>
              </View>

              {/* Error */}
              {error ? (
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={{ fontSize: 13, color: '#DC2626', marginLeft: 8, flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              {/* Step 1 */}
              {step === 1 && (
                <View>
                  <InputField label="Nom de l'entreprise *" icon="business-outline" value={companyName} onChangeText={setCompanyName} placeholder="Mon entreprise" />
                  <InputField label="Email *" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="contact@entreprise.com" keyboardType="email-address" />
                  <InputField label="Téléphone *" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="+226 70 00 00 00" keyboardType="phone-pad" />
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nom de l'expéditeur souhaité *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12 }}>
                      <Ionicons name="radio-outline" size={20} color="#94A3B8" />
                      <TextInput
                        value={senderId}
                        onChangeText={(v) => setSenderId(v.replace(/[^a-zA-Z0-9 ]/g, ''))}
                        placeholder="Nom affiché comme expéditeur"
                        maxLength={11}
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }}
                      />
                    </View>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Nom expéditeur SMS (3 à 11 caractères)</Text>
                  </View>

                  <Pressable onPress={handleStep1} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                    <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Continuer</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <View>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Username *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12 }}>
                      <Ionicons name="at-outline" size={20} color="#94A3B8" />
                      <TextInput
                        value={username}
                        onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                        placeholder="nom de connexion"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }}
                      />
                    </View>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Lettres minuscules, chiffres, points, underscores</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Prénom *</Text>
                      <TextInput value={firstName} onChangeText={setFirstName} placeholder="Mohamed" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1E293B' }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nom</Text>
                      <TextInput value={lastName} onChangeText={setLastName} placeholder="Thiombiano" placeholderTextColor="#94A3B8" style={{ backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1E293B' }} />
                    </View>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Mot de passe *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12 }}>
                      <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                      <TextInput value={password} onChangeText={setPassword} placeholder="Min. 6 caractères" placeholderTextColor="#94A3B8" secureTextEntry={!showPassword} style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }} />
                      <Pressable onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Confirmer *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12 }}>
                      <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                      <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirmez" placeholderTextColor="#94A3B8" secureTextEntry style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }} />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable onPress={() => { setStep(1); setError(''); }} style={({ pressed }) => ({ flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B' }}>Retour</Text>
                    </Pressable>
                    <Pressable onPress={handleSubmit} disabled={isLoading} style={({ pressed }) => ({ flex: 1, opacity: pressed || isLoading ? 0.8 : 1 })}>
                      <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                        {isLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Créer mon compte</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Login link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ fontSize: 14, color: '#64748B' }}>Déjà un compte ? </Text>
              <Pressable onPress={() => router.replace('/(auth)/login')} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#4F46E5' }}>Se connecter</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Composant InputField réutilisable
function InputField({ label, icon, value, onChangeText, placeholder, keyboardType }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; value: string; onChangeText: (v: string) => void; placeholder: string; keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12 }}>
        <Ionicons name={icon} size={20} color="#94A3B8" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }}
        />
      </View>
    </View>
  );
}
