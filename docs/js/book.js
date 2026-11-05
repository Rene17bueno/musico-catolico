/*
 * Book: biblioteca permanente de cifras + repertórios montados a partir dela.
 * Reaproveita Transpor, Exportar, Palco e Nuvem (js/*.js do site). Salva sozinho (localStorage).
 * Dados: book.songs [{id,titulo,artista,cifra,partes[],tags[],fav,url,criado}]
 *        book.reps  [{id,nome,tipo,itens:[{id,songId,parte,semis,obs}],atualizado}]
 */
(function () {
  "use strict";

  const PARTES = {
    "Missa": ["Entrada", "Ato penitencial", "Glória", "Salmo", "Aclamação", "Ofertório", "Santo", "Cordeiro", "Comunhão", "Comunhão crianças", "Ação de graças", "Final"],
    "Grupo de Oração": ["Animação", "Condução", "Espírito Santo", "Adoração", "Final", "Outras"],
    "Encontro": ["Livre"],
  };
  const TODAS_PARTES = [...new Set(Object.values(PARTES).flat())];
  const K = { songs: "book.songs", reps: "book.reps", atual: "book.atual" };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
  const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const ler = (k, p) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

  let songs = ler(K.songs, []);
  let reps = ler(K.reps, []);
  let repId = ler(K.atual, null);
  const filtro = { q: "", parte: "", tag: "", fav: false, ordem: "titulo" };

  const salvar = () => {
    const ok = gravar(K.songs, songs) && gravar(K.reps, reps) && gravar(K.atual, repId);
    $("#status").textContent = ok ? `Salvo às ${new Date().toLocaleTimeString("pt-BR")}` : "Sem espaço/permissão para salvar neste navegador";
  };
  const rep = () => reps.find((r) => r.id === repId) || null;
  const song = (id) => songs.find((s) => s.id === id);
  const aviso = (t) => { const a = $("#aviso"); a.textContent = t; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => (a.hidden = true), 3500); };

  /* ---------- Cifra: tom ---------- */
  const tomOriginal = (s) => { try { return Transpor.tomDaCifra(s.cifra); } catch { return null; } };
  function tomRotulo(s, semis) {
    const t = tomOriginal(s);
    return t ? Transpor.rotuloTom(t.indice + (semis || 0), t.menor) : "—";
  }
  const cifraNoTom = (s, semis) => (semis ? Transpor.transpor(s.cifra, semis) : s.cifra);

  /* ---------- Book (biblioteca) ---------- */
  function adicionarMusica(d) {
    const chave = norm(d.titulo) + "|" + norm(d.artista);
    let s = songs.find((x) => (d.url && x.url === d.url) || norm(x.titulo) + "|" + norm(x.artista) === chave);
    if (s) { Object.assign(s, { cifra: d.cifra || s.cifra, url: d.url || s.url }); return s; }
    s = { id: uid(), titulo: d.titulo || "Sem título", artista: d.artista || "", cifra: d.cifra || "", partes: d.partes || [], tags: d.tags || [], fav: false, url: d.url || "", criado: Date.now() };
    songs.push(s);
    return s;
  }

  function importarAntigos() {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith("cifras.rep.")) continue;
      const r = ler(k, null);
      for (const m of r?.musicas || []) {
        const x = m.resultado;
        if (x?.Status === "OK" && x.Cifra) {
          const antes = songs.length;
          adicionarMusica({ titulo: x["Música"], artista: x.Artista, cifra: x.Cifra, url: x.URL || m.url, partes: m.posicao && m.posicao !== "Automática" ? [m.posicao] : [] });
          n += songs.length - antes;
        }
      }
    }
    return n;
  }

  function listaFiltrada() {
    const q = norm(filtro.q);
    const l = songs.filter((s) =>
      (!q || norm(s.titulo + " " + s.artista + " " + s.tags.join(" ")).includes(q)) &&
      (!filtro.parte || s.partes.includes(filtro.parte)) &&
      (!filtro.tag || s.tags.includes(filtro.tag)) &&
      (!filtro.fav || s.fav));
    const cmp = { titulo: (a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"), artista: (a, b) => a.artista.localeCompare(b.artista, "pt-BR"), recente: (a, b) => b.criado - a.criado };
    return l.sort(cmp[filtro.ordem]);
  }

  function renderBook() {
    const tags = [...new Set(songs.flatMap((s) => s.tags))].sort();
    $("#f-parte").innerHTML = `<option value="">Todas as partes</option>` + TODAS_PARTES.map((p) => `<option>${esc(p)}</option>`).join("");
    $("#f-tag").innerHTML = `<option value="">Todas as tags</option>` + tags.map((t) => `<option>${esc(t)}</option>`).join("");
    $("#f-parte").value = filtro.parte; $("#f-tag").value = filtro.tag;
    const l = listaFiltrada(), r = rep();
    $("#book-n").textContent = `${l.length} de ${songs.length} músicas`;
    $("#book-lista").innerHTML = l.length ? l.map((s) => `
      <li class="musica" data-id="${s.id}">
        <button class="fav ${s.fav ? "on" : ""}" data-a="fav" title="Favorita" aria-label="Favorita">★</button>
        <div class="info" data-a="ver">
          <strong>${esc(s.titulo)}</strong><span>${esc(s.artista)} · Tom ${esc(tomRotulo(s, 0))}</span>
          <small>${[...s.partes, ...s.tags.map((t) => "#" + t)].map(esc).join(" · ")}</small>
        </div>
        <button data-a="add" ${r ? "" : "disabled"} title="${r ? "Adicionar ao repertório aberto" : "Abra um repertório primeiro"}">+ Repertório</button>
      </li>`).join("") : `<li class="vazio">Nenhuma música. Use <b>Buscar na web</b>, <b>Nova música</b> ou <b>Importar dos repertórios antigos</b>.</li>`;
  }

  function abrirEditor(id) {
    const s = id ? song(id) : { id: "", titulo: "", artista: "", cifra: "", partes: [], tags: [], url: "" };
    const d = $("#editor");
    $("#e-titulo").value = s.titulo; $("#e-artista").value = s.artista; $("#e-cifra").value = s.cifra;
    $("#e-url").value = s.url; $("#e-tags").value = s.tags.join(", ");
    $("#e-partes").innerHTML = TODAS_PARTES.map((p) => `<label><input type="checkbox" value="${esc(p)}" ${s.partes.includes(p) ? "checked" : ""}> ${esc(p)}</label>`).join("");
    d.dataset.id = s.id; $("#e-excluir").hidden = !s.id;
    d.showModal();
  }

  function salvarEditor() {
    const id = $("#editor").dataset.id;
    const d = {
      titulo: $("#e-titulo").value.trim(), artista: $("#e-artista").value.trim(), cifra: $("#e-cifra").value, url: $("#e-url").value.trim(),
      tags: $("#e-tags").value.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
      partes: $$("#e-partes input:checked").map((i) => i.value),
    };
    if (!d.titulo) return aviso("Informe o título.");
    if (id) Object.assign(song(id), d); else songs.push({ id: uid(), fav: false, criado: Date.now(), ...d });
    $("#editor").close(); salvar(); renderBook(); renderRep();
  }

  /* ---------- Busca na web ---------- */
  async function chamarFuncao(params) {
    const token = await Nuvem.token().catch(() => null);
    const r = await fetch(Nuvem.FUNCAO_BUSCA + "?" + new URLSearchParams(params), token ? { headers: { Authorization: "Bearer " + token } } : {});
    const dados = await r.json().catch(() => ({}));
    if (r.status === 429) throw new Error("Cota diária de buscas atingida; tente amanhã ou cole a cifra.");
    if (!r.ok) throw new Error(dados.erro || `erro ${r.status}`);
    return dados;
  }
  let candidato = null;

  async function buscarWeb() {
    const q = $("#w-q").value.trim();
    if (q.length < 2) return aviso("Digite pelo menos 2 letras ou cole um link.");
    const saida = $("#w-res"); saida.innerHTML = `<li class="vazio">Buscando…</li>`; $("#w-prev").hidden = true;
    try {
      if (/^https?:\/\//i.test(q)) return mostrarCifra(await chamarFuncao({ url: q }));
      const salva = await Nuvem.daBiblioteca({ titulo: q, artista: "" }).catch(() => null);
      const { candidatos = [] } = await chamarFuncao({ titulo: q, artista: "" });
      const lista = [...(salva?.cifra ? [{ ...salva, salva: true }] : []), ...candidatos];
      saida.innerHTML = lista.length ? lista.map((c, i) => `<li><button data-i="${i}"><strong>${esc(c.titulo || c.nome || c.url)}</strong><span>${esc(c.artista || "")} ${c.salva ? "· já na nuvem" : esc(host(c.url))}</span></button></li>`).join("")
        : `<li class="vazio">Nada encontrado. Confira o nome ou cole o link da cifra.</li>`;
      saida._lista = lista;
    } catch (e) { saida.innerHTML = `<li class="vazio">${esc(e.message)}</li>`; }
  }
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

  async function escolherCandidato(i) {
    const c = $("#w-res")._lista[i];
    try { mostrarCifra(c.cifra ? c : await chamarFuncao({ url: c.url })); } catch (e) { aviso(e.message); }
  }
  function mostrarCifra(c) {
    candidato = c;
    $("#w-prev").hidden = false;
    $("#w-prev h3").textContent = `${c.titulo || ""} — ${c.artista || ""}`;
    $("#w-prev pre").textContent = c.cifra || "(sem cifra)";
  }

  /* ---------- Repertórios ---------- */
  const partesDoTipo = (r) => PARTES[r.tipo] || PARTES.Missa;
  function novoRep() {
    const nome = prompt("Nome do repertório:", `Missa ${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}`);
    if (!nome) return;
    const r = { id: uid(), nome, tipo: "Missa", itens: [], atualizado: Date.now() };
    reps.push(r); repId = r.id; salvar(); renderRep(); renderBook();
  }

  function adicionarAoRep(songId, parte) {
    const r = rep(); if (!r) return aviso("Crie ou abra um repertório primeiro.");
    const s = song(songId);
    const p = parte || s.partes.find((x) => partesDoTipo(r).includes(x)) || partesDoTipo(r)[0];
    r.itens.push({ id: uid(), songId, parte: p, semis: 0, obs: "" });
    r.atualizado = Date.now(); salvar(); renderRep();
    aviso(`"${s.titulo}" adicionada em ${p}.`);
  }

  function renderRep() {
    $("#r-sel").innerHTML = reps.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join("") || `<option value="">(nenhum)</option>`;
    const r = rep();
    $("#r-sel").value = r?.id || "";
    $("#r-corpo").hidden = !r;
    $("#r-vazio").hidden = !!r;
    if (!r) return;
    $("#r-tipo").value = r.tipo;
    r.itens = r.itens.filter((i) => song(i.songId));
    $("#r-n").textContent = `${r.itens.length} músicas`;
    const ps = partesDoTipo(r);
    $("#r-lista").innerHTML = r.itens.length ? r.itens.map((i, n) => {
      const s = song(i.songId);
      return `<li draggable="true" data-id="${i.id}">
        <span class="alca" title="Arraste para reordenar">⠿</span><span class="num">${n + 1}</span>
        <select data-a="parte" aria-label="Parte">${(ps.includes(i.parte) ? ps : [i.parte, ...ps]).map((p) => `<option ${p === i.parte ? "selected" : ""}>${esc(p)}</option>`).join("")}</select>
        <div class="info" data-a="ver"><strong>${esc(s.titulo)}</strong><span>${esc(s.artista)}</span></div>
        <div class="tom"><button data-a="menos" aria-label="Descer meio tom">−</button><output>${esc(tomRotulo(s, i.semis))}</output><button data-a="mais" aria-label="Subir meio tom">+</button></div>
        <input data-a="obs" placeholder="Observação" value="${esc(i.obs)}">
        <button data-a="x" aria-label="Remover" title="Remover">✕</button>
      </li>`;
    }).join("") : `<li class="vazio">Repertório vazio. Vá em <b>Book</b> e use “+ Repertório”.</li>`;
  }

  function itensExport() {
    const r = rep(), colunas = +$("#x-col").value;
    return r.itens.map((i) => {
      const s = song(i.songId), t = tomOriginal(s);
      return { "Posição": i.parte, "Música": s.titulo, Artista: s.artista, Cifra: cifraNoTom(s, i.semis), URL: s.url, Status: "OK", Erro: "", Tom: t ? Transpor.nomeTom(t.indice + i.semis, t.menor) : "", Colunas: colunas };
    });
  }

  async function exportar(tipo) {
    const r = rep(); if (!r || !r.itens.length) return aviso("Repertório vazio.");
    const dados = itensExport(), col = +$("#x-col").value, tam = +$("#x-tam").value || null, base = r.nome.replace(/[^\w\- ]+/g, "").trim() || "repertorio";
    try {
      if (tipo === "wpp") {
        const t = `*${r.nome}*\n\n` + r.itens.map((i, n) => { const s = song(i.songId); return `${n + 1}. ${i.parte}: ${s.titulo}${s.artista ? " (" + s.artista + ")" : ""} — Tom ${tomRotulo(s, i.semis)}${i.obs ? " [" + i.obs + "]" : ""}`; }).join("\n");
        await navigator.clipboard.writeText(t); return aviso("Lista copiada. Cole no WhatsApp.");
      }
      let out;
      if (tipo === "pdf") out = Exportar.exportarPdf(dados, col, tam);
      if (tipo === "docx") out = await Exportar.exportarDocx(dados, col, tam);
      if (tipo === "txt") out = Exportar.exportarTxt(dados, col);
      if (tipo === "xlsx") out = await Exportar.exportarXlsx(dados);
      out = await out;
      const blob = out instanceof Blob ? out : typeof out === "string" ? new Blob([out], { type: "text/plain;charset=utf-8" }) : out.output("blob");
      Exportar.baixar(blob, `${base}.${tipo}`);
    } catch (e) { aviso("Não consegui exportar: " + e.message); }
  }

  function imprimir() {
    const r = rep(); if (!r || !r.itens.length) return aviso("Repertório vazio.");
    const col = +$("#x-col").value, tam = +$("#x-tam").value || 10;
    const a = $("#area-impressao");
    a.style.setProperty("--cols", col); a.style.setProperty("--tam", tam + "pt");
    a.innerHTML = `<h1>${esc(r.nome)}</h1>` + itensExport().map((d) => `<article><h2>${esc(d["Posição"])} — ${esc(d["Música"])} <small>${esc(d.Artista)} · Tom ${esc(d.Tom)}</small></h2><pre>${esc(d.Cifra)}</pre></article>`).join("");
    window.print();
  }

  function palco(indice = 0) {
    const r = rep(); if (!r || !r.itens.length) return aviso("Repertório vazio.");
    Palco.abrir(r.itens.map((i) => { const s = song(i.songId); return { titulo: s.titulo, artista: s.artista, cifra: cifraNoTom(s, i.semis) }; }), indice);
  }

  /* ---------- Eventos ---------- */
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function aba(nome) {
    $$(".aba").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === nome));
    $$(".painel").forEach((p) => (p.hidden = p.id !== "p-" + nome));
  }

  function ligar() {
    $$(".aba").forEach((b) => b.addEventListener("click", () => aba(b.dataset.aba)));
    $("#f-q").addEventListener("input", (e) => { filtro.q = e.target.value; renderBook(); });
    $("#f-parte").addEventListener("change", (e) => { filtro.parte = e.target.value; renderBook(); });
    $("#f-tag").addEventListener("change", (e) => { filtro.tag = e.target.value; renderBook(); });
    $("#f-ordem").addEventListener("change", (e) => { filtro.ordem = e.target.value; renderBook(); });
    $("#f-fav").addEventListener("change", (e) => { filtro.fav = e.target.checked; renderBook(); });
    $("#b-nova").addEventListener("click", () => abrirEditor(""));
    $("#b-importar").addEventListener("click", () => { const n = importarAntigos(); salvar(); renderBook(); aviso(n ? `${n} músicas importadas.` : "Nada novo para importar."); });

    $("#book-lista").addEventListener("click", (e) => {
      const li = e.target.closest("li[data-id]"), a = e.target.closest("[data-a]")?.dataset.a; if (!li || !a) return;
      const s = song(li.dataset.id);
      if (a === "fav") { s.fav = !s.fav; salvar(); renderBook(); }
      if (a === "ver") abrirEditor(s.id);
      if (a === "add") adicionarAoRep(s.id);
    });
    $("#e-salvar").addEventListener("click", salvarEditor);
    $("#e-cancelar").addEventListener("click", () => $("#editor").close());
    $("#e-excluir").addEventListener("click", () => {
      const id = $("#editor").dataset.id;
      if (!confirm("Excluir esta música do Book e de todos os repertórios?")) return;
      songs = songs.filter((s) => s.id !== id); reps.forEach((r) => (r.itens = r.itens.filter((i) => i.songId !== id)));
      $("#editor").close(); salvar(); renderBook(); renderRep();
    });
    $("#e-palco").addEventListener("click", () => { const d = { titulo: $("#e-titulo").value, artista: $("#e-artista").value, cifra: $("#e-cifra").value }; $("#editor").close(); Palco.abrir([d], 0); });

    $("#w-buscar").addEventListener("click", buscarWeb);
    $("#w-q").addEventListener("keydown", (e) => e.key === "Enter" && buscarWeb());
    $("#w-res").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (b) escolherCandidato(+b.dataset.i); });
    $("#w-salvar").addEventListener("click", () => { const s = adicionarMusica(candidato); salvar(); renderBook(); aviso(`"${s.titulo}" salva no Book.`); });
    $("#w-salvar-rep").addEventListener("click", () => { const s = adicionarMusica(candidato); salvar(); renderBook(); adicionarAoRep(s.id); });

    $("#r-sel").addEventListener("change", (e) => { repId = e.target.value; salvar(); renderRep(); renderBook(); });
    $("#r-novo").addEventListener("click", novoRep);
    $("#r-renomear").addEventListener("click", () => { const r = rep(); const n = r && prompt("Novo nome:", r.nome); if (n) { r.nome = n; salvar(); renderRep(); } });
    $("#r-copiar").addEventListener("click", () => { const r = rep(); if (!r) return; const c = { ...structuredClone(r), id: uid(), nome: r.nome + " (cópia)", itens: r.itens.map((i) => ({ ...i, id: uid() })) }; reps.push(c); repId = c.id; salvar(); renderRep(); renderBook(); });
    $("#r-excluir").addEventListener("click", () => { const r = rep(); if (r && confirm(`Excluir o repertório "${r.nome}"? As músicas continuam no Book.`)) { reps = reps.filter((x) => x !== r); repId = reps[0]?.id || null; salvar(); renderRep(); renderBook(); } });
    $("#r-tipo").addEventListener("change", (e) => { const r = rep(); r.tipo = e.target.value; salvar(); renderRep(); });
    $("#r-organizar").addEventListener("click", () => { const r = rep(), ps = partesDoTipo(r); r.itens.sort((a, b) => ps.indexOf(a.parte) - ps.indexOf(b.parte)); salvar(); renderRep(); });

    const lista = $("#r-lista");
    lista.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-id]"), a = e.target.closest("[data-a]")?.dataset.a, r = rep(); if (!li || !a) return;
      const i = r.itens.find((x) => x.id === li.dataset.id);
      if (a === "x") r.itens = r.itens.filter((x) => x !== i);
      else if (a === "mais") i.semis++; else if (a === "menos") i.semis--;
      else if (a === "ver") return palco(r.itens.indexOf(i));
      else return;
      salvar(); renderRep();
    });
    lista.addEventListener("change", (e) => {
      const li = e.target.closest("li[data-id]"), r = rep(), i = r.itens.find((x) => x.id === li.dataset.id);
      if (e.target.dataset.a === "parte") i.parte = e.target.value; if (e.target.dataset.a === "obs") i.obs = e.target.value; salvar();
    });
    let arrasta = null;
    lista.addEventListener("dragstart", (e) => { arrasta = e.target.closest("li[data-id]"); e.dataTransfer.effectAllowed = "move"; });
    lista.addEventListener("dragover", (e) => { e.preventDefault(); const alvo = e.target.closest("li[data-id]"); $$("#r-lista li").forEach((l) => l.classList.toggle("sobre", l === alvo && l !== arrasta)); });
    lista.addEventListener("drop", (e) => {
      e.preventDefault(); const alvo = e.target.closest("li[data-id]"), r = rep(); if (!arrasta || !alvo || alvo === arrasta) return renderRep();
      const de = r.itens.findIndex((x) => x.id === arrasta.dataset.id), para = r.itens.findIndex((x) => x.id === alvo.dataset.id);
      r.itens.splice(para, 0, r.itens.splice(de, 1)[0]); salvar(); renderRep();
    });
    lista.addEventListener("dragend", () => { arrasta = null; $$("#r-lista li").forEach((l) => l.classList.remove("sobre")); });

    $$("[data-x]").forEach((b) => b.addEventListener("click", () => exportar(b.dataset.x)));
    $("#x-imprimir").addEventListener("click", imprimir);
    $("#x-palco").addEventListener("click", () => palco(0));
  }

  function iniciar() {
    if (!songs.length) importarAntigos();
    if (!reps.length) { reps.push({ id: uid(), nome: `Missa ${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}`, tipo: "Missa", itens: [], atualizado: Date.now() }); }
    if (!rep()) repId = reps[0].id;
    ligar(); salvar(); renderBook(); renderRep(); aba("book");
  }
  document.addEventListener("DOMContentLoaded", iniciar);
})();
