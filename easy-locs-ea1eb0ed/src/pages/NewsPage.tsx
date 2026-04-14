import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Newspaper, Clock, Globe, ExternalLink } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";

type NewsCategory = "all" | "immobilier" | "finance" | "economie" | "local";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  source: string;
  publishedAt: string;
  imageUrl?: string;
}

const CATEGORIES: { key: NewsCategory; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "immobilier", label: "Immobilier" },
  { key: "finance", label: "Finance" },
  { key: "economie", label: "Économie" },
  { key: "local", label: "Local" },
];

const MOCK_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "Le marché immobilier continue sa croissance au T1 2026",
    summary: "Les prix de l'immobilier résidentiel ont augmenté de 3,2 % au premier trimestre, portés par une demande soutenue dans les grandes métropoles.",
    category: "immobilier",
    source: "Le Monde Immobilier",
    publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "2",
    title: "BCE : les taux directeurs maintenus à 3,25 %",
    summary: "La Banque Centrale Européenne a décidé de maintenir ses taux directeurs inchangés lors de sa dernière réunion, citant une inflation maîtrisée.",
    category: "finance",
    source: "Les Échos",
    publishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: "3",
    title: "Nouvelles réglementations pour les locations saisonnières",
    summary: "Le gouvernement annonce un encadrement renforcé des locations de courte durée, avec de nouvelles obligations déclaratives pour les propriétaires.",
    category: "immobilier",
    source: "Le Figaro",
    publishedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: "4",
    title: "L'euro se stabilise face au dollar à 1,08",
    summary: "Après plusieurs semaines de volatilité, la paire EUR/USD retrouve une zone de stabilité autour de 1,08, soutenue par des indicateurs économiques positifs.",
    category: "finance",
    source: "Bloomberg FR",
    publishedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "5",
    title: "Croissance du PIB : +0,4 % au premier trimestre",
    summary: "L'économie française affiche une croissance modérée mais positive, soutenue par la consommation des ménages et les investissements des entreprises.",
    category: "economie",
    source: "INSEE",
    publishedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: "6",
    title: "Ouverture d'un nouveau quartier d'affaires à Lyon",
    summary: "Le projet urbain Part-Dieu 2026 entre dans sa phase finale avec l'inauguration de 45 000 m² de bureaux et commerces.",
    category: "local",
    source: "Lyon Capitale",
    publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "7",
    title: "DPE : les passoires thermiques interdites à la location",
    summary: "À partir de 2026, les logements classés G au DPE ne pourront plus être proposés à la location, impactant près de 600 000 biens en France.",
    category: "immobilier",
    source: "Le Moniteur",
    publishedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
  },
  {
    id: "8",
    title: "Les fintech africaines lèvent 1,2 milliard $ en 2025",
    summary: "Le secteur des technologies financières en Afrique poursuit sa dynamique avec des levées de fonds record, notamment dans le mobile money et les paiements.",
    category: "economie",
    source: "Jeune Afrique",
    publishedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
];

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <motion.article
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
            style={{ background: `${GOLD}18`, color: GOLD }}
          >
            {CATEGORIES.find(c => c.key === item.category)?.label ?? item.category}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />
            {formatRelativeTime(item.publishedAt)}
          </span>
        </div>

        <h3 className="text-sm font-bold leading-snug mb-1.5" style={{ color: "hsl(var(--foreground))" }}>
          {item.title}
        </h3>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {item.summary}
        </p>

        <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: "1px solid hsl(var(--border)/0.5)" }}>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Globe size={10} />
            <span>{item.source}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: GOLD }}>
            <span>Lire</span>
            <ExternalLink size={10} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function NewsPage() {
  useUiEngine("newspage");
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");

  const filteredNews = activeCategory === "all"
    ? MOCK_NEWS
    : MOCK_NEWS.filter(n => n.category === activeCategory);

  return (
    <SubPageShell>
      <SEOHead
        title="Actualités — Easy-Locs"
        description="Suivez les dernières actualités immobilières, financières et économiques."
      />

      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{ background: NAVY, borderBottom: `1px solid ${GOLD}33` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
          aria-label="Retour"
        >
          <ChevronLeft size={20} style={{ color: GOLD }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate" style={{ color: GOLD }}>
            Actualités
          </h1>
          <p className="text-[11px] truncate" style={{ color: `${GOLD}99` }}>
            Immobilier, finance & économie
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}18` }}
        >
          <Newspaper size={18} style={{ color: GOLD }} />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: activeCategory === cat.key ? GOLD : "hsl(var(--muted)/0.4)",
                color: activeCategory === cat.key ? NAVY : "hsl(var(--muted-foreground))",
                border: activeCategory === cat.key ? `1px solid ${GOLD}` : "1px solid hsl(var(--border))",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredNews.length === 0 ? (
          <div className="text-center py-12">
            <Newspaper size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucune actualité disponible dans cette catégorie.
            </p>
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {filteredNews.map(item => (
              <NewsCard key={item.id} item={item} />
            ))}
          </motion.div>
        )}

        <div className="text-center py-2">
          <p className="text-[10px] text-muted-foreground">
            Actualités à titre indicatif · Mis à jour régulièrement
          </p>
        </div>
      </div>
    </SubPageShell>
  );
}
