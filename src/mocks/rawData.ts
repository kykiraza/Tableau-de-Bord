/**
 * Données brutes fictives : référentiels + lignes élémentaires sur 24 mois.
 * Tout est généré de façon déterministe (graine fixe) et paresseuse :
 * aucun calcul au chargement du module.
 */
import type { Alert, Category, Client, CommonBloc, DocumentLine, Driver, FactLine, Post, Settings, Supplier, Transaction, Truck } from "@/data/types";
import { monthKey, monthsBetween, shiftMonth } from "@/utils/period";

export const FIRST_MONTH = "2024-11";
export const LAST_MONTH = "2026-10";
const TODAY = "2026-11-16";

export const clients: Client[] = [
  { id: "xpo", name: "XPO" }, { id: "cdtrans", name: "CD Trans" }, { id: "prestalog", name: "Prestalog" },
  { id: "combronde", name: "Combronde" }, { id: "emitrans", name: "EMITRANS" },
];

export const posts: Post[] = [
  { id: "supp-spl", name: "Supp SPL", clientId: "xpo" },
  { id: "vl-bruges", name: "Tournée VL Bruges", clientId: "xpo" },
  { id: "vl-beychac", name: "Tournée VL Beychac", clientId: "xpo" },
  { id: "cdtrans", name: "CD Trans", clientId: "cdtrans" },
  { id: "prestalog", name: "Prestalog", clientId: "prestalog" },
  { id: "t118", name: "T 118", clientId: "xpo" },
  { id: "supp-spl-nuits", name: "Supp SPL & nuits", clientId: "xpo" },
  { id: "t113-t119", name: "T 113 / T 119", clientId: "xpo" },
  { id: "combronde", name: "Combronde", clientId: "combronde" },
  { id: "t119", name: "T 119", clientId: "xpo" },
  { id: "supp-spl-jn", name: "Supp SPL jour + nuits", clientId: "xpo" },
];

export const drivers: Driver[] = [
  ["d-karim", "Karim B."], ["d-julien", "Julien M."], ["d-sophie", "Sophie L."], ["d-thomas", "Thomas R."],
  ["d-nicolas", "Nicolas P."], ["d-mehdi", "Mehdi A."], ["d-alain", "Alain D."], ["d-kevin", "Kévin G."],
  ["d-laurent", "Laurent F."], ["d-yanis", "Yanis C."], ["d-patrick", "Patrick V."], ["d-david", "David H."],
  ["d-samir", "Samir O."],
].map(([id, name], i) => ({ id: id!, name: name!, shift: i === 12 ? "nuit" : "jour" }));

const T = (id: string, plate: string, model: string, postId: string, driverIds: string[]): Truck => ({ id, plate, model, postId, driverIds, status: "actif" });
export const trucks: Truck[] = [
  T("fa-877-ap", "FA 877 AP", "Renault T 480", "supp-spl", ["d-karim"]),
  T("fm-042-jt", "FM 042 JT", "Renault D Wide", "vl-bruges", ["d-julien"]),
  T("gy-814-cl", "GY 814 CL", "Renault D Wide", "vl-beychac", ["d-sophie"]),
  T("fq-983-yz", "FQ 983 YZ", "Volvo FH 460", "cdtrans", ["d-thomas"]),
  T("ga-384-md", "GA 384 MD", "DAF XF 480", "prestalog", ["d-nicolas"]),
  T("et-249-er", "ET 249 ER", "Renault T 480", "t118", ["d-mehdi"]),
  T("da-886-je", "DA 886 JE", "Scania R 450", "supp-spl-nuits", ["d-alain"]),
  T("cx-090-jh", "CX 090 JH", "Renault T 460", "t113-t119", ["d-kevin"]),
  T("gh-850-nq", "GH 850 NQ", "Volvo FH 460", "cdtrans", ["d-laurent"]),
  T("ex-953-cl", "EX 953 CL", "Iveco S-Way", "combronde", ["d-yanis"]),
  T("fl-820-tz", "FL 820 TZ", "Renault T 460", "t119", ["d-patrick"]),
  T("eg-512-kr", "EG 512 KR", "Scania R 500", "supp-spl-jn", ["d-david", "d-samir"]),
];

export const suppliers: Supplier[] = [
  { id: "total", name: "TotalEnergies", category: "gasoil" }, { id: "as24", name: "AS24", category: "gasoil" },
  { id: "as24-adblue", name: "AS24 AdBlue", category: "adblue" },
  { id: "ulys", name: "Ulys (Vinci)", category: "peages" }, { id: "sanef", name: "Sanef", category: "peages" },
  { id: "vulco", name: "Vulco", category: "entretien" }, { id: "euromaster", name: "Euromaster", category: "entretien" },
  { id: "renault-trucks", name: "Renault Trucks Mérignac", category: "entretien" },
  { id: "paie", name: "Paie (salaires chargés)", category: "chauffeur" },
  { id: "fardis", name: "FARDIS (leasing)", category: "vehicule" }, { id: "axa", name: "AXA Flotte", category: "vehicule" },
  { id: "loyer", name: "Loyer bureau", category: "bureau" }, { id: "expert", name: "Cabinet comptable", category: "bureau" },
  { id: "logiciels", name: "Logiciels & télécoms", category: "bureau" },
  { id: "divers-banque", name: "Frais bancaires", category: "divers" }, { id: "divers-autres", name: "Fournitures & divers", category: "divers" },
];

// Octobre 2026 : [CA HT, marge cible]
const OCT: Record<string, [number, number]> = {
  "fa-877-ap": [11000, 2100], "fm-042-jt": [9800, 1450], "gy-814-cl": [10200, 1600], "fq-983-yz": [11500, 1900],
  "ga-384-md": [8900, 1250], "et-249-er": [10400, 1700], "da-886-je": [12000, 2200], "cx-090-jh": [9600, -862.16],
  "gh-850-nq": [9800, 1850], "ex-953-cl": [7700, -70.4], "fl-820-tz": [9000, -370.5], "eg-512-kr": [15200, 1394.66],
};
// Saisonnalité par mois calendaire (janv → déc)
const SEASON = [0.93, 0.95, 1.01, 0.99, 1.02, 1.04, 0.97, 0.86, 1.03, 1, 0.96, 0.9];
const RATE_SHIFT = [-0.022, -0.016, 0.005, -0.004, 0.008, 0.013, -0.014, -0.049, 0.004, 0, -0.009, -0.035];

function prng(seed: number) {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const day = (m: string, d: number) => `${m}-${String(Math.min(28, Math.max(1, Math.round(d)))).padStart(2, "0")}`;
const addDays = (date: string, n: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

interface Generated { facts: FactLine[]; transactions: Transaction[]; documentLines: DocumentLine[] }
let cache: Generated | null = null;

export function getRawData(): Generated {
  if (cache) return cache;
  const rnd = prng(20261016);
  const noise = (pct: number) => 1 + (rnd() * 2 - 1) * pct;
  const facts: FactLine[] = [];
  let seq = 0;
  const postOf = (t: Truck) => posts.find((p) => p.id === t.postId)!;

  const push = (f: Omit<FactLine, "id" | "vatRate" | "exceptional" | "litres" | "days" | "paidDate" | "bloc" | "documentRef"> & Partial<FactLine>) => {
    facts.push({ id: `L${++seq}`, vatRate: 0.2, exceptional: false, litres: null, days: null, paidDate: null, bloc: null, documentRef: null, ...f, amountHT: r2(f.amountHT) });
  };

  for (const m of monthsBetween(FIRST_MONTH, LAST_MONTH)) {
    const mo = Number(m.slice(5));
    const yearFactor = m < "2025-11" ? 0.95 : 1;
    let commonBase = 0;
    for (const t of trucks) {
      const [caOct, mOct] = OCT[t.id]!;
      const p = postOf(t);
      const ca = m === LAST_MONTH ? caOct : caOct * SEASON[mo - 1]! * yearFactor * noise(0.04);
      const rate = m === LAST_MONTH ? mOct / caOct : mOct / caOct + RATE_SHIFT[mo - 1]! + (rnd() - 0.5) * 0.03;
      const costs = ca * (1 - rate);
      commonBase += costs * 0.075;
      const direct = costs * 0.925;
      const base = { truckId: t.id, postId: p.id, clientId: p.clientId };

      // CA : 4 lignes de proforma hebdomadaires
      const docRef = `PF-${p.clientId.toUpperCase()}-${m.replace("-", "")}-${t.plate.slice(0, 2)}`;
      const weights = [noise(0.1), noise(0.1), noise(0.1), noise(0.1)];
      const wsum = weights.reduce((a, b) => a + b, 0);
      weights.forEach((w, i) => {
        const date = day(m, 5 + i * 7);
        const paid = p.clientId === "xpo" ? addDays(date, 7 + Math.floor(rnd() * 6)) : addDays(`${m}-28`, 20 + Math.floor(rnd() * 25));
        push({ ...base, date, label: `${p.name} — semaine ${i + 1}`, source: "proforma", documentRef: docRef, category: "ca", amountHT: (ca * w) / wsum, driverId: t.driverIds[i % t.driverIds.length]!, supplierId: null, days: i === 3 ? 4 + Math.round(rnd()) : 5, paidDate: paid <= TODAY ? paid : null });
      });

      const shares: [Category, number][] = [["gasoil", 0.28], ["adblue", 0.015], ["peages", 0.07], ["entretien", 0.06], ["vehicule", 0.12]];
      let used = 0;
      for (const [cat, s] of shares) {
        let amount = (direct * s) / 0.925 * noise(0.08);
        if (cat === "entretien" && t.id === "cx-090-jh" && m === LAST_MONTH) amount *= 1.4;
        if (cat === "gasoil") {
          const n = 4;
          for (let i = 0; i < n; i++) {
            const a = amount / n * noise(0.1);
            push({ ...base, date: day(m, 3 + i * 7 + rnd() * 3), label: `Carte carburant ${i % 2 ? "AS24" : "TotalEnergies"}`, source: "transaction", category: "gasoil", amountHT: a, driverId: null, supplierId: i % 2 ? "as24" : "total", litres: Math.round(a / 1.42) });
            used += r2(a);
          }
        } else if (cat === "peages") {
          for (let i = 0; i < 2; i++) { const a = amount / 2; push({ ...base, date: day(m, 14 + i * 14), label: i ? "Relevé Sanef" : "Relevé télépéage Ulys", source: "transaction", category: "peages", amountHT: a, driverId: null, supplierId: i ? "sanef" : "ulys" }); used += r2(a); }
        } else if (cat === "entretien") {
          const sup = ["vulco", "euromaster", "renault-trucks"][Math.floor(rnd() * 3)]!;
          const exceptional = (t.id === "cx-090-jh" && (m === LAST_MONTH || m === "2026-06")) || rnd() < 0.03;
          if (exceptional) {
            const big = amount * 0.65;
            push({ ...base, date: day(m, 18), label: "Réparation boîte de vitesses", source: "facture", documentRef: `FAC-${sup.toUpperCase()}-${m}`, category: "entretien", amountHT: big, driverId: null, supplierId: "renault-trucks", exceptional: true });
            push({ ...base, date: day(m, 9), label: "Entretien courant (vidange, filtres)", source: "facture", category: "entretien", amountHT: amount - big, driverId: null, supplierId: sup });
          } else {
            push({ ...base, date: day(m, 9 + rnd() * 10), label: rnd() < 0.5 ? "Pneumatiques" : "Entretien courant (vidange, filtres)", source: "facture", documentRef: `FAC-${sup.toUpperCase()}-${m}`, category: "entretien", amountHT: amount, driverId: null, supplierId: sup });
          }
          used += r2(amount);
        } else if (cat === "vehicule") {
          push({ ...base, date: day(m, 5), label: "Loyer leasing FARDIS", source: "transaction", category: "vehicule", amountHT: amount * 0.82, driverId: null, supplierId: "fardis" });
          push({ ...base, date: day(m, 10), label: "Assurance flotte AXA", source: "transaction", category: "vehicule", amountHT: amount * 0.18, driverId: null, supplierId: "axa" });
          used += r2(amount * 0.82) + r2(amount * 0.18);
        } else {
          push({ ...base, date: day(m, 20), label: "AdBlue AS24", source: "transaction", category: cat, amountHT: amount, driverId: null, supplierId: "as24-adblue" });
          used += r2(amount);
        }
      }
      // Chauffeur(s) : le reste des coûts directs
      const salary = direct - used;
      t.driverIds.forEach((d) => {
        push({ ...base, date: day(m, 28), label: `Salaire chargé — ${drivers.find((x) => x.id === d)!.name}`, source: "saisie", category: "chauffeur", amountHT: salary / t.driverIds.length, driverId: d, supplierId: "paie", vatRate: 0 });
      });
    }
    // Frais communs
    const commons: [CommonBloc, string, string, number][] = [
      ["bureau", "loyer", "Loyer bureau & dépôt", 0.22], ["bureau", "expert", "Honoraires expert-comptable", 0.17], ["bureau", "logiciels", "Logiciels, téléphonie", 0.144],
      ["divers", "divers-banque", "Frais bancaires & affacturage", 0.21], ["divers", "divers-autres", "Fournitures et divers", 0.256],
    ];
    // Entretien non rattaché à un camion (facture sans immatriculation)
    push({ date: day(m, 12), label: "Facture atelier sans immatriculation", source: "facture", documentRef: `FAC-ATELIER-${m}`, category: "entretien", amountHT: 180 + ((Number(m.slice(5)) * 37) % 260), truckId: null, postId: null, clientId: null, driverId: null, supplierId: "vulco", bloc: null });
    for (const [bloc, sup, label, s] of commons) {
      push({ date: day(m, 6 + Math.floor(rnd() * 15)), label, source: "transaction", category: bloc, amountHT: commonBase * (s / 1) * noise(0.05), truckId: null, postId: null, clientId: null, driverId: null, supplierId: sup, bloc });
    }
  }

  // Transactions bancaires
  const transactions: Transaction[] = [];
  facts.filter((f) => f.category !== "ca").forEach((f) => {
    const flag = rnd();
    transactions.push({
      id: `T-${f.id}`, date: f.date, label: f.label, amountTTC: -r2(f.amountHT * (1 + f.vatRate)), amountHT: -f.amountHT,
      category: f.category, truckId: f.truckId, bloc: f.bloc,
      status: f.date >= "2026-10-20" && flag < 0.12 ? "a_verifier" : flag < 0.03 ? "justificatif_manquant" : "classee",
      hasAttachment: flag >= 0.03,
    });
  });
  // Encaissements clients groupés par client et par date de paiement
  const receipts = new Map<string, number>();
  facts.filter((f) => f.category === "ca" && f.paidDate).forEach((f) => {
    const k = `${f.paidDate}|${f.clientId}`;
    receipts.set(k, (receipts.get(k) ?? 0) + f.amountHT * 1.2);
  });
  [...receipts.entries()].forEach(([k, v], i) => {
    const [date, clientId] = k.split("|");
    const viaFacto = clientId === "xpo";
    transactions.push({ id: `R${i}`, date: date!, label: viaFacto ? "Virement Factofrance (XPO)" : `Virement ${clients.find((c) => c.id === clientId)!.name}`, amountTTC: r2(v), amountHT: r2(v / 1.2), category: viaFacto ? "virement" : "encaissement", truckId: null, bloc: null, status: "classee", hasAttachment: true });
  });
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  const documentLines: DocumentLine[] = facts.filter((f) => f.category === "ca").map((f) => ({
    id: `D-${f.id}`, documentRef: f.documentRef!, date: f.date, bordereau: `B${f.id.slice(1).padStart(6, "0")}`,
    tournee: posts.find((p) => p.id === f.postId)?.name ?? "—", amountHT: f.amountHT, truckId: f.truckId,
  }));

  cache = { facts, transactions, documentLines };
  return cache;
}

export const settings: Settings = { companyName: "MADATRANS", openingBalance: 62000, monthlyDebtService: 9800, openingBalanceDate: `${FIRST_MONTH}-01`, vatRate: 0.2, lastSync: "2026-11-16T15:12:00Z", allocationKey: "parts_egales" };

export const alertsSeed: Alert[] = [
  { id: "a1", kind: "indexation", severity: "haute", type: "Indexation gasoil manquante", description: "Proforma XPO octobre — T 113 sans indexation GO", amount: 412.8, date: "2026-11-14", resolved: false },
  { id: "a2", kind: "doublon", severity: "haute", type: "Doublon", description: "Facture TotalEnergies réglée deux fois", amount: 1284.36, date: "2026-11-13", resolved: false },
  { id: "a3", kind: "jours", severity: "moyenne", type: "Jours absents d'une proforma", description: "CD Trans — 2 jours manquants pour GH 850 NQ", amount: 640, date: "2026-11-12", resolved: false },
  { id: "a4", kind: "inhabituelle", severity: "moyenne", type: "Dépense inhabituelle", description: "Entretien CX 090 JH : réparation boîte de vitesses", amount: 2180.4, date: "2026-11-10", resolved: false },
  { id: "a5", kind: "justificatif", severity: "basse", type: "Facture sans justificatif", description: "Paiement Vulco du 06/11 sans pièce jointe", amount: 186.9, date: "2026-11-08", resolved: false },
  { id: "a6", kind: "prix", severity: "moyenne", type: "Écart de prix", description: "Prestalog — tarif journée inférieur au forfait de 35 €", amount: 175, date: "2026-11-05", resolved: false },
  { id: "a7", kind: "tva", severity: "basse", type: "TVA à 0 % sans mention", description: "Facture Euromaster n° 88412", amount: 96.4, date: "2026-11-03", resolved: false },
];

export { monthKey, shiftMonth };
