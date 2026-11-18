import type { SavedView, WidgetConfig, WidgetTone } from "./types";

const w = (id: string, title: string, rest: Partial<WidgetConfig> & Pick<WidgetConfig, "type" | "measures" | "layout">): WidgetConfig => ({
  id, title, dimension: null, series: null, filters: {}, sort: "none", topN: null, unit: "eur", ...rest,
});
const pastel = (id: string, title: string, m: WidgetConfig["measures"][number], tone: WidgetTone, x: number, y: number, width = 4) =>
  w(id, title, { type: "pastel", measures: [m], tone, layout: { x, y, w: width, h: 3 } });

const kpiRow = (prefix: string, y = 0): WidgetConfig[] => [
  pastel(`${prefix}-k1`, "Marge HT", "marge_ht", "lilac", 0, y, 3),
  pastel(`${prefix}-k2`, "CA HT", "ca_ht", "green", 3, y, 3),
  pastel(`${prefix}-k3`, "Coûts HT", "couts_ht", "peach", 6, y, 3),
  pastel(`${prefix}-k4`, "Solde Qonto", "solde", "blue", 9, y, 3),
];

export const DEFAULT_VIEWS: SavedView[] = [
  {
    id: "vue-gerant", name: "Vue gérant", builtIn: true, updatedAt: "2026-11-16T00:00:00Z",
    widgets: [
      w("g-hero", "Marge HT du mois", { type: "hero", measures: ["marge_ht"], layout: { x: 0, y: 0, w: 12, h: 3 } }),
      w("g-s1", "Résultat du mois", { type: "section", measures: [], layout: { x: 0, y: 3, w: 12, h: 1 } }),
      pastel("g-p1", "CA HT", "ca_ht", "green", 0, 4),
      pastel("g-p2", "Coûts HT", "couts_ht", "peach", 4, 4),
      pastel("g-p3", "Solde Qonto", "solde", "blue", 8, 4),
      w("g-j1", "Jours roulés", { type: "gauge", measures: ["jours_roules"], tone: "blue", layout: { x: 0, y: 7, w: 4, h: 3 } }),
      w("g-j2", "Coût par jour", { type: "gauge", measures: ["couts_ht", "jours_roules"], tone: "peach", layout: { x: 4, y: 7, w: 4, h: 3 } }),
      w("g-j3", "Taux de marge", { type: "gauge", measures: ["taux_marge"], tone: "green", layout: { x: 8, y: 7, w: 4, h: 3 } }),
      w("g-s2", "Évolution", { type: "section", measures: [], layout: { x: 0, y: 10, w: 12, h: 1 } }),
      w("g-ev", "CA et coûts", { type: "line", measures: ["ca_ht", "couts_ht"], dimension: "mois", layout: { x: 0, y: 11, w: 12, h: 6 } }),
      w("g-mb", "Marge par mois", { type: "monthbars", measures: ["marge_ht"], layout: { x: 0, y: 17, w: 8, h: 6 } }),
      w("g-cm", "Camion du mois", { type: "spotlight", measures: ["marge_ht"], layout: { x: 8, y: 17, w: 4, h: 6 } }),
      w("g-t", "Marge par camion", { type: "bar", measures: ["marge_ht"], dimension: "camion", sort: "desc", layout: { x: 0, y: 23, w: 7, h: 8 } }),
      w("g-ws", "À surveiller", { type: "watchlist", measures: ["marge_ht"], layout: { x: 7, y: 23, w: 5, h: 8 } }),
      w("g-w", "Du CA à la marge", { type: "waterfall", measures: ["ca_ht"], layout: { x: 0, y: 31, w: 7, h: 6 } }),
      w("g-d", "Répartition des dépenses", { type: "donut", measures: ["couts_ht"], dimension: "categorie", unit: "pct", layout: { x: 7, y: 31, w: 5, h: 6 } }),
    ],
  },
  {
    id: "vue-rentabilite", name: "Vue rentabilité", builtIn: true, updatedAt: "2026-11-16T00:00:00Z",
    widgets: [
      ...kpiRow("r"),
      w("r-mb", "Marge par mois", { type: "monthbars", measures: ["marge_ht"], layout: { x: 0, y: 3, w: 8, h: 6 } }),
      w("r-ws", "À surveiller", { type: "watchlist", measures: ["marge_ht"], layout: { x: 8, y: 3, w: 4, h: 6 } }),
      w("r-h", "Marge par camion et par mois", { type: "heatmap", measures: ["marge_ht"], dimension: "camion", series: "mois", layout: { x: 0, y: 9, w: 12, h: 7 } }),
      w("r-sc", "CA vs coûts par camion", { type: "scatter", measures: ["ca_ht", "couts_ht"], dimension: "camion", layout: { x: 0, y: 16, w: 6, h: 7 } }),
      w("r-st", "Coûts par camion", { type: "stacked", measures: ["gasoil", "peages", "entretien", "chauffeur", "vehicule", "bureau", "divers"], dimension: "camion", sort: "desc", layout: { x: 6, y: 16, w: 6, h: 7 } }),
      w("r-tb", "Rentabilité par camion", { type: "table", measures: ["ca_ht", "couts_ht", "marge_ht", "taux_marge"], dimension: "camion", sort: "desc", layout: { x: 0, y: 23, w: 12, h: 7 } }),
    ],
  },
  {
    id: "vue-tresorerie", name: "Vue trésorerie", builtIn: true, updatedAt: "2026-11-16T00:00:00Z",
    widgets: [
      pastel("t-k1", "Solde Qonto", "solde", "blue", 0, 0),
      pastel("t-k2", "Encaissements", "encaisse", "green", 4, 0),
      pastel("t-k3", "En attente de paiement", "en_attente", "peach", 8, 0),
      w("t-s", "Solde de trésorerie", { type: "area", measures: ["solde"], dimension: "mois", layout: { x: 0, y: 3, w: 8, h: 6 } }),
      w("t-c", "Encaissements par client", { type: "donut", measures: ["encaisse"], dimension: "client", layout: { x: 8, y: 3, w: 4, h: 6 } }),
      w("t-e", "Encaissé vs en attente par mois", { type: "line", measures: ["encaisse", "en_attente"], dimension: "mois", layout: { x: 0, y: 9, w: 12, h: 6 } }),
    ],
  },
];
