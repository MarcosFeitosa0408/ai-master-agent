import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("Layout principal do AI MASTER AGENT", () => {
  it("posiciona navegação e conteúdo lado a lado no desktop", () => {
    expect(styles).toMatch(/#root\s*\{[^}]*display\s*:\s*flex/);
    expect(styles).toMatch(/#root\s*\{[^}]*width\s*:\s*100%/);
    expect(styles).toMatch(/\.sec\.on\s*\{[^}]*display\s*:\s*block/);
  });

  it("empilha navegação e conteúdo em telas pequenas", () => {
    expect(styles).toMatch(/@media\s*\(max-width\s*:\s*700px\)\s*\{\s*#root\s*\{[^}]*flex-direction\s*:\s*column/);
  });
});
