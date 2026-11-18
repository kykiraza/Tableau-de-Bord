import { createContext, useContext, useMemo, type ReactNode } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { AnalyticsQuery, DataSource, DetailQuery } from "./types";
import { MockDataSource } from "./MockDataSource";

const DataContext = createContext<DataSource | null>(null);

/** Choisit la source de données de toute l'application. Remplacer MockDataSource ici pour brancher le backend. */
export function DataProvider({ children, source }: { children: ReactNode; source?: DataSource }) {
  const value = useMemo(() => source ?? new MockDataSource(), [source]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataSource(): DataSource {
  const ds = useContext(DataContext);
  if (!ds) throw new Error("useDataSource doit être utilisé dans <DataProvider>");
  return ds;
}

/* ---------- Requêtes prêtes à l'emploi (TanStack Query) ---------- */
export const dataKeys = {
  query: (q: AnalyticsQuery) => ["analytics", q] as const,
  details: (q: DetailQuery) => ["details", q] as const,
  views: ["views"] as const,
  defaultView: ["defaultView"] as const,
  alerts: ["alerts"] as const,
  refs: (k: string) => ["refs", k] as const,
};

export function useAnalytics(q: AnalyticsQuery | null) {
  const ds = useDataSource();
  return useQuery(queryOptions({ queryKey: q ? dataKeys.query(q) : ["analytics", "off"], queryFn: () => ds.query(q!), enabled: !!q, staleTime: 60_000 }));
}
export function useDetails(q: DetailQuery | null) {
  const ds = useDataSource();
  return useQuery({ queryKey: q ? dataKeys.details(q) : ["details", "off"], queryFn: () => ds.getDetails(q!), enabled: !!q });
}
export function useReferences() {
  const ds = useDataSource();
  const trucks = useQuery({ queryKey: dataKeys.refs("trucks"), queryFn: () => ds.listTrucks(), staleTime: Infinity });
  const clients = useQuery({ queryKey: dataKeys.refs("clients"), queryFn: () => ds.listClients(), staleTime: Infinity });
  const posts = useQuery({ queryKey: dataKeys.refs("posts"), queryFn: () => ds.listPosts(), staleTime: Infinity });
  const drivers = useQuery({ queryKey: dataKeys.refs("drivers"), queryFn: () => ds.listDrivers(), staleTime: Infinity });
  const suppliers = useQuery({ queryKey: dataKeys.refs("suppliers"), queryFn: () => ds.listSuppliers(), staleTime: Infinity });
  const months = useQuery({ queryKey: dataKeys.refs("months"), queryFn: () => ds.getAvailableMonths(), staleTime: Infinity });
  const settings = useQuery({ queryKey: dataKeys.refs("settings"), queryFn: () => ds.getSettings(), staleTime: Infinity });
  return { trucks: trucks.data ?? [], drivers: drivers.data ?? [], clients: clients.data ?? [], posts: posts.data ?? [], suppliers: suppliers.data ?? [], months: months.data ?? [], settings: settings.data };
}
export function useAlerts() {
  const ds = useDataSource();
  return useQuery({ queryKey: dataKeys.alerts, queryFn: () => ds.listAlerts() });
}
