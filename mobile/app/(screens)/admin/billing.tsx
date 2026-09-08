import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl,
  Modal, TextInput, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/lib/api';

type TabKey = 'overview' | 'pending' | 'subscriptions' | 'recharges';

interface BillingStats {
  active_subscriptions: number;
  expired_subscriptions: number;
  monthly_revenue: number;
  monthly_recharges: number;
  pending_recharges: number;
  currency: string;
}

export default function AdminBillingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // Form state
  const [selectedTenant, setSelectedTenant] = useState('');
  const [months, setMonths] = useState(1);
  const [paymentRef, setPaymentRef] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeRef, setRechargeRef] = useState('');
  const [rechargeNotes, setRechargeNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [statsData, subsData, rechData, tenantsData, pendingData] = await Promise.all([
        api.getAdminBillingStats().catch(() => null),
        api.getAdminSubscriptions({ page: 1, page_size: 50 }).catch(() => ({ items: [] })),
        api.getAdminRecharges({ page: 1, page_size: 50 }).catch(() => ({ items: [] })),
        api.getAdminTenants({ page: 1, page_size: 100 }).catch(() => ({ items: [] })),
        api.getAdminPendingPayments({ page: 1, page_size: 50 }).catch(() => ({ items: [] })),
      ]);
      setStats(statsData);
      setSubscriptions(subsData?.items || []);
      setRecharges(rechData?.items || []);
      setTenants(tenantsData?.items || []);
      setPendingPayments(pendingData?.items || []);
    } catch {} finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleActivateSubscription = async () => {
    if (!selectedTenant) return;
    setActionLoading(true);
    try {
      await api.activateSubscription({
        tenant_id: selectedTenant,
        months,
        payment_method: 'orange_money',
        payment_reference: paymentRef || undefined,
      });
      setShowActivateModal(false);
      setSelectedTenant('');
      setMonths(1);
      setPaymentRef('');
      await loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur lors de l\'activation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterRecharge = async () => {
    if (!selectedTenant || !rechargeAmount) return;
    setActionLoading(true);
    try {
      await api.registerRecharge({
        tenant_id: selectedTenant,
        amount: parseInt(rechargeAmount),
        method: 'orange_money',
        reference: rechargeRef || undefined,
        notes: rechargeNotes || undefined,
      });
      setShowRechargeModal(false);
      setSelectedTenant('');
      setRechargeAmount('');
      setRechargeRef('');
      setRechargeNotes('');
      await loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewSubscription = async (subId: string) => {
    setActionLoading(true);
    try {
      await api.renewSubscription(subId, { months: 1 });
      await loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur lors du renouvellement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = (subId: string) => {
    Alert.alert('Résilier', 'Êtes-vous sûr de vouloir résilier cet abonnement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Résilier', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          await api.cancelSubscription(subId);
          await loadData();
        } catch (e: any) {
          Alert.alert('Erreur', e.message || 'Erreur');
        } finally {
          setActionLoading(false);
        }
      }},
    ]);
  };

  const handleConfirmPayment = (paymentId: string, payment?: any) => {
    const msg = payment
      ? `Voulez-vous valider ce paiement de ${payment.amount?.toLocaleString()} FCFA (${payment.type === 'subscription' ? 'Abonnement' : 'Recharge'}) de ${payment.tenant_name || 'ce tenant'} ?\n\nCette action est irréversible.`
      : 'Êtes-vous sûr de vouloir valider ce paiement ? Cette action est irréversible.';

    Alert.alert('Confirmer le paiement', msg, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Valider', onPress: async () => {
        setActionLoading(true);
        try {
          await api.confirmPayment(paymentId);
          await loadData();
        } catch (e: any) {
          Alert.alert('Erreur', e.message || 'Erreur');
        } finally {
          setActionLoading(false);
        }
      }},
    ]);
  };

  const handleRejectPayment = (paymentId: string) => {
    Alert.alert('Rejeter', 'Êtes-vous sûr de vouloir rejeter ce paiement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Rejeter', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          await api.rejectPayment(paymentId);
          await loadData();
        } catch (e: any) {
          Alert.alert('Erreur', e.message || 'Erreur');
        } finally {
          setActionLoading(false);
        }
      }},
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#EA580C" />
      </SafeAreaView>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Aperçu' },
    { key: 'pending', label: `Demandes (${pendingPayments.length})` },
    { key: 'subscriptions', label: 'Abonnements' },
    { key: 'recharges', label: 'Recharges' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#1E293B" />
            </Pressable>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>Facturation</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Abonnements & recharges SMS</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowActivateModal(true)}
            style={{ backgroundColor: '#EA580C', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </Pressable>
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <StatCard icon="checkmark-circle" label="Actifs" value={stats.active_subscriptions} color="#10B981" />
              <StatCard icon="alert-circle" label="Expirés" value={stats.expired_subscriptions} color="#EF4444" />
              <StatCard icon="time" label="En attente" value={stats.pending_recharges} color="#F59E0B" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard icon="trending-up" label="Revenu/mois" value={`${(stats.monthly_revenue || 0).toLocaleString()} F`} color="#3B82F6" />
              <StatCard icon="arrow-up-circle" label="Recharges/mois" value={`${(stats.monthly_recharges || 0).toLocaleString()} F`} color="#8B5CF6" />
            </View>
          </View>
        )}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: activeTab === tab.key ? '#EA580C' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: activeTab === tab.key ? '#EA580C' : '#E2E8F0',
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: activeTab === tab.key ? '#FFFFFF' : '#64748B',
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Recent subscriptions */}
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 12 }}>Derniers abonnements</Text>
              {subscriptions.slice(0, 5).map((sub) => (
                <SubscriptionItem key={sub.id} sub={sub} />
              ))}
              {subscriptions.length === 0 && (
                <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 16 }}>Aucun abonnement</Text>
              )}
            </View>

            {/* Recent recharges */}
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 12 }}>Dernières recharges</Text>
              {recharges.slice(0, 5).map((r) => (
                <RechargeItem key={r.id} recharge={r} />
              ))}
              {recharges.length === 0 && (
                <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 16 }}>Aucune recharge</Text>
              )}
            </View>
          </View>
        )}

        {/* Pending payments */}
        {activeTab === 'pending' && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>Demandes en attente</Text>
              <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 16 }}>Paiements soumis par les propriétaires</Text>
              {pendingPayments.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Ionicons name="checkmark-circle" size={40} color="#E2E8F0" />
                  <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Aucune demande en attente</Text>
                </View>
              ) : (
                pendingPayments.map((p: any) => (
                  <View key={p.id} style={{ backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <Ionicons name="time" size={16} color="#D97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{p.amount?.toLocaleString()} FCFA</Text>
                          <View style={{ backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B' }}>{p.type === 'subscription' ? 'Abonnement' : 'Recharge'}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{p.tenant_name} — Réf: {p.reference || '—'}</Text>
                        {p.created_at && <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 1 }}>{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Pressable
                        onPress={() => handleConfirmPayment(p.id, p)}
                        disabled={actionLoading}
                        style={{ flex: 1, backgroundColor: '#10B981', borderRadius: 8, paddingVertical: 8, alignItems: 'center', opacity: actionLoading ? 0.6 : 1 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF' }}>Confirmer</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRejectPayment(p.id)}
                        disabled={actionLoading}
                        style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5', opacity: actionLoading ? 0.6 : 1 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>Rejeter</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Subscriptions list */}
        {activeTab === 'subscriptions' && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>Tous les abonnements</Text>
                <Pressable onPress={() => setShowActivateModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add-circle" size={18} color="#EA580C" />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#EA580C' }}>Nouveau</Text>
                </Pressable>
              </View>
              {subscriptions.map((sub) => (
                <View key={sub.id} style={{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 10 }}>
                  <SubscriptionItem sub={sub} />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, paddingLeft: 42 }}>
                    <Pressable
                      onPress={() => handleRenewSubscription(sub.id)}
                      disabled={actionLoading}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
                    >
                      <Ionicons name="refresh" size={12} color="#10B981" />
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#10B981' }}>Renouveler</Text>
                    </Pressable>
                    {sub.status === 'active' && !sub.is_expired && (
                      <Pressable
                        onPress={() => handleCancelSubscription(sub.id)}
                        disabled={actionLoading}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
                      >
                        <Ionicons name="close-circle" size={12} color="#EF4444" />
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#EF4444' }}>Résilier</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
              {subscriptions.length === 0 && (
                <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 }}>Aucun abonnement</Text>
              )}
            </View>
          </View>
        )}

        {/* Recharges list */}
        {activeTab === 'recharges' && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>Toutes les recharges</Text>
                <Pressable onPress={() => setShowRechargeModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add-circle" size={18} color="#EA580C" />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#EA580C' }}>Nouvelle</Text>
                </Pressable>
              </View>
              {recharges.map((r) => (
                <RechargeItem key={r.id} recharge={r} />
              ))}
              {recharges.length === 0 && (
                <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 }}>Aucune recharge</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: Activer un abonnement */}
      <ActivateSubscriptionModal
        visible={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        tenants={tenants}
        selectedTenant={selectedTenant}
        setSelectedTenant={setSelectedTenant}
        months={months}
        setMonths={setMonths}
        paymentRef={paymentRef}
        setPaymentRef={setPaymentRef}
        actionLoading={actionLoading}
        onSubmit={handleActivateSubscription}
      />

      {/* Modal: Enregistrer une recharge */}
      <RegisterRechargeModal
        visible={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        tenants={tenants}
        selectedTenant={selectedTenant}
        setSelectedTenant={setSelectedTenant}
        rechargeAmount={rechargeAmount}
        setRechargeAmount={setRechargeAmount}
        rechargeRef={rechargeRef}
        setRechargeRef={setRechargeRef}
        rechargeNotes={rechargeNotes}
        setRechargeNotes={setRechargeNotes}
        actionLoading={actionLoading}
        onSubmit={handleRegisterRecharge}
      />
    </SafeAreaView>
  );
}


// ============================================
// COMPOSANTS UTILITAIRES
// ============================================

function StatCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number | string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '500', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function SubscriptionItem({ sub }: { sub: any }) {
  const isExpired = sub.is_expired;
  const statusColor = isExpired ? '#EF4444' : sub.status === 'cancelled' ? '#94A3B8' : '#10B981';
  const statusLabel = isExpired ? 'Expiré' : sub.status === 'cancelled' ? 'Résilié' : 'Actif';
  const bgColor = isExpired ? '#FEF2F2' : sub.status === 'cancelled' ? '#F8FAFC' : '#F0FDF4';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <Ionicons name={isExpired ? 'close-circle' : 'checkmark-circle'} size={16} color={statusColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }} numberOfLines={1}>{sub.tenant_name}</Text>
          <View style={{ backgroundColor: bgColor, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '600', color: statusColor }}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
          {sub.amount?.toLocaleString()} FCFA — Expire le {sub.end_date ? new Date(sub.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          {!isExpired && sub.days_remaining !== undefined && ` (${sub.days_remaining}j)`}
        </Text>
      </View>
    </View>
  );
}

function RechargeItem({ recharge }: { recharge: any }) {
  const statusColor = recharge.status === 'credited' ? '#10B981' : recharge.status === 'rejected' ? '#EF4444' : '#F59E0B';
  const statusLabel = recharge.status === 'credited' ? 'Crédité' : recharge.status === 'rejected' ? 'Rejeté' : 'En attente';
  const bgColor = recharge.status === 'credited' ? '#F0FDF4' : recharge.status === 'rejected' ? '#FEF2F2' : '#FFFBEB';
  const iconName: keyof typeof Ionicons.glyphMap = recharge.status === 'credited' ? 'arrow-up-circle' : recharge.status === 'rejected' ? 'close-circle' : 'time';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <Ionicons name={iconName} size={16} color={statusColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{recharge.amount?.toLocaleString()} FCFA</Text>
          <View style={{ backgroundColor: bgColor, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '600', color: statusColor }}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
          {recharge.tenant_name}{recharge.reference ? ` — Réf: ${recharge.reference}` : ''}{' — '}{recharge.created_at ? new Date(recharge.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// MODALS
// ============================================

function ActivateSubscriptionModal({ visible, onClose, tenants, selectedTenant, setSelectedTenant, months, setMonths, paymentRef, setPaymentRef, actionLoading, onSubmit }: {
  visible: boolean; onClose: () => void; tenants: any[]; selectedTenant: string; setSelectedTenant: (v: string) => void;
  months: number; setMonths: (v: number) => void; paymentRef: string; setPaymentRef: (v: string) => void;
  actionLoading: boolean; onSubmit: () => void;
}) {
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const selectedTenantName = tenants.find(t => t.id === selectedTenant)?.name || 'Sélectionner une entreprise';
  const monthOptions = [1, 2, 3, 6, 12];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Activer un abonnement</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Tenant picker */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entreprise</Text>
          <Pressable
            onPress={() => setShowTenantPicker(true)}
            style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 14, color: selectedTenant ? '#1E293B' : '#94A3B8' }}>{selectedTenantName}</Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </Pressable>

          {/* Duration */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Durée</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {monthOptions.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMonths(m)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: months === m ? '#EA580C' : '#FFF',
                  borderWidth: 1, borderColor: months === m ? '#EA580C' : '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: months === m ? '#FFF' : '#1E293B' }}>{m} mois</Text>
                <Text style={{ fontSize: 10, color: months === m ? '#FFF' : '#94A3B8', marginTop: 2 }}>{(25000 * m).toLocaleString()} F</Text>
              </Pressable>
            ))}
          </View>

          {/* Payment ref */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Réf. paiement (optionnel)</Text>
          <TextInput
            value={paymentRef}
            onChangeText={setPaymentRef}
            placeholder="Référence Orange Money..."
            placeholderTextColor="#94A3B8"
            style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 24 }}
          />

          {/* Submit */}
          <Pressable onPress={onSubmit} disabled={!selectedTenant || actionLoading} style={({ pressed }) => ({ opacity: pressed || !selectedTenant || actionLoading ? 0.7 : 1 })}>
            <LinearGradient colors={['#EA580C', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Activer l'abonnement</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>

        {/* Tenant picker modal */}
        <Modal visible={showTenantPicker} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Choisir une entreprise</Text>
              <Pressable onPress={() => setShowTenantPicker(false)}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
            </View>
            <FlatList
              data={tenants}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setSelectedTenant(item.id); setShowTenantPicker(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, backgroundColor: selectedTenant === item.id ? '#FFF7ED' : '#FFF', borderWidth: 1, borderColor: selectedTenant === item.id ? '#EA580C' : '#E2E8F0' }}
                >
                  <Ionicons name="business" size={18} color={selectedTenant === item.id ? '#EA580C' : '#64748B'} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{item.name}</Text>
                    {item.email && <Text style={{ fontSize: 11, color: '#64748B' }}>{item.email}</Text>}
                  </View>
                  {selectedTenant === item.id && <Ionicons name="checkmark-circle" size={20} color="#EA580C" />}
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

function RegisterRechargeModal({ visible, onClose, tenants, selectedTenant, setSelectedTenant, rechargeAmount, setRechargeAmount, rechargeRef, setRechargeRef, rechargeNotes, setRechargeNotes, actionLoading, onSubmit }: {
  visible: boolean; onClose: () => void; tenants: any[]; selectedTenant: string; setSelectedTenant: (v: string) => void;
  rechargeAmount: string; setRechargeAmount: (v: string) => void; rechargeRef: string; setRechargeRef: (v: string) => void;
  rechargeNotes: string; setRechargeNotes: (v: string) => void; actionLoading: boolean; onSubmit: () => void;
}) {
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const selectedTenantName = tenants.find(t => t.id === selectedTenant)?.name || 'Sélectionner une entreprise';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Enregistrer une recharge</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Tenant picker */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entreprise</Text>
          <Pressable
            onPress={() => setShowTenantPicker(true)}
            style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 14, color: selectedTenant ? '#1E293B' : '#94A3B8' }}>{selectedTenantName}</Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </Pressable>

          {/* Amount */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Montant (FCFA)</Text>
          <TextInput
            value={rechargeAmount}
            onChangeText={setRechargeAmount}
            placeholder="Ex: 50000"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }}
          />

          {/* Reference */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Réf. transaction (optionnel)</Text>
          <TextInput
            value={rechargeRef}
            onChangeText={setRechargeRef}
            placeholder="Référence Orange Money..."
            placeholderTextColor="#94A3B8"
            style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 16 }}
          />

          {/* Notes */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes (optionnel)</Text>
          <TextInput
            value={rechargeNotes}
            onChangeText={setRechargeNotes}
            placeholder="Notes internes..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 24, minHeight: 70 }}
          />

          {/* Submit */}
          <Pressable onPress={onSubmit} disabled={!selectedTenant || !rechargeAmount || actionLoading} style={({ pressed }) => ({ opacity: pressed || !selectedTenant || !rechargeAmount || actionLoading ? 0.7 : 1 })}>
            <LinearGradient colors={['#EA580C', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Enregistrer la recharge</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>

        {/* Tenant picker modal */}
        <Modal visible={showTenantPicker} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Choisir une entreprise</Text>
              <Pressable onPress={() => setShowTenantPicker(false)}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
            </View>
            <FlatList
              data={tenants}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setSelectedTenant(item.id); setShowTenantPicker(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, backgroundColor: selectedTenant === item.id ? '#FFF7ED' : '#FFF', borderWidth: 1, borderColor: selectedTenant === item.id ? '#EA580C' : '#E2E8F0' }}
                >
                  <Ionicons name="business" size={18} color={selectedTenant === item.id ? '#EA580C' : '#64748B'} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{item.name}</Text>
                    {item.email && <Text style={{ fontSize: 11, color: '#64748B' }}>{item.email}</Text>}
                  </View>
                  {selectedTenant === item.id && <Ionicons name="checkmark-circle" size={20} color="#EA580C" />}
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}
