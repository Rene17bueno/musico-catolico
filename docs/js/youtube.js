/*
 * YouTube em cada música da lista: "▶ YouTube" abre a busca (título + artista) para conferir se é a música certa;
 * 🔗 guarda o link do vídeo escolhido (m.youtube); "▶ Ouvir" toca o vídeo numa janela dentro do site.
 * (A busca do YouTube não pode ser embutida em outro site; só vídeos com link.) Carregado depois de app.js.
 */
(function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // Só aceita links do YouTube (youtube.com/watch, shorts, embed ou youtu.be) e devolve o link padrão; qualquer outra coisa vira ""
  const ID = /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;
  const limpo = (u) => { const m = ID.exec(String(u || "").trim()); return m ? `https://www.youtube.com/watch?v=${m[1]}` : ""; };

  const estilo = document.createElement("style");
  estilo.textContent = ".yt{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}"
    + "dialog#dlg-yt{border:1px solid var(--borda);border-radius:16px;padding:0;width:min(900px,96vw);overflow:hidden;box-shadow:0 12px 40px rgba(31,58,95,.3)}"
    + "dialog#dlg-yt::backdrop{background:rgba(16,32,58,.6);backdrop-filter:blur(3px)}"
    + "#dlg-yt .yt-video{aspect-ratio:16/9;background:#000}#dlg-yt iframe{width:100%;height:100%;border:0}";
  document.head.appendChild(estilo);

  function consulta(m) {
    const r = m.resultado || {};
    const t = r.Música || m.busca?.titulo || "", a = r.Artista || m.busca?.artista || "";
    return `${t} ${a}`.replace(/\s+/g, " ").trim().slice(0, 120);
  }

  /** Toca o vídeo numa janela do próprio site; ao fechar, o player é esvaziado para parar o som */
  function abrirPlayer(url, titulo) {
    const id = ID.exec(url || "")?.[1];
    if (!id) return;
    let d = document.querySelector("#dlg-yt");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "dlg-yt";
      d.innerHTML = '<div class="dlg-topo"><b id="yt-titulo"></b><span class="dica"></span><a id="yt-fora" class="botao" target="_blank" rel="noopener">Abrir no YouTube ↗</a><button type="button" class="icone" id="yt-fechar" aria-label="Fechar">✕</button></div>'
        + '<div class="yt-video"><iframe id="yt-frame" title="Vídeo do YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
      document.body.appendChild(d);
      d.addEventListener("close", () => { d.querySelector("#yt-frame").src = "about:blank"; });
      d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("#yt-fechar")) d.close(); });
    }
    d.querySelector("#yt-titulo").textContent = titulo || "YouTube";
    d.querySelector("#yt-fora").href = `https://www.youtube.com/watch?v=${id}`;
    d.querySelector("#yt-frame").src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    d.showModal();
  }

  const titulo = (m) => m.resultado?.Música || m.busca?.titulo || "YouTube";

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
        ? `<a class="botao" href="${esc(m.youtube)}" data-ytplay="${esc(m.youtube)}" target="_blank" rel="noopener" title="Tocar aqui no site o vídeo que você escolheu">▶ Ouvir</a><button type="button" class="icone" data-yt="editar" title="Trocar ou remover o link do YouTube">✎</button>`
        : `<a class="botao" href="${esc(busca)}" target="_blank" rel="noopener" title="Procurar esta música no YouTube para conferir">▶ YouTube</a><button type="button" class="icone" data-yt="editar" title="Colar o link do vídeo certo">🔗</button>`;
      acoes.prepend(caixa);
    });
  }

  // a lista é redesenhada por inteiro (innerHTML) a cada mudança; refaz os botões logo depois
  new MutationObserver(desenhar).observe(document.querySelector("#lista-musicas"), { childList: true });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-ytplay]");
    if (t && !e.ctrlKey && !e.metaKey && !e.shiftKey) { // Ctrl/Shift+clique continua abrindo no YouTube
      e.preventDefault();
      const m = window.CM.rep.musicas.find((x) => x.id === t.closest(".musica")?.dataset.id);
      abrirPlayer(t.dataset.ytplay, m && titulo(m));
      return;
    }
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
    if (l) abrirPlayer(l, titulo(m)); // colou o link: já toca para conferir
  });
  desenhar();
})();
