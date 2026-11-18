/* ============================================================
 * Contrat de données de l'application MADATRANS.
 * Toute l'interface passe par `DataSource` : pour brancher les
 * vraies données, il suffit d'en fournir une autre implémentation.
 * ============================================================ */

/* ---------- Référentiels ---------- */
export interface Truck { id: string; plate: string; model: string; postId: string; driverIds: string[]; status: "actif" | "atelier" | "inactif" }
export interface Driver { id: string; name: string; shift: "jour" | "nuit" }
export interface Client { id: string; name: string }
export interface Post { id: string; name: string; clientId: string }
export interface Supplier { id: string; name: string; category: CostCategory }

export const COST_CATEGORIES = ["gasoil", "adblue", "peages", "entretien", "chauffeur", "vehicule", "bureau", "divers"] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];
export type Category = "ca" | CostCategory;
export type CommonBloc = "bureau" | "divers";

/* ---------- Lignes brutes ---------- */
export type LineSource = "transaction" | "proforma" | "facture" | "saisie";

/** Une ligne élémentaire : tout montant affiché est une somme de ces lignes. */
export interface FactLine {
  id: string;
  date: string; // yyyy-mm-dd
  label: string;
  source: LineSource;
  documentRef: string | null;
  category: Category;
  amountHT: number; // positif ; le sens est donné par la catégorie
  vatRate: number;
  truckId: string | null; // null = frais commun
  postId: string | null;
  clientId: string | null;
  driverId: string | null;
  supplierId: string | null;
  bloc: CommonBloc | null;
  exceptional: boolean;
  litres: number | null;
  days: number | null; // jours roulés (lignes de CA)
  paidDate: string | null; // lignes de CA : date d'encaissement
}

export type TransactionStatus = "classee" | "a_verifier" | "justificatif_manquant";
export interface Transaction {
  id: string;
  date: string;
  label: string;
  amountTTC: number; // signé : + entrée, − sortie
  amountHT: number;
  category: Category | "encaissement" | "virement";
  truckId: string | null;
  bloc: CommonBloc | null;
  status: TransactionStatus;
  hasAttachment: boolean;
}

export interface DocumentLine {
  id: string;
  documentRef: string;
  date: string;
  bordereau: string;
  tournee: string;
  amountHT: number;
  truckId: string | null;
}

export type Severity = "haute" | "moyenne" | "basse";
export type AlertKind = "indexation" | "doublon" | "jours" | "inhabituelle" | "justificatif" | "prix" | "tva";
export interface Alert { id: string; kind: AlertKind; severity: Severity; type: string; description: string; amount: number | null; date: string; resolved: boolean }

export interface Settings { companyName: string; openingBalance: number; monthlyDebtService: number; openingBalanceDate: string; vatRate: number; lastSync: string; allocationKey: AllocationKey }

/* ---------- Requête analytique ---------- */
export const MEASURES = [
  "ca_ht", "couts_ht", "marge_ht", "taux_marge", "gasoil", "adblue", "peages", "entretien",
  "entretien_exceptionnel", "chauffeur", "vehicule", "bureau", "divers", "encaisse", "en_attente",
  "solde", "litres", "jours_roules",
] as const;
export type Measure = (typeof MEASURES)[number];

export const DIMENSIONS = ["mois", "semaine", "camion", "poste", "client", "chauffeur", "categorie", "fournisseur", "bloc_commun"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type CommonCostsMode = "apres" | "avant";
/** Clé de répartition des frais communs entre camions actifs du mois */
export type AllocationKey = "parts_egales" | "prorata_ca" | "prorata_jours";

export interface QueryFilters {
  trucks?: string[] | undefined;
  clients?: string[] | undefined;
  posts?: string[] | undefined;
  categories?: Category[] | undefined;
  suppliers?: string[] | undefined;
  /** "avant" = sans bureau/divers ; "apres" = frais communs répartis selon Settings.allocationKey (parts égales par défaut) */
  commonCosts?: CommonCostsMode | undefined;
  excludeExceptional?: boolean | undefined;
}

export type PeriodType = "mois" | "trimestre" | "annee" | "plage" | "mois_type";
/** Plage de mois inclusive (yyyy-mm). Pour "mois_type", les flux sont divisés par le nombre de mois. */
export interface Period { type: PeriodType; start: string; end: string }

export type Granularity = "mois" | "semaine";

export interface AnalyticsQuery {
  measures: Measure[];
  dimensions: Dimension[];
  filters?: QueryFilters | undefined;
  period: Period;
  granularity?: Granularity | undefined;
}

export interface AnalyticsRow {
  /** Clé brute par dimension (ex. camion → "cx-090-jh", mois → "2026-10") */
  keys: Partial<Record<Dimension, string>>;
  /** Libellé lisible par dimension */
  labels: Partial<Record<Dimension, string>>;
  values: Record<Measure, number>;
}

export interface AnalyticsResult { rows: AnalyticsRow[]; totals: Record<Measure, number> }

/** Lignes qui composent un montant (drill-down). `keys` restreint à une cellule précise. */
export interface DetailQuery {
  measure: Measure;
  period: Period;
  filters?: QueryFilters | undefined;
  keys?: Partial<Record<Dimension, string>> | undefined;
}
export interface DetailLine { id: string; date: string; label: string; source: LineSource; documentRef: string | null; truck: string | null; amount: number }

/* ---------- Tableaux de bord ---------- */
export const CHART_TYPES = ["bar", "stacked", "line", "area", "donut", "waterfall", "table", "kpi", "heatmap", "scatter", "hero", "pastel", "gauge", "monthbars", "spotlight", "watchlist", "section"] as const;
/** Couleur d'accent d'un widget (cartes pastel, jauges) */
export type WidgetTone = "green" | "peach" | "blue" | "lilac";
export type ChartType = (typeof CHART_TYPES)[number];

export interface WidgetConfig {
  id: string;
  title: string;
  type: ChartType;
  measures: Measure[];
  dimension: Dimension | null;
  /** Deuxième dimension (barres empilées, carte de chaleur) */
  series: Dimension | null;
  filters: QueryFilters;
  sort: "desc" | "asc" | "none";
  topN: number | null;
  unit: "eur" | "pct";
  tone?: WidgetTone | undefined;
  layout: { x: number; y: number; w: number; h: number };
}

export interface SavedView { id: string; name: string; builtIn: boolean; widgets: WidgetConfig[]; updatedAt: string }

/* ---------- Source de données ---------- */
export interface DataSource {
  // Référentiels
  listTrucks(): Promise<Truck[]>;
  listDrivers(): Promise<Driver[]>;
  listClients(): Promise<Client[]>;
  listPosts(): Promise<Post[]>;
  listSuppliers(): Promise<Supplier[]>;
  // Lignes
  listTransactions(period: Period): Promise<Transaction[]>;
  listDocumentLines(documentRef?: string): Promise<DocumentLine[]>;
  listAlerts(): Promise<Alert[]>;
  resolveAlert(id: string): Promise<void>;
  getSettings(): Promise<Settings>;
  /** Mois couverts par les données (yyyy-mm) */
  getAvailableMonths(): Promise<string[]>;
  // Analytique
  query(q: AnalyticsQuery): Promise<AnalyticsResult>;
  getDetails(q: DetailQuery): Promise<DetailLine[]>;
  // Vues enregistrées
  listViews(): Promise<SavedView[]>;
  saveView(view: SavedView): Promise<SavedView>;
  deleteView(id: string): Promise<void>;
  getDefaultViewId(): Promise<string>;
  setDefaultViewId(id: string): Promise<void>;
}
