import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Modal, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const COUNTRIES = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola', 'Antigua-et-Barbuda',
  'Arabie saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan', 'Bahamas', 'Bahreïn',
  'Bangladesh', 'Barbade', 'Belgique', 'Belize', 'Bénin', 'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie',
  'Bosnie-Herzégovine', 'Botswana', 'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge',
  'Cameroun', 'Canada', 'Cap-Vert', 'Centrafrique', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
  'Congo-Brazzaville', 'Congo-Kinshasa', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', 'Côte d\'Ivoire',
  'Croatie', 'Cuba', 'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats arabes unis', 'Équateur',
  'Érythrée', 'Espagne', 'Estonie', 'Eswatini', 'États-Unis', 'Éthiopie', 'Fidji', 'Finlande', 'France',
  'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade', 'Guatemala', 'Guinée', 'Guinée équatoriale',
  'Guinée-Bissau', 'Guyana', 'Haïti', 'Honduras', 'Hongrie', 'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande',
  'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jordanie', 'Kazakhstan', 'Kenya', 'Kirghizistan',
  'Kiribati', 'Koweït', 'Laos', 'Lesotho', 'Lettonie', 'Liban', 'Liberia', 'Libye', 'Liechtenstein',
  'Lituanie', 'Luxembourg', 'Macédoine du Nord', 'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali',
  'Malte', 'Maroc', 'Maurice', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie', 'Monaco', 'Mongolie',
  'Monténégro', 'Mozambique', 'Namibie', 'Nauru', 'Népal', 'Nicaragua', 'Niger', 'Nigeria', 'Norvège',
  'Nouvelle-Zélande', 'Oman', 'Ouganda', 'Ouzbékistan', 'Pakistan', 'Palaos', 'Palestine', 'Panama',
  'Papouasie-Nouvelle-Guinée', 'Paraguay', 'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal',
  'Qatar', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda', 'Saint-Kitts-et-Nevis', 'Saint-Vincent-et-les-Grenadines',
  'Sainte-Lucie', 'Salomon', 'Salvador', 'Samoa', 'São Tomé-et-Príncipe', 'Sénégal', 'Serbie', 'Seychelles',
  'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie', 'Somalie', 'Soudan', 'Soudan du Sud', 'Sri Lanka',
  'Suède', 'Suisse', 'Suriname', 'Syrie', 'Tadjikistan', 'Tanzanie', 'Tchad', 'Tchéquie', 'Thaïlande',
  'Timor oriental', 'Togo', 'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turkménistan', 'Turquie', 'Tuvalu',
  'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela', 'Viêt Nam', 'Yémen', 'Zambie', 'Zimbabwe',
];

// Country Picker Modal
function CountryPickerModal({ visible, onClose, onSelect, selectedCountry }: {
  visible: boolean; onClose: () => void; onSelect: (country: string) => void; selectedCountry: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = COUNTRIES.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Sélectionner un pays</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un pays..."
              placeholderTextColor="#94A3B8"
              autoFocus
              style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B' }}
            />
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { onSelect(item); onClose(); setSearch(''); }}
              style={({ pressed }) => ({
                paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4,
                backgroundColor: selectedCountry === item ? '#EEF2FF' : pressed ? '#F8FAFC' : 'transparent',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              })}
            >
              <Text style={{ fontSize: 15, color: selectedCountry === item ? '#4F46E5' : '#1E293B', fontWeight: selectedCountry === item ? '600' : '400' }}>{item}</Text>
              {selectedCountry === item && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 14, color: '#94A3B8' }}>Aucun pays trouvé</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

// Date Picker Modal (simple scroll picker)
function DatePickerModal({ visible, onClose, onSelect, selectedDate }: {
  visible: boolean; onClose: () => void; onSelect: (date: string) => void; selectedDate: string;
}) {
  const currentYear = new Date().getFullYear();
  const parsed = selectedDate ? new Date(selectedDate) : null;
  const [day, setDay] = useState(parsed ? parsed.getDate() : 1);
  const [month, setMonth] = useState(parsed ? parsed.getMonth() : 0);
  const [year, setYear] = useState(parsed ? parsed.getFullYear() : 1990);

  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setDay(d.getDate());
        setMonth(d.getMonth());
        setYear(d.getFullYear());
      }
    }
  }, [selectedDate, visible]);

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    const d = day > daysInMonth ? daysInMonth : day;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onSelect(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Pressable onPress={onClose}>
              <Text style={{ fontSize: 15, color: '#64748B' }}>Annuler</Text>
            </Pressable>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Date de naissance</Text>
            <Pressable onPress={handleConfirm}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#4F46E5' }}>Confirmer</Text>
            </Pressable>
          </View>

          {/* Day */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8 }}>Jour</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {days.map((d) => (
                <Pressable key={d} onPress={() => setDay(d)}
                  style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: day === d ? '#4F46E5' : '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 6, borderWidth: 1, borderColor: day === d ? '#4F46E5' : '#E2E8F0' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: day === d ? '#FFFFFF' : '#1E293B' }}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Month */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8 }}>Mois</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {months.map((m, i) => (
                <Pressable key={m} onPress={() => setMonth(i)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: month === i ? '#4F46E5' : '#F8FAFC', marginRight: 6, borderWidth: 1, borderColor: month === i ? '#4F46E5' : '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: month === i ? '#FFFFFF' : '#1E293B' }}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Year */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8 }}>Année</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {years.map((y) => (
                <Pressable key={y} onPress={() => setYear(y)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: year === y ? '#4F46E5' : '#F8FAFC', marginRight: 6, borderWidth: 1, borderColor: year === y ? '#4F46E5' : '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: year === y ? '#FFFFFF' : '#1E293B' }}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface Contact {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  is_subscribed: boolean;
  created_at: string;
}

function getInitials(contact: Contact): string {
  const first = contact.first_name?.charAt(0) || '';
  const last = contact.last_name?.charAt(0) || '';
  return (first + last).toUpperCase() || contact.phone.slice(-2);
}

function getAvatarColor(id: string): string {
  const colors = ['#4F46E5', '#7C3AED', '#059669', '#D97706', '#DC2626', '#2563EB', '#0891B2', '#EC4899'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Create/Edit Contact Modal
function ContactModal({ visible, onClose, onSaved, contact }: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  contact: Contact | null;
}) {
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (contact) {
      setPhone(contact.phone);
      setFirstName(contact.first_name || '');
      setLastName(contact.last_name || '');
      setEmail(contact.email || '');
      setGender(contact.gender || '');
      setCity(contact.city || '');
      setCountry(contact.country || '');
      setBirthDate(contact.birth_date || '');
    } else {
      setPhone(''); setFirstName(''); setLastName(''); setEmail(''); setGender(''); setCity(''); setCountry(''); setBirthDate('');
    }
    setError('');
  }, [contact, visible]);

  const handleSave = async () => {
    if (!phone) {
      setError('Le numéro de téléphone est obligatoire');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const data: any = {
        phone,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        gender: gender || undefined,
        city: city || undefined,
        country: country || undefined,
        birth_date: birthDate || undefined,
      };
      if (contact) {
        await api.updateContact(contact.id, data);
      } else {
        await api.createContact(data);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>
            {contact ? 'Modifier le contact' : 'Nouveau contact'}
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {error ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text>
            </View>
          ) : null}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Téléphone *</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+226 XX XX XX XX"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Prénom</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
                placeholderTextColor="#94A3B8"
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Nom</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                placeholderTextColor="#94A3B8"
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B' }}
              />
            </View>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemple.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Genre</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[{ value: '', label: 'Non spécifié' }, { value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }].map((opt) => (
              <Pressable key={opt.value} onPress={() => setGender(opt.value)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: gender === opt.value ? '#4F46E5' : '#FFFFFF', borderWidth: 1, borderColor: gender === opt.value ? '#4F46E5' : '#E2E8F0', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: gender === opt.value ? '#FFFFFF' : '#64748B' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Pays</Text>
          <Pressable onPress={() => setShowCountryPicker(true)}
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, color: country ? '#1E293B' : '#94A3B8' }}>
              {country || 'Sélectionner un pays'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </Pressable>
          <CountryPickerModal
            visible={showCountryPicker}
            onClose={() => setShowCountryPicker(false)}
            onSelect={setCountry}
            selectedCountry={country}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Ville</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Ville"
            placeholderTextColor="#94A3B8"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 }}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Date de naissance</Text>
          <Pressable onPress={() => setShowDatePicker(true)}
            style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, color: birthDate ? '#1E293B' : '#94A3B8' }}>
              {birthDate ? new Date(birthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sélectionner une date'}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
          </Pressable>
          <DatePickerModal
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            onSelect={setBirthDate}
            selectedDate={birthDate}
          />

          <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.8 : 1 })}>
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  {contact ? 'Enregistrer' : 'Ajouter le contact'}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ============================================
// CONTACT DETAIL MODAL (Fiche contact + Timeline)
// ============================================

function ContactDetailModalMobile({ visible, contact, onClose, onEdit }: {
  visible: boolean;
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [interactionType, setInteractionType] = useState('note');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      api.getContactNotes(contact.id, { page: 1, page_size: 100 })
        .then((data) => setNotes(data.items))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [visible, contact.id]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setIsAdding(true);
    try {
      const note = await api.createContactNote(contact.id, { interaction_type: interactionType, content: newNote.trim() });
      setNotes((prev) => [note, ...prev]);
      setNewNote('');
    } catch {}
    setIsAdding(false);
  };

  const handleDelete = (noteId: string) => {
    Alert.alert('Supprimer', 'Supprimer cette note ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.deleteContactNote(contact.id, noteId);
          setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch {}
      }},
    ]);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const initials = ((contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')).toUpperCase() || contact.phone.slice(-2);
  const getTypeConfig = (type: string) => INTERACTION_TYPES_MOBILE.find((t) => t.value === type) || INTERACTION_TYPES_MOBILE[INTERACTION_TYPES_MOBILE.length - 1];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#4F46E5' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1E293B' }}>
                {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Contact'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', fontFamily: 'monospace' }}>{contact.phone}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={onEdit} style={{ backgroundColor: '#EEF2FF', borderRadius: 10, padding: 8 }}>
              <Ionicons name="create-outline" size={18} color="#4F46E5" />
            </Pressable>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>
        </View>

        {/* Infos rapides */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          {contact.email && <Text style={{ fontSize: 11, color: '#64748B' }}>✉️ {contact.email}</Text>}
          {contact.city && <Text style={{ fontSize: 11, color: '#64748B' }}>📍 {contact.city}{contact.country ? `, ${contact.country}` : ''}</Text>}
          {contact.birth_date && <Text style={{ fontSize: 11, color: '#64748B' }}>🎂 {new Date(contact.birth_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Nouvelle interaction */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nouvelle interaction</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {INTERACTION_TYPES_MOBILE.map((t) => (
              <Pressable key={t.value} onPress={() => setInteractionType(t.value)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: interactionType === t.value ? t.color : '#F8FAFC', borderWidth: 1, borderColor: interactionType === t.value ? t.color : '#E2E8F0', marginRight: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name={t.icon} size={12} color={interactionType === t.value ? '#FFF' : t.color} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: interactionType === t.value ? '#FFF' : '#64748B' }}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            <TextInput
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Décrivez l'interaction..."
              placeholderTextColor="#94A3B8"
              multiline
              style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 13, color: '#1E293B', minHeight: 80, textAlignVertical: 'top' }}
            />
            <Pressable onPress={handleAdd} disabled={isAdding || !newNote.trim()} style={{ width: 50, height: 80, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', opacity: isAdding || !newNote.trim() ? 0.5 : 1 }}>
              {isAdding ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="add" size={22} color="#FFF" />}
            </Pressable>
          </View>

          {/* Timeline */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Historique ({notes.length})</Text>

          {isLoading ? (
            <ActivityIndicator color="#4F46E5" style={{ marginVertical: 20 }} />
          ) : notes.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Text style={{ fontSize: 30, marginBottom: 8 }}>📋</Text>
              <Text style={{ fontSize: 13, color: '#94A3B8' }}>Aucune interaction enregistrée</Text>
            </View>
          ) : (
            notes.map((note) => {
              const typeCfg = getTypeConfig(note.interaction_type);
              return (
                <View key={note.id} style={{ flexDirection: 'row', marginBottom: 12 }}>
                  {/* Timeline dot */}
                  <View style={{ width: 32, alignItems: 'center', paddingTop: 4 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: typeCfg.color + '15', borderWidth: 1.5, borderColor: typeCfg.color + '40', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={typeCfg.icon} size={12} color={typeCfg.color} />
                    </View>
                  </View>
                  {/* Card */}
                  <View style={{ flex: 1, marginLeft: 8, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: typeCfg.color }}>{typeCfg.label}</Text>
                        <Text style={{ fontSize: 9, color: '#94A3B8' }}>• {note.user_name}</Text>
                      </View>
                      <Pressable onPress={() => handleDelete(note.id)}>
                        <Ionicons name="trash-outline" size={14} color="#CBD5E1" />
                      </Pressable>
                    </View>
                    <Text style={{ fontSize: 13, color: '#1E293B', lineHeight: 18 }}>{note.content}</Text>
                    <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 6 }}>{formatDate(note.created_at)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ============================================
// CONTACT NOTES SECTION (legacy - kept for reference)
// ============================================

const INTERACTION_TYPES_MOBILE = [
  { value: 'note', label: 'Note', icon: 'document-text-outline' as const, color: '#64748B' },
  { value: 'visit', label: 'Visite', icon: 'walk-outline' as const, color: '#2563EB' },
  { value: 'purchase', label: 'Achat', icon: 'cart-outline' as const, color: '#059669' },
  { value: 'complaint', label: 'Réclamation', icon: 'alert-circle-outline' as const, color: '#DC2626' },
  { value: 'call_in', label: 'Appel entrant', icon: 'call-outline' as const, color: '#7C3AED' },
  { value: 'call_out', label: 'Appel sortant', icon: 'call-outline' as const, color: '#7C3AED' },
  { value: 'email', label: 'Email', icon: 'mail-outline' as const, color: '#0891B2' },
  { value: 'meeting', label: 'RDV', icon: 'calendar-outline' as const, color: '#D97706' },
  { value: 'quote', label: 'Devis', icon: 'document-outline' as const, color: '#4F46E5' },
  { value: 'payment', label: 'Paiement', icon: 'card-outline' as const, color: '#059669' },
  { value: 'return', label: 'Retour', icon: 'arrow-undo-outline' as const, color: '#EA580C' },
  { value: 'support', label: 'Support', icon: 'build-outline' as const, color: '#6366F1' },
  { value: 'feedback', label: 'Avis', icon: 'star-outline' as const, color: '#EAB308' },
  { value: 'other', label: 'Autre', icon: 'ellipsis-horizontal-outline' as const, color: '#94A3B8' },
];

function ContactNotesSection({ contactId }: { contactId: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [interactionType, setInteractionType] = useState('note');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    api.getContactNotes(contactId, { page: 1, page_size: 50 })
      .then((data) => setNotes(data.items))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [contactId]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setIsAdding(true);
    try {
      const note = await api.createContactNote(contactId, { interaction_type: interactionType, content: newNote.trim() });
      setNotes((prev) => [note, ...prev]);
      setNewNote('');
      setInteractionType('note');
    } catch {}
    setIsAdding(false);
  };

  const handleDelete = (noteId: string) => {
    Alert.alert('Supprimer', 'Supprimer cette note ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.deleteContactNote(contactId, noteId);
          setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch {}
      }},
    ]);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTypeConfig = (type: string) => INTERACTION_TYPES_MOBILE.find((t) => t.value === type) || INTERACTION_TYPES_MOBILE[INTERACTION_TYPES_MOBILE.length - 1];

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes & Interactions</Text>

      {/* Type selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {INTERACTION_TYPES_MOBILE.map((t) => (
          <Pressable key={t.value} onPress={() => setInteractionType(t.value)}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: interactionType === t.value ? t.color : '#F8FAFC', borderWidth: 1, borderColor: interactionType === t.value ? t.color : '#E2E8F0', marginRight: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={t.icon} size={12} color={interactionType === t.value ? '#FFF' : t.color} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: interactionType === t.value ? '#FFF' : '#64748B' }}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Add note */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TextInput
          value={newNote}
          onChangeText={setNewNote}
          placeholder="Ajouter une note..."
          placeholderTextColor="#94A3B8"
          multiline
          style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, fontSize: 13, color: '#1E293B', minHeight: 44, textAlignVertical: 'top' }}
        />
        <Pressable onPress={handleAdd} disabled={isAdding || !newNote.trim()} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', opacity: isAdding || !newNote.trim() ? 0.5 : 1 }}>
          {isAdding ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="add" size={20} color="#FFF" />}
        </Pressable>
      </View>

      {/* Notes list */}
      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginVertical: 16 }} />
      ) : notes.length === 0 ? (
        <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 }}>Aucune note pour ce contact</Text>
      ) : (
        notes.map((note) => {
          const typeCfg = getTypeConfig(note.interaction_type);
          return (
            <View key={note.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: typeCfg.color + '15', borderRadius: 6, padding: 4 }}>
                    <Ionicons name={typeCfg.icon} size={12} color={typeCfg.color} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: typeCfg.color }}>{typeCfg.label}</Text>
                  <Text style={{ fontSize: 9, color: '#94A3B8' }}>• {note.user_name}</Text>
                </View>
                <Pressable onPress={() => handleDelete(note.id)}>
                  <Ionicons name="trash-outline" size={14} color="#94A3B8" />
                </Pressable>
              </View>
              <Text style={{ fontSize: 13, color: '#1E293B', lineHeight: 18 }}>{note.content}</Text>
              <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 4 }}>{formatDate(note.created_at)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

// Import Contacts Modal
function ImportContactsModal({ visible, onClose, onImported }: {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ message: string; imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setFile(null);
      setResult(null);
      setError('');
      setShowConfirm(false);
    }
  }, [visible]);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/comma-separated-values',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'text/csv',
        });
        setError('');
        setResult(null);
      }
    } catch {
      setError('Erreur lors de la sélection du fichier');
    }
  };

  const handleSubmit = () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setShowConfirm(false);
    setIsImporting(true);
    setError('');
    setResult(null);
    try {
      const res = await api.importContacts(file.uri, file.name, file.mimeType);
      setResult(res);
      onImported();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Importer des contacts</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Depuis un fichier CSV ou Excel</Text>
          </View>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Error */}
          {error ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' }}>
              <Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text>
            </View>
          ) : null}

          {/* Success Result */}
          {result ? (
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#16A34A' }}>{result.message}</Text>
              {result.errors && result.errors.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {result.errors.map((err, i) => (
                    <Text key={i} style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{'\u2022'} {err}</Text>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {/* File Picker */}
          <Pressable onPress={handlePickFile} style={({ pressed }) => ({
            backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: file ? '#4F46E5' : '#E2E8F0',
            borderStyle: 'dashed', padding: 24, alignItems: 'center', marginBottom: 20, opacity: pressed ? 0.8 : 1,
          })}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: file ? '#EEF2FF' : '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name={file ? 'document-text' : 'cloud-upload-outline'} size={28} color={file ? '#4F46E5' : '#94A3B8'} />
            </View>
            {file ? (
              <>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B', textAlign: 'center' }}>{file.name}</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Appuyez pour changer de fichier</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>Sélectionner un fichier</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>CSV ou Excel (.csv, .xlsx, .xls)</Text>
              </>
            )}
          </Pressable>

          {/* Format Info */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 10 }}>Format attendu (colonnes) :</Text>
            {[
              { col: 'phone *', desc: 'Numéro de téléphone' },
              { col: 'first_name', desc: 'Prénom' },
              { col: 'last_name', desc: 'Nom' },
              { col: 'email', desc: 'Email' },
              { col: 'gender', desc: 'M ou F' },
              { col: 'birth_date', desc: 'Date (YYYY-MM-DD)' },
              { col: 'city', desc: 'Ville' },
              { col: 'country', desc: 'Pays' },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: item.col.includes('*') ? '700' : '500', color: item.col.includes('*') ? '#4F46E5' : '#475569', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{item.col}</Text>
                <Text style={{ fontSize: 12, color: '#64748B' }}>{item.desc}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 10 }}>
              La première ligne doit contenir les en-têtes. Seule la colonne phone est obligatoire.
            </Text>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={onClose} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}>
              <View style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B' }}>{result ? 'Fermer' : 'Annuler'}</Text>
              </View>
            </Pressable>
            {!result && (
              <Pressable onPress={handleSubmit} disabled={isImporting || !file} style={({ pressed }) => ({ flex: 1, opacity: pressed || isImporting || !file ? 0.6 : 1 })}>
                <LinearGradient
                  colors={['#7C3AED', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                >
                  {isImporting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Importer</Text>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Confirmation overlay */}
        {showConfirm && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Ionicons name="cloud-upload" size={22} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Confirmer l'import</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Importer depuis "{file?.name}" ?</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable onPress={() => setShowConfirm(false)} style={{ flex: 1 }}>
                  <View style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Annuler</Text>
                  </View>
                </Pressable>
                <Pressable onPress={handleConfirmImport} style={{ flex: 1 }}>
                  <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Confirmer</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function ContactsScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.role === 'owner';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);

  const loadContacts = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    try {
      const data = await api.getContacts({
        page: currentPage,
        page_size: 30,
        search: search || undefined,
      });
      setContacts(data.items);
      setTotal(data.total);
      if (reset) setPage(1);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadContacts(true);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      loadContacts(true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadContacts(true);
  };

  const handleDelete = (contact: Contact) => {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.phone;
    Alert.alert(
      'Supprimer le contact',
      `Supprimer "${name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteContact(contact.id);
              loadContacts(true);
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (contact: Contact) => {
    setEditContact(contact);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1E293B' }}>Contacts</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{total} contacts</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setShowImportModal(true)} style={({ pressed }) => ({ backgroundColor: '#EEF2FF', width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
              <Ionicons name="cloud-upload-outline" size={20} color="#4F46E5" />
            </Pressable>
            <Pressable onPress={() => { setEditContact(null); setShowModal(true); }} style={({ pressed }) => ({ backgroundColor: '#4F46E5', width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un contact..."
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B' }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Contact List */}
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={{ fontSize: 15, color: '#94A3B8', marginTop: 12 }}>Aucun contact trouvé</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = getAvatarColor(item.id);
          const name = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.phone;

          const renderRightActions = () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 8 }}>
              <Pressable onPress={() => setViewingContact(item)} style={{ width: 48, height: '100%', borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                <Ionicons name="document-text-outline" size={18} color="#FFF" />
                <Text style={{ fontSize: 8, color: '#FFF', marginTop: 2, fontWeight: '600' }}>Notes</Text>
              </Pressable>
              <Pressable onPress={() => { setEditContact(item); setShowModal(true); }} style={{ width: 48, height: '100%', borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                <Ionicons name="create-outline" size={18} color="#FFF" />
                <Text style={{ fontSize: 8, color: '#FFF', marginTop: 2, fontWeight: '600' }}>Modifier</Text>
              </Pressable>
              {isOwner && (
                <Pressable onPress={() => handleDelete(item)} style={{ width: 48, height: '100%', borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                  <Text style={{ fontSize: 8, color: '#FFF', marginTop: 2, fontWeight: '600' }}>Suppr.</Text>
                </Pressable>
              )}
            </View>
          );

          return (
            <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
              <Pressable
                onPress={() => setViewingContact(item)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
                  opacity: pressed ? 0.95 : 1,
                })}
              >
                {/* Avatar */}
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color }}>{getInitials(item)}</Text>
                </View>
                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 2 }}>{name}</Text>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>{item.phone}</Text>
                </View>
                {/* Swipe hint */}
                <Ionicons name="chevron-back-outline" size={14} color="#CBD5E1" />
              </Pressable>
            </Swipeable>
          );
        }}
      />

      {/* FAB */}
      <Pressable onPress={() => { setEditContact(null); setShowModal(true); }} style={({ pressed }) => ({ position: 'absolute', bottom: 100, right: 20, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] })}>
        <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 }}>
          <Ionicons name="person-add" size={24} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>

      <ContactModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditContact(null); }}
        onSaved={() => loadContacts(true)}
        contact={editContact}
      />

      {/* Fiche contact detail */}
      {viewingContact && (
        <ContactDetailModalMobile
          visible={!!viewingContact}
          contact={viewingContact}
          onClose={() => setViewingContact(null)}
          onEdit={() => {
            setEditContact(viewingContact);
            setShowModal(true);
            setViewingContact(null);
          }}
        />
      )}

      <ImportContactsModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => loadContacts(true)}
      />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}
