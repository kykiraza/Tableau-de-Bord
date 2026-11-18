import type { LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, BarChart3, Bot, ClipboardCheck, FileText, LayoutDashboard, ListChecks, Settings, TrendingUp, Truck, Wallet, Database, Compass } from "lucide-react";

export interface NavItem { to: NonNullable<LinkProps["to"]>; label: string; icon: LucideIcon }
export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Pilotage",
    items: [
      { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
      { to: "/rentabilite", label: "Rentabilité par camion", icon: Truck },
      { to: "/encaissements", label: "Encaissements", icon: Wallet },
      { to: "/previsionnel", label: "Prévisionnel", icon: TrendingUp },
    ],
  },
  {
    label: "Données",
    items: [
      { to: "/explorer", label: "Explorer", icon: Compass },
      { to: "/transactions", label: "Transactions", icon: BarChart3 },
      { to: "/documents", label: "Documents", icon: FileText },
      { to: "/a-verifier", label: "À vérifier", icon: ClipboardCheck },
      { to: "/alertes", label: "Alertes", icon: AlertTriangle },
    ],
  },
  {
    label: "Outils",
    items: [
      { to: "/referentiels", label: "Référentiels", icon: Database },
    ],
  },
];

/** Liens du bas de la barre latérale */
export const footerNav: NavItem[] = [
  { to: "/assistant", label: "Support", icon: Bot },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];
export const allNavItems = [...navGroups.flatMap((g) => g.items), ...footerNav];
export const ListIcon = ListChecks;
