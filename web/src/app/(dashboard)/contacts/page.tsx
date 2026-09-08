"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Phone,
  Mail,
  Tag,
  Trash2,
  Edit,
  Send,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  X,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

// ============================================
// TYPES
// ============================================

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

const tagColors: Record<string, string> = {
  vip: "bg-amber-500/10 text-amber-600 border-amber-200",
  fidèle: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  nouveau: "bg-blue-500/10 text-blue-600 border-blue-200",
  inactif: "bg-red-500/10 text-red-500 border-red-200",
  entreprise: "bg-purple-500/10 text-purple-600 border-purple-200",
};

const countries = [
  { code: "AF", name: "Afghanistan" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "AL", name: "Albanie" },
  { code: "DZ", name: "Algérie" },
  { code: "DE", name: "Allemagne" },
  { code: "AD", name: "Andorre" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua-et-Barbuda" },
  { code: "SA", name: "Arabie saoudite" },
  { code: "AR", name: "Argentine" },
  { code: "AM", name: "Arménie" },
  { code: "AU", name: "Australie" },
  { code: "AT", name: "Autriche" },
  { code: "AZ", name: "Azerbaïdjan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahreïn" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbade" },
  { code: "BE", name: "Belgique" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Bénin" },
  { code: "BT", name: "Bhoutan" },
  { code: "BY", name: "Biélorussie" },
  { code: "BO", name: "Bolivie" },
  { code: "BA", name: "Bosnie-Herzégovine" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brésil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgarie" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodge" },
  { code: "CM", name: "Cameroun" },
  { code: "CA", name: "Canada" },
  { code: "CV", name: "Cap-Vert" },
  { code: "CF", name: "Centrafrique" },
  { code: "CL", name: "Chili" },
  { code: "CN", name: "Chine" },
  { code: "CY", name: "Chypre" },
  { code: "CO", name: "Colombie" },
  { code: "KM", name: "Comores" },
  { code: "CG", name: "Congo-Brazzaville" },
  { code: "CD", name: "Congo-Kinshasa" },
  { code: "KR", name: "Corée du Sud" },
  { code: "KP", name: "Corée du Nord" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatie" },
  { code: "CU", name: "Cuba" },
  { code: "DK", name: "Danemark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominique" },
  { code: "EG", name: "Égypte" },
  { code: "AE", name: "Émirats arabes unis" },
  { code: "EC", name: "Équateur" },
  { code: "ER", name: "Érythrée" },
  { code: "ES", name: "Espagne" },
  { code: "EE", name: "Estonie" },
  { code: "SZ", name: "Eswatini" },
  { code: "US", name: "États-Unis" },
  { code: "ET", name: "Éthiopie" },
  { code: "FJ", name: "Fidji" },
  { code: "FI", name: "Finlande" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambie" },
  { code: "GE", name: "Géorgie" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Grèce" },
  { code: "GD", name: "Grenade" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinée" },
  { code: "GW", name: "Guinée-Bissau" },
  { code: "GQ", name: "Guinée équatoriale" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haïti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hongrie" },
  { code: "IN", name: "Inde" },
  { code: "ID", name: "Indonésie" },
  { code: "IQ", name: "Irak" },
  { code: "IR", name: "Iran" },
  { code: "IE", name: "Irlande" },
  { code: "IS", name: "Islande" },
  { code: "IL", name: "Israël" },
  { code: "IT", name: "Italie" },
  { code: "JM", name: "Jamaïque" },
  { code: "JP", name: "Japon" },
  { code: "JO", name: "Jordanie" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KG", name: "Kirghizistan" },
  { code: "KW", name: "Koweït" },
  { code: "LA", name: "Laos" },
  { code: "LS", name: "Lesotho" },
  { code: "LV", name: "Lettonie" },
  { code: "LB", name: "Liban" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libye" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lituanie" },
  { code: "LU", name: "Luxembourg" },
  { code: "MK", name: "Macédoine du Nord" },
  { code: "MG", name: "Madagascar" },
  { code: "MY", name: "Malaisie" },
  { code: "MW", name: "Malawi" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malte" },
  { code: "MA", name: "Maroc" },
  { code: "MU", name: "Maurice" },
  { code: "MR", name: "Mauritanie" },
  { code: "MX", name: "Mexique" },
  { code: "MD", name: "Moldavie" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolie" },
  { code: "ME", name: "Monténégro" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibie" },
  { code: "NP", name: "Népal" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norvège" },
  { code: "NZ", name: "Nouvelle-Zélande" },
  { code: "OM", name: "Oman" },
  { code: "UG", name: "Ouganda" },
  { code: "UZ", name: "Ouzbékistan" },
  { code: "PK", name: "Pakistan" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papouasie-Nouvelle-Guinée" },
  { code: "PY", name: "Paraguay" },
  { code: "NL", name: "Pays-Bas" },
  { code: "PE", name: "Pérou" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Pologne" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Roumanie" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "RU", name: "Russie" },
  { code: "RW", name: "Rwanda" },
  { code: "SN", name: "Sénégal" },
  { code: "RS", name: "Serbie" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapour" },
  { code: "SK", name: "Slovaquie" },
  { code: "SI", name: "Slovénie" },
  { code: "SO", name: "Somalie" },
  { code: "SD", name: "Soudan" },
  { code: "SS", name: "Soudan du Sud" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SE", name: "Suède" },
  { code: "CH", name: "Suisse" },
  { code: "SR", name: "Suriname" },
  { code: "SY", name: "Syrie" },
  { code: "TJ", name: "Tadjikistan" },
  { code: "TZ", name: "Tanzanie" },
  { code: "TD", name: "Tchad" },
  { code: "CZ", name: "Tchéquie" },
  { code: "TH", name: "Thaïlande" },
  { code: "TG", name: "Togo" },
  { code: "TT", name: "Trinité-et-Tobago" },
  { code: "TN", name: "Tunisie" },
  { code: "TM", name: "Turkménistan" },
  { code: "TR", name: "Turquie" },
  { code: "UA", name: "Ukraine" },
  { code: "UY", name: "Uruguay" },
  { code: "VU", name: "Vanuatu" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Viêt Nam" },
  { code: "YE", name: "Yémen" },
  { code: "ZM", name: "Zambie" },
  { code: "ZW", name: "Zimbabwe" },
];

// ============================================
// ADD CONTACT MODAL
// ============================================

function AddContactModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [tags, setTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError("Le numéro de téléphone est obligatoire");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await api.createContact({
        phone,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        gender: gender || undefined,
        birth_date: birthDate || undefined,
        city: city || undefined,
        country: country || undefined,
      });
      onCreated();
      onClose();
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setGender("");
      setBirthDate("");
      setCountry("");
      setCity("");
      setTags("");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Nouveau contact</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Enregistrer un nouveau client</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prénom</label>
              <Input
                placeholder="Prénom"
                className="h-10 bg-muted/30 border-border/50"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                placeholder="Nom"
                className="h-10 bg-muted/30 border-border/50"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Téléphone *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="+226 XX XX XX XX"
                className="h-10 pl-10 bg-muted/30 border-border/50"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@exemple.com"
                className="h-10 pl-10 bg-muted/30 border-border/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date de naissance</label>
            <div className="flex gap-2">
              <select
                className="h-10 flex-1 rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={birthDate ? birthDate.split("-")[2] : ""}
                onChange={(e) => {
                  const parts = (birthDate || "--").split("-");
                  setBirthDate(`${parts[0] || "2000"}-${parts[1] || "01"}-${e.target.value.padStart(2, "0")}`);
                }}
              >
                <option value="">Jour</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
                ))}
              </select>
              <select
                className="h-10 flex-[2] rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={birthDate ? birthDate.split("-")[1] : ""}
                onChange={(e) => {
                  const parts = (birthDate || "--").split("-");
                  setBirthDate(`${parts[0] || "2000"}-${e.target.value}-${parts[2] || "01"}`);
                }}
              >
                <option value="">Mois</option>
                {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                ))}
              </select>
              <select
                className="h-10 flex-1 rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={birthDate ? birthDate.split("-")[0] : ""}
                onChange={(e) => {
                  const parts = (birthDate || "--").split("-");
                  setBirthDate(`${e.target.value}-${parts[1] || "01"}-${parts[2] || "01"}`);
                }}
              >
                <option value="">Année</option>
                {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Genre</label>
            <select
              className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Non spécifié</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pays</label>
              <select
                className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Sélectionner un pays</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ville</label>
              <Input
                className="h-10 bg-muted/30 border-border/50"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <Separator className="my-2" />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Ajouter
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// EDIT CONTACT MODAL
// ============================================

function EditContactModal({
  isOpen,
  onClose,
  onUpdated,
  contact,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  contact: Contact | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Populate fields when contact changes
  React.useEffect(() => {
    if (contact) {
      setFirstName(contact.first_name || "");
      setLastName(contact.last_name || "");
      setPhone(contact.phone || "");
      setEmail(contact.email || "");
      setGender(contact.gender || "");
      setBirthDate(contact.birth_date ? contact.birth_date.split("T")[0] : "");
      setCountry(contact.country || "");
      setCity(contact.city || "");
    }
  }, [contact]);

  if (!isOpen || !contact) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await api.updateContact(contact.id, {
        phone: phone || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        gender: gender || undefined,
        birth_date: birthDate || undefined,
        city: city || undefined,
        country: country || undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la modification");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Modifier le contact</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Mettre à jour les informations</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prénom</label>
              <Input
                placeholder="Prénom"
                className="h-10 bg-muted/30 border-border/50"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                placeholder="Nom"
                className="h-10 bg-muted/30 border-border/50"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Téléphone *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="+226 XX XX XX XX"
                className="h-10 pl-10 bg-muted/30 border-border/50"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@exemple.com"
                className="h-10 pl-10 bg-muted/30 border-border/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Genre</label>
              <select
                className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Non spécifié</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de naissance</label>
              <div className="flex gap-2">
                <select
                  className="h-10 flex-1 rounded-md bg-muted/30 border border-border/50 px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  value={birthDate ? birthDate.split("-")[2] : ""}
                  onChange={(e) => {
                    const parts = (birthDate || "--").split("-");
                    setBirthDate(`${parts[0] || "2000"}-${parts[1] || "01"}-${e.target.value.padStart(2, "0")}`);
                  }}
                >
                  <option value="">Jour</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
                  ))}
                </select>
                <select
                  className="h-10 flex-[2] rounded-md bg-muted/30 border border-border/50 px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  value={birthDate ? birthDate.split("-")[1] : ""}
                  onChange={(e) => {
                    const parts = (birthDate || "--").split("-");
                    setBirthDate(`${parts[0] || "2000"}-${e.target.value}-${parts[2] || "01"}`);
                  }}
                >
                  <option value="">Mois</option>
                  {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m, i) => (
                    <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                  ))}
                </select>
                <select
                  className="h-10 flex-1 rounded-md bg-muted/30 border border-border/50 px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  value={birthDate ? birthDate.split("-")[0] : ""}
                  onChange={(e) => {
                    const parts = (birthDate || "--").split("-");
                    setBirthDate(`${e.target.value}-${parts[1] || "01"}-${parts[2] || "01"}`);
                  }}
                >
                  <option value="">Année</option>
                  {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pays</label>
              <select
                className="h-10 w-full rounded-md bg-muted/30 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Sélectionner un pays</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ville</label>
              <Input
                placeholder="Abidjan"
                className="h-10 bg-muted/30 border-border/50"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <Separator className="my-2" />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Edit className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// CONTACT DETAIL MODAL (Fiche contact + Timeline)
// ============================================

const INTERACTION_TYPES_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  note: { label: "Note", color: "text-gray-600", icon: "📝" },
  visit: { label: "Visite", color: "text-blue-600", icon: "🚶" },
  purchase: { label: "Achat", color: "text-emerald-600", icon: "🛒" },
  complaint: { label: "Réclamation", color: "text-red-600", icon: "⚠️" },
  call_in: { label: "Appel entrant", color: "text-purple-600", icon: "📞" },
  call_out: { label: "Appel sortant", color: "text-purple-600", icon: "📱" },
  email: { label: "Email", color: "text-cyan-600", icon: "✉️" },
  meeting: { label: "Rendez-vous", color: "text-amber-600", icon: "📅" },
  quote: { label: "Devis", color: "text-indigo-600", icon: "📄" },
  payment: { label: "Paiement", color: "text-emerald-600", icon: "💳" },
  return: { label: "Retour produit", color: "text-orange-600", icon: "↩️" },
  support: { label: "Support technique", color: "text-indigo-600", icon: "🔧" },
  feedback: { label: "Avis client", color: "text-yellow-600", icon: "⭐" },
  other: { label: "Autre", color: "text-gray-500", icon: "💬" },
};

function ContactDetailModal({
  contact,
  onClose,
  onEdit,
}: {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [interactionType, setInteractionType] = useState("note");
  const [isAdding, setIsAdding] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      if (filterType) params.interaction_type = filterType;
      const data = await api.getContactNotes(contact.id, params);
      setNotes(data.items);
    } catch {}
    setIsLoading(false);
  }, [contact.id, filterType]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setIsAdding(true);
    try {
      const note = await api.createContactNote(contact.id, { interaction_type: interactionType, content: newNote.trim() });
      setNotes((prev) => [note, ...prev]);
      setNewNote("");
    } catch {}
    setIsAdding(false);
  };

  const handleDelete = async (noteId: string) => {
    try {
      await api.deleteContactNote(contact.id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {}
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const initials = ((contact.first_name?.[0] || "") + (contact.last_name?.[0] || "")).toUpperCase() || contact.phone.slice(-2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-background rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary font-bold text-lg">
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact"}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">{contact.phone}</p>
              {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5 mr-1" /> Modifier
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Infos rapides */}
        <div className="px-6 py-3 border-b border-border/50 bg-muted/20">
          <div className="flex gap-4 text-xs text-muted-foreground">
            {contact.city && <span>📍 {contact.city}{contact.country ? `, ${contact.country}` : ""}</span>}
            {contact.gender && <span>{contact.gender === "M" ? "👨" : contact.gender === "F" ? "👩" : "🧑"} {contact.gender === "M" ? "Homme" : contact.gender === "F" ? "Femme" : contact.gender}</span>}
            {contact.birth_date && <span>🎂 {new Date(contact.birth_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>}
            <span>📅 Client depuis {new Date(contact.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
          </div>
        </div>

        {/* Corps : Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Ajouter une interaction */}
          <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nouvelle interaction</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(INTERACTION_TYPES_CONFIG).map(([value, cfg]) => (
                <button
                  key={value}
                  onClick={() => setInteractionType(value)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    interactionType === value
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border/50 hover:bg-muted/50"
                  )}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                placeholder="Décrivez l'interaction..."
                className="flex-1 h-20 p-3 rounded-lg bg-background border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button
                size="sm"
                className="h-20 px-5"
                onClick={handleAdd}
                disabled={isAdding || !newNote.trim()}
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Filtre par type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filtrer :</span>
            <Button
              variant={filterType === null ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => setFilterType(null)}
            >
              Tout
            </Button>
            {Object.entries(INTERACTION_TYPES_CONFIG).slice(0, 6).map(([value, cfg]) => (
              <Button
                key={value}
                variant={filterType === value ? "default" : "outline"}
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => setFilterType(value)}
              >
                {cfg.icon} {cfg.label}
              </Button>
            ))}
          </div>

          {/* Timeline */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm font-medium text-muted-foreground">Aucune interaction enregistrée</p>
              <p className="text-xs text-muted-foreground mt-1">Ajoutez une note pour commencer l'historique</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => {
                const typeCfg = INTERACTION_TYPES_CONFIG[note.interaction_type] || INTERACTION_TYPES_CONFIG.other;
                return (
                  <div key={note.id} className="relative pl-8 group">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-muted/50 border-2 border-border flex items-center justify-center text-xs">
                      {typeCfg.icon}
                    </div>
                    {/* Card */}
                    <div className="p-4 rounded-xl border border-border/50 bg-background hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", typeCfg.color)}>
                            {typeCfg.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">par {note.user_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{formatDate(note.created_at)}</span>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{note.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportContactsModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner un fichier");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setShowConfirm(false);
    setIsImporting(true);
    setError("");
    setResult(null);
    try {
      const res = await api.importContacts(file);
      setResult(res);
      onImported();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Importer des contacts</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Depuis un fichier CSV ou Excel</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {result && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-200 text-sm text-emerald-600">
              <p className="font-medium">{result.message}</p>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-1 text-xs text-muted-foreground list-disc pl-4">
                  {result.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Fichier CSV ou Excel *</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full h-10 px-3 py-2 rounded-md bg-muted/30 border border-border/50 text-sm file:mr-3 file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium file:rounded file:px-2 file:py-1"
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-foreground mb-2">Format attendu (colonnes) :</p>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground font-mono">
              <span className="text-primary font-semibold">phone *</span>
              <span>Numéro de téléphone</span>
              <span>first_name</span>
              <span>Prénom</span>
              <span>last_name</span>
              <span>Nom</span>
              <span>email</span>
              <span>Email</span>
              <span>gender</span>
              <span>M ou F</span>
              <span>birth_date</span>
              <span>Date (YYYY-MM-DD)</span>
              <span>city</span>
              <span>Ville</span>
              <span>country</span>
              <span>Pays</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              La première ligne doit contenir les en-têtes. Seule la colonne <code className="text-primary">phone</code> est obligatoire.
            </p>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              {result ? "Fermer" : "Annuler"}
            </Button>
            {!result && (
              <Button type="submit" className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white" disabled={isImporting || !file}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Importer
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Confirmation d'import */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Confirmer l'import</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Importer les contacts depuis "{file?.name}" ?
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                Annuler
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white" onClick={handleConfirmImport}>
                <Upload className="mr-2 h-4 w-4" />
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ContactsPage() {
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.role === "owner";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { page: String(page), page_size: "20" };
      if (searchQuery) params.search = searchQuery;
      const data = await api.getContacts(params as any);
      setContacts(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        setPage(1);
      }, 500)
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map((c) => c.id));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteContact(id);
      fetchContacts();
      setSelectedContacts((prev) => prev.filter((i) => i !== id));
      setShowDeleteConfirm(false);
      setDeletingContactId(null);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingContactId(id);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre base de clients • {total} contact{total > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-9"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            Importer
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="h-9 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un contact
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total contacts", value: total.toLocaleString(), icon: Users, color: "text-blue-600" },
          { label: "Abonnés actifs", value: contacts.filter((c) => c.is_subscribed).length.toString(), icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Désinscrits", value: contacts.filter((c) => !c.is_subscribed).length.toString(), icon: XCircle, color: "text-red-500" },
          { label: "Cette page", value: contacts.length.toString(), icon: UserPlus, color: "text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filters */}
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un contact..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 pl-9 bg-muted/30 border-border/50"
              />
            </div>
            {selectedContacts.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm text-muted-foreground">
                  {selectedContacts.length} sélectionné(s)
                </span>
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-red-500 hover:text-red-600"
                    onClick={() => {
                      setDeletingContactId(selectedContacts[0]);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Supprimer
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Contacts Table */}
      {!isLoading && !error && (
        <Card className="border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === contacts.length && contacts.length > 0}
                      onChange={selectAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Genre
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pays / Ville
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Naissance
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="w-24 p-4"> ACTION</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-sm font-medium text-muted-foreground">Aucun contact</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ajoutez votre premier contact
                      </p>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => {
                    const initials = `${(contact.first_name || "?")[0]}${(contact.last_name || "?")[0]}`.toUpperCase();
                    return (
                      <tr
                        key={contact.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="cursor-pointer" onClick={() => setViewingContact(contact)}>
                              <p className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                                {contact.first_name || ""} {contact.last_name || ""}
                              </p>
                              {contact.email && (
                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground font-mono">{contact.phone}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {contact.gender === "M" ? "Masculin" : contact.gender === "F" ? "Féminin" : "—"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {[contact.country, contact.city].filter(Boolean).join(", ") || "—"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {contact.birth_date
                              ? new Date(contact.birth_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
                              : "—"}
                          </span>
                        </td>
                        <td className="p-4">
                          {contact.is_subscribed ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                              Abonné
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-200">
                              Désinscrit
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-50"
                              onClick={() => setViewingContact(contact)}
                              title="Notes & Interactions"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => {
                                setEditingContact(contact);
                                setShowEditModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                onClick={() => confirmDelete(contact.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Add Modal */}
      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchContacts}
      />

      {/* Import Modal */}
      {showImportModal && (
        <ImportContactsModal
          onClose={() => setShowImportModal(false)}
          onImported={fetchContacts}
        />
      )}

      {/* Contact Detail Modal */}
      {viewingContact && (
        <ContactDetailModal
          contact={viewingContact}
          onClose={() => setViewingContact(null)}
          onEdit={() => {
            setEditingContact(viewingContact);
            setShowEditModal(true);
            setViewingContact(null);
          }}
        />
      )}

      {/* Edit Modal */}
      <EditContactModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingContact(null);
        }}
        onUpdated={fetchContacts}
        contact={editingContact}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeletingContactId(null);
            }}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Confirmer la suppression</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Cette action est irréversible.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingContactId(null);
                }}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  if (deletingContactId) {
                    handleDelete(deletingContactId);
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
