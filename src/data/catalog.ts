import type { Category, ChartType, Dimension, Measure } from "./types";

export type MeasureFormat = "euro" | "percent" | "litres" | "days";
export interface MeasureMeta { label: string; description: string; format: MeasureFormat; higherIsBetter: boolean; kind: "flux" | "stock" | "ratio" }

export const MEASURE_META: Record<Measure, MeasureMeta> = {
  ca_ht: { label: "CA HT", description: "Somme des lignes de proformas et factures HT de la période.", format: "euro", higherIsBetter: true, kind: "flux" },
  couts_ht: { label: "Coûts totaux HT", description: "Coûts variables (gasoil, AdBlue, péages, entretien) + coûts fixes (chauffeurs, véhicule) + frais communs (bureau, divers) selon le mode choisi.", format: "euro", higherIsBetter: false, kind: "flux" },
  marge_ht: { label: "Marge HT", description: "CA HT − coûts totaux HT.", format: "euro", higherIsBetter: true, kind: "flux" },
  taux_marge: { label: "Taux de marge", description: "Marge HT ÷ CA HT. Variation exprimée en points.", format: "percent", higherIsBetter: true, kind: "ratio" },
  gasoil: { label: "Gasoil", description: "Achats de gasoil HT (cartes carburant).", format: "euro", higherIsBetter: false, kind: "flux" },
  adblue: { label: "AdBlue", description: "Achats d'AdBlue HT.", format: "euro", higherIsBetter: false, kind: "flux" },
  peages: { label: "Péages", description: "Péages et télépéage HT.", format: "euro", higherIsBetter: false, kind: "flux" },
  entretien: { label: "Entretien", description: "Entretien et réparations HT, y compris exceptionnelles (sauf filtre).", format: "euro", higherIsBetter: false, kind: "flux" },
  entretien_exceptionnel: { label: "Réparations exceptionnelles", description: "Interventions marquées « exceptionnel ».", format: "euro", higherIsBetter: false, kind: "flux" },
  chauffeur: { label: "Chauffeurs", description: "Salaires chargés des chauffeurs.", format: "euro", higherIsBetter: false, kind: "flux" },
  vehicule: { label: "Véhicule", description: "Leasing, assurance et carte grise.", format: "euro", higherIsBetter: false, kind: "flux" },
  bureau: { label: "Bureau", description: "Frais de structure (frais commun).", format: "euro", higherIsBetter: false, kind: "flux" },
  divers: { label: "Divers", description: "Autres frais communs.", format: "euro", higherIsBetter: false, kind: "flux" },
  encaisse: { label: "Encaissements", description: "Règlements clients reçus pendant la période (TTC).", format: "euro", higherIsBetter: true, kind: "flux" },
  en_attente: { label: "En attente de paiement", description: "Factures émises non réglées à la fin de la période (TTC).", format: "euro", higherIsBetter: false, kind: "stock" },
  solde: { label: "Solde Qonto", description: "Solde bancaire en fin de période : solde d'ouverture + encaissements − dépenses (hors TVA) − remboursements d'emprunts.", format: "euro", higherIsBetter: true, kind: "stock" },
  litres: { label: "Litres de gasoil", description: "Volume de gasoil acheté.", format: "litres", higherIsBetter: false, kind: "flux" },
  jours_roules: { label: "Jours roulés", description: "Jours facturés sur les proformas.", format: "days", higherIsBetter: true, kind: "flux" },
};

export const DIMENSION_LABEL: Record<Dimension, string> = {
  mois: "Mois", semaine: "Semaine", camion: "Camion", poste: "Poste", client: "Client",
  chauffeur: "Chauffeur", categorie: "Catégorie", fournisseur: "Fournisseur", bloc_commun: "Bloc commun",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  ca: "Chiffre d'affaires", gasoil: "Gasoil", adblue: "AdBlue", peages: "Péages", entretien: "Entretien",
  chauffeur: "Chauffeurs", vehicule: "Véhicule", bureau: "Bureau", divers: "Divers",
};

export const VARIABLE_CATEGORIES = new Set<Category>(["gasoil", "adblue", "peages", "entretien"]);

export const CHART_LABEL: Record<ChartType, string> = {
  bar: "Barres", stacked: "Barres empilées", line: "Ligne", area: "Aire", donut: "Barre 100 %", waterfall: "Cascade",
  table: "Tableau", kpi: "KPI", heatmap: "Carte de chaleur", scatter: "Nuage de points",
  hero: "Carte vedette", pastel: "Carte pastel", gauge: "Jauge", monthbars: "Barres par mois", spotlight: "Camion du mois",
  watchlist: "À surveiller", section: "Titre de section",
};
/** Types utilisables dans l'Explorer (les autres sont des cartes de tableau de bord). */
export const ANALYSIS_CHART_TYPES: ChartType[] = ["bar", "stacked", "line", "area", "donut", "waterfall", "table", "kpi", "heatmap", "scatter"];
/** Types sans dimension configurable (dimension implicite ou total). */
export const NO_DIMENSION_TYPES = new Set<ChartType>(["kpi", "waterfall", "hero", "pastel", "gauge", "monthbars", "spotlight", "watchlist", "section"]);
/** Dimension implicite utilisée à l'export. */
export const IMPLICIT_DIMENSION: Partial<Record<ChartType, Dimension>> = { monthbars: "mois", spotlight: "camion", watchlist: "camion" };

/** Mesure associée à une catégorie de coût. */
export const CATEGORY_MEASURE: Record<Category, Measure> = {
  ca: "ca_ht", gasoil: "gasoil", adblue: "adblue", peages: "peages", entretien: "entretien",
  chauffeur: "chauffeur", vehicule: "vehicule", bureau: "bureau", divers: "divers",
};
