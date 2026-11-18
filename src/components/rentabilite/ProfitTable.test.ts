import { describe, expect, it } from "vitest";
import { toProfitRow } from "./ProfitTable";
import { MEASURES, type Measure } from "@/data/types";

const vals = (o: Partial<Record<Measure, number>>) => Object.fromEntries(MEASURES.map((m) => [m, o[m] ?? 0])) as Record<Measure, number>;
const x = vals({ ca_ht: 10000, gasoil: 2000, adblue: 100, peages: 500, entretien: 900, entretien_exceptionnel: 400, chauffeur: 3000, vehicule: 1000, bureau: 300, divers: 200 });

describe("ligne de rentabilité", () => {
  it("après frais communs : marge = CA − variables − fixes", () => {
    const r = toProfitRow("t", "AA", "", x, false);
    expect(r.v.tv).toBe(3500); expect(r.v.tf).toBe(4500); expect(r.v.marge).toBe(2000); expect(r.v.taux).toBe(20);
  });
  it("marge hors réparations exceptionnelles ajoute l'exceptionnel", () => {
    expect(toProfitRow("t", "AA", "", x, false).v.margeHx).toBe(2400);
  });
  it("avant frais communs : véhicule, bureau et divers exclus", () => {
    const r = toProfitRow("t", "AA", "", x, true);
    expect(r.v.tf).toBe(3000); expect(r.v.marge).toBe(3500);
  });
});
