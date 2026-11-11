import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const Q = createRequire(import.meta.url)("../docs/js/qualidade.js");

test("título sem sufixo do site", () => {
  assert.equal(Q.titulo("MEUS PENSAMENTOS SÃO DE PAZ - COM. CATÓLICA OFERENDA DE AMOR (33º Domingo - Ano A, B e C)"), "MEUS PENSAMENTOS SÃO DE PAZ");
  assert.equal(Q.titulo("SANTO (MELODIA 2 - Frei Luiz Turra)"), "SANTO (MELODIA 2 - Frei Luiz Turra)");
});
test("DM vira D, mesmo tamanho", () => {
  assert.equal(Q.normalizar("C F DM G7"), "C F D  G7");
  assert.equal(Q.normalizar("C CM7"), "C CM7");
});
test("grafia pelo tom", () => {
  assert.equal(Q.grafia("Dm A#\nletra"), "Dm Bb\nletra");   // Dm = relativa de F (bemol)
  assert.equal(Q.grafia("C F A# G"), "C F Bb G");            // ♭VII em C
  assert.equal(Q.grafia("B E A# F#"), "B E A# F#");          // A# é do tom de B
  assert.equal(Q.grafia("Abraão: A"), "Abraão: A");          // palavra não é acorde
});
test("acordes suspeitos", () => {
  assert.deepEqual(Q.suspeitos("C Dm Em F G7 Am\nG Gm C"), ["Gm"]);
  assert.deepEqual(Q.suspeitos("Am Dm E7 F G C A#"), []);
  assert.deepEqual(Q.suspeitos("A F° F#m E7 Bm7"), []);
});
test("letra em caixa normal", () => {
  assert.equal(Q.letraNormal("SENHOR, QUE VIESTES SALVAR,"), "Senhor, que viestes salvar,");
  assert.equal(Q.letraNormal("1. VÓS, ESPÍRITO SANTO, VENHA!"), "1. Vós, Espírito Santo, venha!");
  assert.equal(Q.letraNormal("C G\nOlá Mundo"), "C G\nOlá Mundo");
});
