import type { AnalyticsQuery, DataSource, Dimension, Period, SavedView } from "./types";
import { runDetails, runQuery, type EngineContext } from "./engine";
import { DEFAULT_VIEWS } from "./defaultViews";
import { alertsSeed, clients, drivers, FIRST_MONTH, getRawData, LAST_MONTH, posts, settings, suppliers, trucks } from "@/mocks/rawData";
import { monthEnd, monthsBetween } from "@/utils/period";

const VIEWS_KEY = "madatrans.views.v2";
const DEFAULT_KEY = "madatrans.defaultView.v2";
const ALERTS_KEY = "madatrans.resolvedAlerts.v1";

function readLS<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

const delay = <T,>(v: T, ms = 120) => new Promise<T>((res) => setTimeout(() => res(v), ms));

/** Source de données fictive : calcule tout à partir des lignes brutes de src/mocks/rawData.ts. */
export class MockDataSource implements DataSource {
  private ctx(): EngineContext {
    return {
      facts: getRawData().facts,
      openingBalance: settings.openingBalance,
      allocationKey: settings.allocationKey,
      monthlyDebtService: settings.monthlyDebtService,
      firstMonth: FIRST_MONTH,
      label: (d: Dimension, k: string) => {
        if (d === "camion") return trucks.find((t) => t.id === k)?.plate ?? k;
        if (d === "poste") return posts.find((p) => p.id === k)?.name ?? k;
        if (d === "client") return clients.find((c) => c.id === k)?.name ?? k;
        if (d === "chauffeur") return drivers.find((x) => x.id === k)?.name ?? k;
        if (d === "fournisseur") return suppliers.find((s) => s.id === k)?.name ?? k;
        return k;
      },
    };
  }

  listTrucks = () => delay(trucks, 20);
  listDrivers = () => delay(drivers, 20);
  listClients = () => delay(clients, 20);
  listPosts = () => delay(posts, 20);
  listSuppliers = () => delay(suppliers, 20);
  getSettings = () => delay(settings, 20);
  getAvailableMonths = () => delay(monthsBetween(FIRST_MONTH, LAST_MONTH), 10);

  listTransactions = (p: Period) => {
    const s = `${p.start}-01`, e = monthEnd(p.end);
    return delay(getRawData().transactions.filter((t) => t.date >= s && t.date <= e));
  };
  listDocumentLines = (ref?: string) => delay(getRawData().documentLines.filter((d) => !ref || d.documentRef === ref));
  listAlerts = () => {
    const resolved = readLS<string[]>(ALERTS_KEY, []);
    return delay(alertsSeed.map((a) => ({ ...a, resolved: resolved.includes(a.id) })), 40);
  };
  resolveAlert = async (id: string) => {
    const resolved = readLS<string[]>(ALERTS_KEY, []);
    writeLS(ALERTS_KEY, [...new Set([...resolved, id])]);
  };

  query = (q: AnalyticsQuery) => delay(runQuery(this.ctx(), q), 180);
  getDetails = (q: Parameters<DataSource["getDetails"]>[0]) => delay(runDetails(this.ctx(), q), 120);

  listViews = async () => {
    const custom = readLS<SavedView[]>(VIEWS_KEY, []);
    // Les vues fournies peuvent être modifiées : la version enregistrée remplace l'originale.
    const merged = DEFAULT_VIEWS.map((v) => custom.find((c) => c.id === v.id) ?? v);
    return delay([...merged, ...custom.filter((c) => !DEFAULT_VIEWS.some((d) => d.id === c.id))], 40);
  };
  saveView = async (view: SavedView) => {
    const custom = readLS<SavedView[]>(VIEWS_KEY, []);
    const next = { ...view, updatedAt: new Date().toISOString() };
    writeLS(VIEWS_KEY, [...custom.filter((v) => v.id !== view.id), next]);
    return next;
  };
  deleteView = async (id: string) => {
    writeLS(VIEWS_KEY, readLS<SavedView[]>(VIEWS_KEY, []).filter((v) => v.id !== id));
    if (readLS(DEFAULT_KEY, "") === id) writeLS(DEFAULT_KEY, "vue-gerant");
  };
  getDefaultViewId = async () => readLS(DEFAULT_KEY, "vue-gerant");
  setDefaultViewId = async (id: string) => writeLS(DEFAULT_KEY, id);
}
