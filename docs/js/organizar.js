/*
 * Organização automática das cifras (limpeza do texto + melhor nº de colunas por música)
 * e janela "Visualizar" do repertório inteiro, antes de baixar.
 * Carregado ANTES de app.js (app.js chama Organizar.organizar); a janela usa window.CM só ao abrir.
 */
(function () {
  "use strict";

  // Mesmas medidas de exportar.js (A4, margens, espaço entre colunas, cabeçalho)
  const AREA_ALTURA = 297 - 2 * 12 - 20;
  const larguraColuna = (n) => (210 - 2 * 15 - 8 * (n - 1)) / n;
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /** Limpa o texto sem mexer no alinhamento dos acordes: tira espaços no fim das linhas, junta linhas em branco repetidas e separa [Refrão] da estrofe anterior */
  function limpar(cifra) {
    return Layout.limparCifra(cifra)
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/([^\n])\n(\[[^\]\n]+\])(?=\n|$)/g, "$1\n\n$2");
  }

  /**
   * Cada música cabe numa página com a maior letra possível (de 16 a 9 pt, de meio em meio ponto),
   * em 1 ou 2 colunas; empate vai para 1 coluna (acordes sem quebra de linha).
   * Se nem a 9 pt couber numa página, usa o auto do Layout (menos páginas, letra o maior possível).
   * Altura com folga de 10 mm porque o Word calcula um pouco diferente do PDF.
   */
  const ALTURA = AREA_ALTURA - 10, MAX_PT = 16, MIN_PT = 9;
  const memo = new Map();
  function melhorLayout(cifra, fixas) {
    const chave = fixas + "|" + cifra;
    if (memo.has(chave)) return memo.get(chave);
    let melhor = null;
    for (const n of fixas ? [fixas] : [1, 2]) {
      for (let t = MAX_PT; t >= MIN_PT; t -= 0.5) {
        if (melhor && t <= melhor.t) break;
        if (Layout.montar(cifra, n, larguraColuna(n), ALTURA, t).paginas.length === 1) { melhor = { n, t }; break; }
      }
    }
    if (!melhor) melhor = { n: fixas || 2, t: null }; // não cabe numa página: deixa o Layout escolher
    if (memo.size > 300) memo.clear();
    memo.set(chave, melhor);
    return melhor;
  }

  /** Devolve a música pronta para exportar/visualizar. As colunas escolhidas à mão (item.Colunas) sempre valem. */
  function organizar(item, auto) {
    if (item.Status !== "OK") return item;
    const r = { ...item, Cifra: limpar(item.Cifra) };
    if (!auto) return r;
    const m = melhorLayout(r.Cifra, r.Colunas || 0); // colunas escolhidas à mão ficam; só o tamanho da letra é automático
    if (!r.Colunas) { r.Colunas = m.n; r.ColunasAuto = true; }
    if (m.t) r.Tamanho = m.t; // um tamanho fixo escolhido na seção Baixar tem prioridade (exportar.js)
    return r;
  }

  window.Organizar = { limpar, melhorLayout, organizar };

  // ---------------------------------------------------------------- Janela "Visualizar"
  const $ = (s) => document.querySelector(s);

  function abrir() {
    const CM = window.CM, dlg = $("#dlg-visualizar");
    if (!CM || !dlg) return;
    const itens = CM.itens, fonte = CM.fonte;
    Exportar.cabecalho = CM.cabecalho;
    $("#viz-auto").checked = CM.auto;
    const faltam = CM.rep.musicas.length - itens.length;
    if (!itens.length) {
      $("#viz-resumo").textContent = "Nenhuma música com cifra pronta ainda. Adicione músicas e aguarde as cifras chegarem.";
      $("#viz-tabela").innerHTML = "";
      $("#viz-paginas").innerHTML = "";
      $("#viz-acoes").hidden = true;
    } else {
      $("#viz-acoes").hidden = false;
      let total = 0;
      const linhas = itens.map((it) => {
        const n = it.Colunas || CM.colunas;
        const r = Layout.montar(it.Cifra, n, larguraColuna(n), AREA_ALTURA, it.Tamanho || fonte || null);
        total += r.paginas.length;
        const como = it.ColunasAuto ? "automático" : it.Colunas ? "escolhido por você" : "layout padrão";
        return `<tr><td>${esc(it.Posição)}</td><td>${esc(it.Música)}${it.Artista ? " <small>" + esc(it.Artista) + "</small>" : ""}</td>`
          + `<td>${n} col. <small>(${como})</small></td><td>${r.tamanho} pt</td><td>${r.paginas.length}</td></tr>`;
      });
      $("#viz-resumo").textContent = `${itens.length} música(s), ${total} página(s) no total.` + (faltam > 0 ? ` ${faltam} sem cifra ficam de fora.` : "");
      $("#viz-tabela").innerHTML = `<table><thead><tr><th>Parte</th><th>Música</th><th>Colunas</th><th>Letra</th><th>Págs.</th></tr></thead><tbody>${linhas.join("")}</tbody></table>`;
      $("#viz-paginas").innerHTML = Exportar.previaSvg(itens, CM.colunas, fonte).join("");
    }
    if (!dlg.open) dlg.showModal();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".abrir-visualizar")) { abrir(); return; }
    const dlg = $("#dlg-visualizar");
    if (!dlg) return;
    if (e.target === dlg || e.target.closest("#viz-fechar")) { dlg.close(); return; }
    const b = e.target.closest("[data-viz]");
    if (b) document.querySelector(`.botoes-baixar [data-formato="${b.dataset.viz}"]`)?.click(); // mesmo gerador do botão Baixar
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "viz-auto") { window.CM.definirAuto(e.target.checked); abrir(); }
  });
})();
