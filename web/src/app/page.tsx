import Link from "next/link";
import {
  Send,
  Users,
  BarChart3,
  Zap,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
  Phone,
  Sparkles,
  Globe,
  Target,
  TrendingUp,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-violet-600/15 via-indigo-600/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/10 to-transparent rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-purple-600/10 to-transparent rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 w-full">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">SMS Pro</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#how" className="hover:text-white transition-colors">Comment ça marche</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden sm:block px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors">
              Connexion
            </Link>
            <Link href="/auth/register" className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/25 transition-all">
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-sm text-white/70 mb-8">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>La plateforme SMS marketing #1 en Afrique de l'Ouest</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="block">Transformez chaque</span>
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400">
              SMS en opportunité
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-8 text-base sm:text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            Campagnes ciblées, automations intelligentes, statistiques en temps réel.
            Tout ce qu'il faut pour engager vos clients et développer votre business.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="w-full sm:w-auto group relative px-8 py-4 text-base font-semibold text-white rounded-2xl overflow-hidden transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 group-hover:from-violet-500 group-hover:to-indigo-500 transition-all" />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-white/10 to-violet-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2">
                Créer mon compte gratuitement
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link href="/auth/login" className="w-full sm:w-auto px-8 py-4 text-base font-medium text-white/70 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:text-white transition-all text-center">
              J'ai déjà un compte
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Inscription gratuite</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Activation sous 15 min</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Sans engagement</span>
            </div>
          </div>
        </div>

        {/* Floating stats */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatBadge icon={Send} value="98.7%" label="Taux de délivrance" />
          <StatBadge icon={Users} value="10K+" label="Contacts gérés" />
          <StatBadge icon={Globe} value="Multi-pays" label="Couverture" />
          <StatBadge icon={TrendingUp} value="24/7" label="Disponibilité" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-wider mb-3">Fonctionnalités</p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-lg text-white/40 max-w-xl mx-auto">
              Une plateforme complète pour gérer vos communications SMS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={MessageSquare}
              title="Campagnes SMS"
              description="Créez et envoyez des campagnes ciblées. Programmation, A/B testing et personnalisation des messages."
              gradient="from-blue-500/20 to-cyan-500/20"
              iconColor="text-blue-400"
            />
            <FeatureCard
              icon={Users}
              title="Gestion de contacts"
              description="Importez, segmentez et organisez vos contacts en groupes. Import CSV et tags personnalisés."
              gradient="from-emerald-500/20 to-teal-500/20"
              iconColor="text-emerald-400"
            />
            <FeatureCard
              icon={Zap}
              title="Automations"
              description="SMS d'anniversaire, messages de bienvenue, rappels automatiques. Engagez sans lever le petit doigt."
              gradient="from-amber-500/20 to-orange-500/20"
              iconColor="text-amber-400"
            />
            <FeatureCard
              icon={BarChart3}
              title="Statistiques détaillées"
              description="Suivez vos performances en temps réel. Taux de délivrance, volumes et tendances."
              gradient="from-purple-500/20 to-pink-500/20"
              iconColor="text-purple-400"
            />
            <FeatureCard
              icon={Shield}
              title="Sender ID personnalisé"
              description="Envoyez avec le nom de votre entreprise comme expéditeur. Renforcez la confiance."
              gradient="from-rose-500/20 to-red-500/20"
              iconColor="text-rose-400"
            />
            <FeatureCard
              icon={Clock}
              title="Programmation"
              description="Planifiez vos envois au jour et à l'heure que vous voulez. Touchez vos clients au bon moment."
              gradient="from-cyan-500/20 to-blue-500/20"
              iconColor="text-cyan-400"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-wider mb-3">Tarifs</p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Simple et transparent
            </h2>
            <p className="mt-4 text-lg text-white/40">
              Un seul abonnement, toutes les fonctionnalités
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />

              <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-10">
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-violet-600/30">
                  Abonnement mensuel
                </div>

                <div className="text-center mt-4 mb-8">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">25 000</span>
                    <div className="text-left">
                      <span className="text-xl font-medium text-white/50">FCFA</span>
                      <p className="text-xs text-white/30">par mois</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <PricingFeature text="Campagnes SMS illimitées" />
                  <PricingFeature text="Contacts illimités" />
                  <PricingFeature text="Automations (anniversaires, rappels)" />
                  <PricingFeature text="Programmation d'envois" />
                  <PricingFeature text="A/B Testing" />
                  <PricingFeature text="Statistiques en temps réel" />
                  <PricingFeature text="Gestion d'équipe" />
                  <PricingFeature text="Sender ID personnalisé" />
                  <PricingFeature text="Support réactif" />
                </div>

                <div className="pt-6 border-t border-white/10">
                  <p className="text-sm text-white/40 text-center mb-5">
                    + Crédits SMS rechargeables selon vos besoins
                  </p>
                  <Link href="/auth/register" className="block w-full py-4 text-center text-base font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/25 transition-all">
                    Démarrer maintenant
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-wider mb-3">Processus</p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Démarrez en 3 étapes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <StepCard
              number="01"
              title="Inscrivez-vous"
              description="Remplissez le formulaire en 2 minutes. Votre compte est activé après validation rapide."
            />
            <StepCard
              number="02"
              title="Importez vos contacts"
              description="Ajoutez manuellement ou importez un fichier CSV. Créez des groupes pour cibler finement."
            />
            <StepCard
              number="03"
              title="Envoyez vos SMS"
              description="Rédigez, personnalisez et envoyez. Suivez les résultats en temps réel sur votre dashboard."
            />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[80px]" />

            <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Prêt à booster votre communication ?
              </h2>
              <p className="mt-4 text-lg text-white/70 max-w-lg mx-auto">
                Rejoignez les entreprises qui font confiance à SMS Pro pour développer leur relation client.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/register" className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-violet-700 bg-white rounded-xl hover:bg-violet-50 shadow-xl shadow-black/20 transition-all flex items-center justify-center gap-2">
                  Créer mon compte
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="tel:+22670000000" className="w-full sm:w-auto px-8 py-4 text-base font-medium text-white border-2 border-white/20 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <Phone className="h-5 w-5" />
                  Nous contacter
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Send className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">SMS Pro</span>
          </div>
          <p className="text-sm text-white/30">
            &copy; {new Date().getFullYear()} SMS Pro. Tous droits réservés. Developed by MARIKX GROUP.
          </p>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/auth/login" className="hover:text-white transition-colors">Connexion</Link>
            <Link href="/auth/register" className="hover:text-white transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// COMPOSANTS
// ============================================

function StatBadge({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
      <Icon className="h-5 w-5 text-violet-400 shrink-0" />
      <div>
        <p className="text-sm font-bold text-white">{value}</p>
        <p className="text-[11px] text-white/40">{label}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, gradient, iconColor }: {
  icon: any; title: string; description: string; gradient: string; iconColor: string;
}) {
  return (
    <div className="group relative p-6 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 mb-4">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/40 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
      </div>
      <span className="text-sm text-white/70">{text}</span>
    </div>
  );
}

function StepCard({ number, title, description }: {
  number: string; title: string; description: string;
}) {
  return (
    <div className="relative text-center md:text-left">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 mb-5">
        <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">{number}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40 leading-relaxed">{description}</p>
    </div>
  );
}
