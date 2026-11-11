/*
 * Qualidade da cifra: título limpo, grafia dos acordes por tom (A# → Bb), acordes fora do tom e letra em caixa normal.
 * Funções puras (sem DOM): usadas por app.js e testadas em tests/qualidade.test.mjs. Troca sempre por texto do mesmo tamanho,
 * para os acordes não saírem do lugar em cima da letra.
 */
(function () {
  "use strict";

  const ACORDE = /^\(?[A-G][#b]?(?:maj|min|dim|aug|sus|add|[mM°º+\-#b0-9()/])*(?:\/[A-G][#b]?[0-9]*)?\)?[,.]?$/;
  const EXTRA = /^(\[[^\]]*\]|\|+|:?\|\|?:?|[xX]\d+|\d+[xX]|%|-+|~|\.\.\.|[A-Za-zÀ-ú]+:)$/;
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const SUST = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const BEM = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const mod = (n) => ((n % 12) + 12) % 12;
  const pcDe = (nota) => mod(PC[nota[0]] + ({ "#": 1, b: -1 }[nota[1]] || 0));

  const ehLinhaAcorde = (linha) => {
    const t = linha.trim().split(/\s+/).filter(Boolean);
    return t.length > 0 && t.some((x) => ACORDE.test(x)) && t.every((x) => ACORDE.test(x) || EXTRA.test(x));
  };

  // ------------------------------------------------------------------ Título
  /** Tira do título o que vem do site de origem: "(33º Domingo - Ano A, B e C)", " - COM. CATÓLICA ..." */
  function titulo(t) {
    return String(t || "")
      .replace(/\s*\([^)]*(?:domingo|\bano\s+[abc]\b|tempo\s+comum|advento|quaresma|solenidade)[^)]*\)/gi, "")
      .replace(/\s+-\s+(?:com\.|(?:comunh[aã]o|entrada|ofert[oó]rio|final|ato penitencial)\b).*$/i, "")
      .replace(/\s{2,}/g, " ").trim();
  }

  // ------------------------------------------------------------------ Tom e grafia
  const maiorRelativa = (t) => (t.menor ? mod(t.pc + 3) : t.pc);
  const TONS_BEMOL = new Set([5, 10, 3, 8, 1]); // F, Bb, Eb, Ab, Db (maior de referência)

  /** Tom (tônica e se é menor) pelo primeiro acorde; o mesmo critério de Transpor.tomDaCifra */
  function tom(cifra) {
    for (const linha of String(cifra).split(/\r?\n/)) {
      if (!ehLinhaAcorde(linha)) continue;
      for (const tk of linha.trim().split(/\s+/)) {
        const m = /^\(?([A-G][#b]?)([^/]*)/.exec(tk);
        if (m && ACORDE.test(tk)) return { pc: pcDe(m[1]), menor: m[2].startsWith("m") && !m[2].startsWith("maj") };
      }
    }
    return null;
  }

  /** Grafia pelo tom: notas da escala seguem a armadura (sustenidos ou bemóis); fora dela, ♭III, ♭VI e ♭VII são bemóis. Mesmo tamanho: A# em Dm vira Bb */
  function grafia(cifra) {
    const t = tom(cifra);
    if (!t) return cifra;
    const base = maiorRelativa(t), bemolEscala = TONS_BEMOL.has(base);
    const escala = new Set([0, 2, 4, 5, 7, 9, 11].map((g) => mod(base + g)));
    const nome = (n) => {
      const pc = pcDe(n), g = mod(pc - base);
      const bemol = escala.has(pc) ? bemolEscala : [3, 8, 10].includes(g);
      return (bemol ? BEM : SUST)[pc];
    };
    const troca = (n) => (/[#b]$/.test(n) ? nome(n) : n);
    return String(cifra).split(/\r?\n/).map((linha) => (!ehLinhaAcorde(linha) ? linha : linha.replace(/\S+/g, (tk) =>
      ACORDE.test(tk) ? tk.replace(/(^\(?)([A-G][#b]?)/, (_, a, n) => a + troca(n)).replace(/(\/)([A-G][#b]?)/, (_, a, n) => a + troca(n)) : tk))).join("\n");
  }

  /** "DM" (maiúsculo) vira "D ": mesmo tamanho. CM7/Cmaj7 ficam como estão */
  function normalizar(cifra) {
    return String(cifra).split(/\r?\n/).map((linha) =>
      ehLinhaAcorde(linha) ? linha.replace(/(^|[\s(])([A-G][#b]?)M(?=$|[\s,.)])/g, "$1$2 ") : linha).join("\n");
  }

  /** Acordes que não combinam com o tom (campo harmônico + dominantes secundários + ♭VII, ♭III, ♭VI emprestados) */
  function suspeitos(cifra) {
    const t = tom(cifra);
    if (!t) return [];
    const base = maiorRelativa(t);
    const grau = (pc) => mod(pc - base); // 0 = tônica da escala maior de referência
    const DIA = { 0: "M", 2: "m", 4: "m", 5: "M", 7: "M", 9: "m", 11: "d" }; // qualidade natural de cada grau
    const SEC = new Set([2, 4, 9, 11]); // maior (ou com 7) nestes graus = dominante secundário
    const EMPR = new Set([3, 8, 10]); // ♭III, ♭VI, ♭VII emprestados (maiores)
    const vistos = new Set(), lista = [];
    for (const linha of String(cifra).split(/\r?\n/)) {
      if (!ehLinhaAcorde(linha)) continue;
      for (const tk of linha.trim().split(/\s+/)) {
        const m = /^\(?([A-G][#b]?)([^/]*?)(?:\/[A-G][#b]?[0-9]*)?\)?[,.]?$/.exec(tk);
        if (!m || !ACORDE.test(tk) || vistos.has(tk)) continue;
        const resto = m[2], g = grau(pcDe(m[1]));
        const menor = /^m(?!aj)/.test(resto) || /^min/.test(resto), dim = /^(dim|°|º)/.test(resto), dom = /^7$|^7[^M]|^9|^13/.test(resto) && !menor;
        const q = dim ? "d" : menor ? "m" : "M";
        let ok = g in DIA && (DIA[g] === q || (DIA[g] === "d" && q === "m")); // vii° também aparece como "Bm" de passagem
        if (!ok && SEC.has(g) && q === "M") ok = true;                           // II, III, VI, VII maiores
        if (!ok && dom && g in DIA) ok = true;                                    // qualquer grau com 7ª dominante
        if (!ok && dim) ok = true;                                                // diminuto de passagem
        if (!ok && EMPR.has(g) && q === "M") ok = true;
        if (t.menor && g === 4 && q === "M") ok = true;                           // V maior em tom menor
        if (!ok) { vistos.add(tk); lista.push(tk); }
      }
    }
    return lista;
  }

  // ------------------------------------------------------------------ Letra em caixa normal
  const SAGRADAS = new Set(["deus", "senhor", "jesus", "cristo", "espírito", "pai", "maria", "igreja", "amém", "aleluia", "hosana", "kyrie", "christe",
    "eleison", "sião", "israel", "jerusalém", "emanuel", "messias"]);

  /** Linha em MAIÚSCULAS (≥ 85% das letras) vira "Frase normal." com os nomes sagrados em maiúscula */
  function letraNormal(cifra) {
    return String(cifra).split(/\r?\n/).map((linha) => {
      if (ehLinhaAcorde(linha) || /^\s*\[/.test(linha)) return linha;
      const letras = linha.match(/\p{L}/gu) || [];
      if (letras.length < 3 || letras.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length / letras.length < 0.85) return linha;
      let ini = true, ant = "";
      return linha.toLowerCase().replace(/(\p{L}[\p{L}'’-]*)|([.!?]\s*)|(\d+\.\s*)/gu, (x, palavra, fim, num) => {
        if (num || fim) { ini = true; return x; }
        const sagrada = SAGRADAS.has(palavra) || (palavra === "santo" && ant === "espírito");
        const r = ini || sagrada ? palavra[0].toUpperCase() + palavra.slice(1) : palavra;
        ini = false; ant = palavra;
        return r;
      });
    }).join("\n");
  }

  const Q = { titulo, tom, grafia, normalizar, suspeitos, letraNormal, ehLinhaAcorde };
  if (typeof module !== "undefined" && module.exports) module.exports = Q;
  else window.Qualidade = Q;
})();
