import { describe, it, expect } from "vitest";
import { analyzeCSV } from "./csv.js";
import { makePlan } from "./planner.js";
describe("csv", () => {
  it("conta linhas, duplicadas e ausentes", () => {
    const r = analyzeCSV("a;b\n1;x\n2;\n2;\n");
    expect(r.rows).toBe(3); expect(r.duplicates).toBe(1);
    expect(r.cols[0].mean).toBe(1.67); expect(r.cols[1].missing).toBe(2);
  });
  it("rejeita arquivo vazio", () => expect(() => analyzeCSV("a,b\n")).toThrow());
});
describe("planner", () => it("gera de 3 a 5 etapas", () => {
  const n = makePlan("Analise meu repositório e corrija o código").length;
  expect(n >= 3 && n <= 5).toBe(true);
}));
