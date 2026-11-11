/*
 * YouTube em cada música da lista: "▶ YouTube" abre a busca (título + artista) para conferir se é a música certa;
 * 🔗 guarda o link do vídeo escolhido (m.youtube), que passa a aparecer como "▶ Ouvir". Carregado depois de app.js.
 */
(function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // Só aceita links do YouTube (youtube.com/watch, shorts, embed ou youtu.be) e devolve o link padrão; qualquer outra coisa vira ""
  const ID = /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;
  const limpo = (u) => { const m = ID.exec(String(u || "").trim()); return m ? `https://www.youtube.com/watch?v=${m[1]}` : ""; };

  const estilo = document.createElement("style");
  estilo.textContent = ".yt{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}";
  document.head.appendChild(estilo);

  function consulta(m) {
    const r = m.resultado || {};
    const t = r.Música || m.busca?.titulo || "", a = r.Artista || m.busca?.artista || "";
    return `${t} ${a}`.replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function desenhar() {
    const CM = window.CM;
    if (!CM) return;
    document.querySelectorAll("#lista-musicas .musica").forEach((linha) => {
      const m = CM.rep.musicas.find((x) => x.id === linha.dataset.id);
      const acoes = linha.querySelector(".acoes");
      if (!m || !acoes || acoes.querySelector(".yt")) return;
      const busca = "https://www.youtube.com/results?search_query=" + encodeURIComponent(consulta(m));
      const caixa = document.createElement("span");
      caixa.className = "yt";
      caixa.innerHTML = m.youtube
        ? `<a class="botao" href="${esc(m.youtube)}" target="_blank" rel="noopener" title="Abrir no YouTube o vídeo que você escolheu">▶ Ouvir</a><button type="button" class="icone" data-yt="editar" title="Trocar ou remover o link do YouTube">✎</button>`
        : `<a class="botao" href="${esc(busca)}" target="_blank" rel="noopener" title="Procurar esta música no YouTube para conferir">▶ YouTube</a><button type="button" class="icone" data-yt="editar" title="Colar o link do vídeo certo">🔗</button>`;
      acoes.prepend(caixa);
    });
  }

  // a lista é redesenhada por inteiro (innerHTML) a cada mudança; refaz os botões logo depois
  new MutationObserver(desenhar).observe(document.querySelector("#lista-musicas"), { childList: true });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-yt=editar]");
    if (!b) return;
    const CM = window.CM, linha = b.closest(".musica");
    const m = CM.rep.musicas.find((x) => x.id === linha?.dataset.id);
    if (!m) return;
    const v = prompt("Cole o link do vídeo do YouTube desta música (vazio remove o link):", m.youtube || "");
    if (v === null) return;
    const l = limpo(v);
    if (v.trim() && !l) { alert("Link inválido. Use um link do YouTube, como https://www.youtube.com/watch?v=..."); return; }
    if (l) m.youtube = l; else delete m.youtube;
    CM.salvar();
    linha.querySelector(".yt")?.remove();
    desenhar();
  });
  desenhar();
})();
