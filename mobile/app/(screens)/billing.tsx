import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function BillingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  // Payment form state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [step, setStep] = useState<'choice' | 'ussd' | 'reference'>('choice');
  const [paymentType, setPaymentType] = useState<'subscription' | 'recharge'>('subscription');
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState('25000');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [subData, payData, paymentsData] = await Promise.all([
        api.getSubscription().catch(() => null),
        api.getPaymentInfo().catch(() => null),
        api.getBillingPayments({ page: 1, page_size: 30 }).catch(() => ({ items: [] })),
      ]);
      setSubscription(subData);
      setPaymentInfo(payData);
      setPayments(paymentsData?.items || []);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitPayment() {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      await api.createPaymentRequest({
        type: paymentType,
        amount: parseInt(amount),
        reference: reference.trim(),
      });
      Alert.alert(
        'Paiement enregistré',
        'Votre paiement a bien été pris en compte et sera activé sous un délai de 15 minutes après vérification.',
        [{ text: 'OK' }]
      );
      setShowPaymentModal(false);
      setStep('choice');
      setReference('');
      setMonths(1);
      await loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  }

  const subscriptionAmount = paymentInfo?.subscription_amount || 25000;
  const ussdCode = `*144*10*55234342*${amount}#`;
  const hasActiveSubscription = subscription && !subscription.is_expired;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </Pressable>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B' }}>Facturation</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Abonnement et recharges</Text>
          </View>
        </View>

        {/* Subscription Status */}
        <View style={{ marginHorizontal: 20, marginTop: 16 }}>
          <View style={{
            backgroundColor: subscription && !subscription.is_expired ? '#F0FDF4' : '#FEF2F2',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: subscription && !subscription.is_expired ? '#BBF7D0' : '#FECACA',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: subscription && !subscription.is_expired ? '#DCFCE7' : '#FEE2E2',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <Ionicons
                  name={subscription && !subscription.is_expired ? 'checkmark-circle' : 'alert-circle'}
                  size={22}
                  color={subscription && !subscription.is_expired ? '#16A34A' : '#DC2626'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
                  {!subscription ? 'Aucun abonnement' : subscription.is_expired ? 'Abonnement expiré' : 'Abonnement actif'}
                </Text>
                {subscription && !subscription.is_expired && (
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Expire le {new Date(subscription.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' — '}{subscription.days_remaining}j restants
                  </Text>
                )}
                {!subscription && (
                  <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 2 }}>
                    Effectuez un paiement pour activer
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Payment Button */}
        <View style={{ marginHorizontal: 20, marginTop: 20 }}>
          <Pressable
            onPress={() => setShowPaymentModal(true)}
            style={({ pressed }) => ({
              backgroundColor: '#4F46E5',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Effectuer un paiement</Text>
          </Pressable>
        </View>

        {/* Payment History */}
        <View style={{ marginTop: 28, marginHorizontal: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 }}>Historique des paiements</Text>
          {payments.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={36} color="#CBD5E1" />
              <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>Aucun paiement</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}>
              {payments.map((p, idx) => (
                <View key={p.id}>
                  {idx > 0 && <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: p.status === 'confirmed' ? '#DCFCE7' : p.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                      alignItems: 'center', justifyContent: 'center', marginRight: 12,
                    }}>
                      <Ionicons
                        name={p.status === 'confirmed' ? 'checkmark-circle' : p.status === 'rejected' ? 'close-circle' : 'time'}
                        size={18}
                        color={p.status === 'confirmed' ? '#16A34A' : p.status === 'rejected' ? '#DC2626' : '#D97706'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>
                        {p.amount?.toLocaleString()} FCFA
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                        {p.type === 'subscription' ? 'Abonnement' : 'Recharge'}
                        {p.reference && ` — ${p.reference}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: p.status === 'confirmed' ? '#16A34A' : p.status === 'rejected' ? '#DC2626' : '#D97706' }}>
                        {p.status === 'confirmed' ? 'Confirmé' : p.status === 'rejected' ? 'Rejeté' : 'En attente'}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Paiement Orange Money</Text>
            <Pressable onPress={() => { setShowPaymentModal(false); setStep('choice'); }}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Step 1: Choice */}
            {step === 'choice' && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 12 }}>Type de paiement</Text>
                <Pressable
                  onPress={() => { setPaymentType('subscription'); setAmount((subscriptionAmount * months).toString()); }}
                  style={{ padding: 16, borderRadius: 12, borderWidth: 2, borderColor: paymentType === 'subscription' ? '#4F46E5' : '#E2E8F0', backgroundColor: paymentType === 'subscription' ? '#EEF2FF' : '#FFF', marginBottom: 10 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>Abonnement</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{subscriptionAmount.toLocaleString()} FCFA / mois</Text>
                </Pressable>
                <Pressable
                  onPress={() => { if (hasActiveSubscription) { setPaymentType('recharge'); setAmount(''); } }}
                  disabled={!hasActiveSubscription}
                  style={{ padding: 16, borderRadius: 12, borderWidth: 2, borderColor: paymentType === 'recharge' ? '#4F46E5' : '#E2E8F0', backgroundColor: paymentType === 'recharge' ? '#EEF2FF' : '#FFF', opacity: hasActiveSubscription ? 1 : 0.5, marginBottom: 16 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>Recharge crédits SMS</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {hasActiveSubscription ? 'Montant libre (min. 1 000 FCFA)' : 'Abonnement actif requis'}
                  </Text>
                </Pressable>

                {paymentType === 'subscription' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Durée</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[1, 2, 3, 6, 12].map((m) => (
                        <Pressable
                          key={m}
                          onPress={() => { setMonths(m); setAmount((subscriptionAmount * m).toString()); }}
                          style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: months === m ? '#4F46E5' : '#E2E8F0', backgroundColor: months === m ? '#EEF2FF' : '#FFF' }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: months === m ? '#4F46E5' : '#64748B' }}>{m} mois</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={{ fontSize: 13, color: '#4F46E5', fontWeight: '600', marginTop: 8 }}>
                      Total : {(subscriptionAmount * months).toLocaleString()} FCFA
                    </Text>
                  </View>
                )}

                {paymentType === 'recharge' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Montant (FCFA)</Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      placeholder="Ex: 10000"
                      style={{ height: 44, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, fontSize: 15, backgroundColor: '#FFF' }}
                    />
                  </View>
                )}

                <Pressable
                  onPress={() => setStep('ussd')}
                  disabled={!amount || parseInt(amount) < (paymentType === 'recharge' ? 1000 : subscriptionAmount)}
                  style={({ pressed }) => ({ backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: pressed || !amount ? 0.7 : 1 })}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Continuer</Text>
                </Pressable>
              </View>
            )}

            {/* Step 2: USSD */}
            {step === 'ussd' && (
              <View>
                <View style={{ backgroundColor: '#FFF7ED', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#FED7AA', marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#9A3412', marginBottom: 12 }}>Composez ce code :</Text>
                  <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#FDBA74' }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{ussdCode}</Text>
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 12, color: '#9A3412', marginBottom: 4 }}>1. Composez le code ci-dessus</Text>
                    <Text style={{ fontSize: 12, color: '#9A3412', marginBottom: 4 }}>2. Confirmez avec votre code secret</Text>
                    <Text style={{ fontSize: 12, color: '#9A3412' }}>3. Notez la référence reçue par SMS</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>Montant</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>{parseInt(amount).toLocaleString()} FCFA</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => setStep('choice')} style={{ flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Retour</Text>
                  </Pressable>
                  <Pressable onPress={() => setStep('reference')} style={({ pressed }) => ({ flex: 1, backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>J'ai payé</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Step 3: Reference */}
            {step === 'reference' && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Référence de transaction</Text>
                <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>Saisissez la référence reçue par SMS après votre paiement</Text>
                <TextInput
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Ex: MP260801.1234.A56789"
                  autoCapitalize="none"
                  style={{ height: 48, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, fontSize: 15, backgroundColor: '#FFF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 16 }}
                />

                <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Récapitulatif</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 4 }}>
                    {paymentType === 'subscription' ? 'Abonnement' : 'Recharge'} — {parseInt(amount).toLocaleString()} FCFA
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => setStep('ussd')} style={{ flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Retour</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!reference.trim()) { Alert.alert('Erreur', 'Veuillez saisir la référence'); return; }
                      setShowConfirm(true);
                    }}
                    disabled={isSubmitting}
                    style={({ pressed }) => ({ flex: 1, backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: pressed || isSubmitting ? 0.7 : 1 })}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>Confirmer</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Confirm Alert — inside payment modal */}
          {showConfirm && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Ionicons name="phone-portrait-outline" size={24} color="#EA580C" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>Confirmer votre paiement</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
                    Vous confirmez avoir effectué un paiement de{' '}
                    <Text style={{ fontWeight: '700', color: '#1E293B' }}>{parseInt(amount).toLocaleString()} FCFA</Text>
                    {' '}avec la référence{' '}
                    <Text style={{ fontWeight: '700', color: '#1E293B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{reference}</Text> ?
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => setShowConfirm(false)}
                    style={{ flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmitPayment}
                    style={({ pressed }) => ({ flex: 1, backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>Oui, confirmer</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
