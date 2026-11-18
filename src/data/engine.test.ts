import { describe, expect, it } from "vitest";
import { MockDataSource } from "./MockDataSource";
import type { Period } from "./types";

const oct: Period = { type: "mois", start: "2026-10", end: "2026-10" };
const ds = new MockDataSource();

describe("moteur d'agrégation", () => {
  it("le CA d'octobre 2026 vaut la somme des lignes (≈ 125 100 €)", async () => {
    const r = await ds.query({ measures: ["ca_ht"], dimensions: [], period: oct });
    expect(Math.round(r.totals.ca_ht)).toBe(125100);
  });

  it("marge = CA − coûts", async () => {
    const r = await ds.query({ measures: ["ca_ht", "couts_ht", "marge_ht"], dimensions: [], period: oct });
    expect(r.totals.marge_ht).toBeCloseTo(r.totals.ca_ht - r.totals.couts_ht, 1);
  });

  it("les frais communs répartis par camion retombent sur le total", async () => {
    const all = await ds.query({ measures: ["couts_ht"], dimensions: [], period: oct });
    const byTruck = await ds.query({ measures: ["couts_ht"], dimensions: ["camion"], period: oct });
    const sum = byTruck.rows.reduce((a, r) => a + r.values.couts_ht, 0);
    expect(sum).toBeCloseTo(all.totals.couts_ht, 0);
  });

  it("frais communs : parts égales entre les camions actifs du mois", async () => {
    const all = await ds.query({ measures: ["bureau", "divers"], dimensions: [], period: oct });
    const byTruck = await ds.query({ measures: ["bureau", "divers", "ca_ht"], dimensions: ["camion"], period: oct });
    const active = byTruck.rows.filter((r) => r.values.ca_ht > 0);
    expect(active.length).toBe(12);
    for (const r of active) {
      expect(r.values.bureau).toBeCloseTo(all.totals.bureau / 12, 1);
      expect(r.values.divers).toBeCloseTo(all.totals.divers / 12, 1);
    }
  });

  it("somme des marges des camions + Non attribué = marge totale", async () => {
    const all = await ds.query({ measures: ["marge_ht"], dimensions: [], period: oct });
    const byTruck = await ds.query({ measures: ["marge_ht"], dimensions: ["camion"], period: oct });
    expect(byTruck.rows.some((r) => r.keys.camion === "__none__")).toBe(true);
    expect(byTruck.rows.reduce((a, r) => a + r.values.marge_ht, 0)).toBeCloseTo(all.totals.marge_ht, 0);
  });

  it("« avant frais communs » exclut bureau et divers", async () => {
    const r = await ds.query({ measures: ["bureau", "divers"], dimensions: [], period: oct, filters: { commonCosts: "avant" } });
    expect(r.totals.bureau + r.totals.divers).toBe(0);
  });

  it("hors réparations exceptionnelles retire l'exceptionnel de l'entretien", async () => {
    const f = { trucks: ["cx-090-jh"] };
    const a = await ds.query({ measures: ["entretien", "entretien_exceptionnel"], dimensions: [], period: oct, filters: f });
    const b = await ds.query({ measures: ["entretien"], dimensions: [], period: oct, filters: { ...f, excludeExceptional: true } });
    expect(a.totals.entretien_exceptionnel).toBeGreaterThan(0);
    expect(b.totals.entretien).toBeCloseTo(a.totals.entretien - a.totals.entretien_exceptionnel, 1);
  });

  it("le détail d'un montant somme exactement à ce montant", async () => {
    const r = await ds.query({ measures: ["gasoil"], dimensions: ["camion"], period: oct });
    const row = r.rows.find((x) => x.keys.camion === "fa-877-ap")!;
    const lines = await ds.getDetails({ measure: "gasoil", period: oct, keys: { camion: "fa-877-ap" } });
    expect(lines.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(row.values.gasoil, 1);
  });

  it("mois type divise les flux par le nombre de mois", async () => {
    const year: Period = { type: "plage", start: "2025-11", end: "2026-10" };
    const a = await ds.query({ measures: ["ca_ht"], dimensions: [], period: year });
    const b = await ds.query({ measures: ["ca_ht"], dimensions: [], period: { ...year, type: "mois_type" } });
    expect(b.totals.ca_ht).toBeCloseTo(a.totals.ca_ht / 12, 0);
  });
});
