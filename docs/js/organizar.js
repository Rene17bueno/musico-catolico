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

  /** 1 ou 2 colunas: menos páginas; empate, letra maior; novo empate, 2 colunas (padrão de folheto) */
  const memo = new Map();
  function melhorColunas(cifra) {
    if (memo.has(cifra)) return memo.get(cifra);
    let melhor = null;
    for (const n of [2, 1]) {
      const r = Layout.montar(cifra, n, larguraColuna(n), AREA_ALTURA, null);
      const nota = [r.paginas.length, -r.tamanho];
      if (!melhor || nota[0] < melhor.nota[0] || (nota[0] === melhor.nota[0] && nota[1] < melhor.nota[1])) melhor = { n, nota };
    }
    if (memo.size > 300) memo.clear();
    memo.set(cifra, melhor.n);
    return melhor.n;
  }

  /** Devolve a música pronta para exportar/visualizar. As colunas escolhidas à mão (item.Colunas) sempre valem. */
  function organizar(item, auto) {
    if (item.Status !== "OK") return item;
    const r = { ...item, Cifra: limpar(item.Cifra) };
    if (auto && !r.Colunas) { r.Colunas = melhorColunas(r.Cifra); r.ColunasAuto = true; }
    return r;
  }

  window.Organizar = { limpar, melhorColunas, organizar };

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
        const r = Layout.montar(it.Cifra, n, larguraColuna(n), AREA_ALTURA, fonte);
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
