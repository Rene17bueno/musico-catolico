/*
 * Roteiro da liturgia (opcional): dia litúrgico calculado pela data do repertório, ordem numerada da Missa
 * (1, 2, 3…) numa página inicial e numeração dos cantos. Texto próprio (sem trechos do Missal/Lecionário,
 * que têm direitos autorais); as leituras do dia entram como referência digitada ou link.
 * Carregado ANTES de app.js (app.js chama Liturgia.aplicar); a interface só usa window.CM depois.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------- Calendário litúrgico (rito romano, Brasil)
  const D = (a, m, d) => new Date(Date.UTC(a, m - 1, d));
  const mais = (t, n) => new Date(t.getTime() + n * 864e5);
  const dif = (a, b) => Math.round((a - b) / 864e5);
  const SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

  function pascoa(y) { // algoritmo de Meeus/Jones/Butcher
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const x = h + l - 7 * m + 114;
    return D(y, Math.floor(x / 31), (x % 31) + 1);
  }
  const advento = (y) => { const n = D(y, 12, 25); return mais(n, -(n.getUTCDay() || 7) - 21); };

  // Solenidades fixas (viram "domingo" na liturgia: Glória, Credo e 2ª leitura)
  const SOLENIDADES = {
    "3-19": ["São José", "branco"], "3-25": ["Anunciação do Senhor", "branco"], "6-24": ["Natividade de São João Batista", "branco"],
    "6-29": ["São Pedro e São Paulo", "vermelho"], "8-15": ["Assunção de Nossa Senhora", "branco"], "10-12": ["Nossa Senhora Aparecida", "branco"],
    "11-1": ["Todos os Santos", "branco"], "12-8": ["Imaculada Conceição", "branco"], "12-25": ["Natal do Senhor", "branco"],
    "1-1": ["Santa Maria, Mãe de Deus", "branco"],
  };

  /** Descreve o dia litúrgico de uma data "aaaa-mm-dd": {titulo, ano, cor, dominical, gloria, aleluia, tempo, especial} */
  function dia(iso) {
    const [y, m, dd] = iso.split("-").map(Number);
    const t = D(y, m, dd), dow = t.getUTCDay(), domingo = dow === 0;
    const P = pascoa(y), cinzas = mais(P, -46), lent1 = mais(P, -42), pent = mais(P, 49), adv1 = advento(y), rei = mais(adv1, -7);
    const jan2 = D(y, 1, 2), epif = mais(jan2, (7 - jan2.getUTCDay()) % 7);
    const batismo = epif.getUTCDate() <= 6 ? mais(epif, 7) : mais(epif, 1);
    const tc2 = epif.getUTCDate() <= 6 ? mais(epif, 14) : mais(epif, 7);
    const anoLit = t >= adv1 ? y : y - 1; // o ano litúrgico começa no Advento
    const ano = domingo ? "ABC"[anoLit % 3] : (y % 2 ? "I" : "II"); // domingos: A/B/C; dias de semana: I (ímpar) ou II (par)
    const r = { ano: `Ano ${ano}`, dominical: domingo, especial: "" };
    const ord = (n) => `${n}º`;

    let tempo, titulo, cor, gloria = domingo, aleluia = true;
    const antesRamos = t >= cinzas && t < mais(P, -3);
    if (t >= adv1) {
      if (t >= D(y, 12, 25)) { tempo = "Natal"; cor = "branco"; titulo = domingo ? "Sagrada Família" : `${SEMANA[dow]}, Tempo do Natal`; }
      else { tempo = "Advento"; cor = dif(t, adv1) >= 14 && dif(t, adv1) < 21 ? "rosa ou roxo" : "roxo"; gloria = false; titulo = domingo ? `${ord(dif(t, adv1) / 7 + 1)} Domingo do Advento` : `${SEMANA[dow]}, Tempo do Advento`; }
    } else if (t <= batismo) {
      tempo = "Natal"; cor = "branco";
      titulo = +t === +epif ? "Epifania do Senhor" : +t === +batismo ? "Batismo do Senhor" : `${SEMANA[dow]}, Tempo do Natal`;
      if (+t === +epif || +t === +batismo) gloria = true;
    } else if (t < cinzas) {
      tempo = "Tempo Comum"; cor = "verde";
      titulo = domingo ? `${ord(2 + dif(t, tc2) / 7)} Domingo do Tempo Comum` : `${SEMANA[dow]}, Tempo Comum`;
    } else if (antesRamos) {
      tempo = "Quaresma"; cor = "roxo"; gloria = false; aleluia = false;
      if (+t === +cinzas) titulo = "Quarta-feira de Cinzas";
      else if (domingo) { const n = dif(t, lent1) / 7 + 1; titulo = n === 6 ? "Domingo de Ramos" : `${ord(n)} Domingo da Quaresma`; if (n === 6) cor = "vermelho"; }
      else titulo = `${SEMANA[dow]}, Tempo da Quaresma`;
    } else if (t < P) {
      tempo = "Tríduo Pascal"; cor = +t === +mais(P, -3) ? "branco" : "vermelho";
      titulo = ["Quinta-feira Santa", "Sexta-feira da Paixão", "Sábado Santo"][dif(t, mais(P, -3))];
      r.especial = "Tríduo Pascal: ritos próprios. Siga o Missal e a orientação da paróquia.";
    } else if (t <= pent) {
      tempo = "Páscoa"; cor = +t === +pent ? "vermelho" : "branco"; gloria = domingo || (dif(t, P) < 8);
      const n = dif(t, P) / 7 + 1;
      titulo = +t === +P ? "Domingo de Páscoa" : +t === +pent ? "Pentecostes" : domingo ? (n === 7 ? "7º Domingo da Páscoa (Ascensão do Senhor)" : `${ord(n)} Domingo da Páscoa`) : `${SEMANA[dow]}, Tempo da Páscoa`;
    } else {
      tempo = "Tempo Comum"; cor = "verde";
      if (+t === +mais(P, 56)) titulo = "Santíssima Trindade";
      else if (+t === +rei) { titulo = "Cristo Rei do Universo"; gloria = true; }
      else titulo = domingo ? `${ord(34 - dif(rei, t) / 7)} Domingo do Tempo Comum` : `${SEMANA[dow]}, Tempo Comum`;
      if (+t === +mais(P, 56)) gloria = true;
    }
    if (tempo === "Páscoa" && !domingo && dif(t, P) >= 8) gloria = false;

    const sol = SOLENIDADES[`${m}-${dd}`];
    if (sol && (!domingo || tempo === "Tempo Comum" || tempo === "Natal")) { titulo = sol[0]; cor = sol[1]; r.dominical = true; gloria = true; }
    return { ...r, titulo, cor, tempo, gloria, aleluia: aleluia && tempo !== "Tríduo Pascal" };
  }

  // ---------------------------------------------------------------- Roteiro
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  // parte da lista de cantos → momento da Missa
  const PARTE_MOMENTO = {
    "entrada": "entrada", "ato penitencial": "ato", "gloria": "gloria", "salmo": "salmo", "aclamacao": "aclamacao",
    "ofertorio": "ofertorio", "santo": "santo", "pai nosso": "painosso", "cordeiro": "cordeiro",
    "comunhao": "comunhao", "comunhao criancas": "comunhao", "acao de gracas": "gracas", "final": "final",
  };

  /** Momentos da Missa na ordem, conforme o dia: [chave, nome, tipo] (tipo: canto, leitura ou rito) */
  function momentos(d) {
    const l = [
      ["entrada", "Canto de entrada", "canto"], ["ato", "Ato penitencial", "canto"],
      ...(d.gloria ? [["gloria", "Glória", "canto"]] : []),
      ["coleta", "Oração do dia (coleta)", "rito"], ["l1", "1ª leitura", "leitura"], ["salmo", "Salmo responsorial", "canto"],
      ...(d.dominical ? [["l2", "2ª leitura", "leitura"]] : []),
      ["aclamacao", d.aleluia ? "Aclamação ao Evangelho (Aleluia)" : "Aclamação ao Evangelho (sem Aleluia)", "canto"],
      ["ev", "Evangelho e homilia", "leitura"],
      ...(d.dominical ? [["creio", "Profissão de fé (Creio)", "rito"]] : []),
      ["fieis", "Oração dos fiéis", "rito"], ["ofertorio", "Ofertório", "canto"], ["santo", "Santo", "canto"],
      ["painosso", "Pai-nosso", "rito"], ["cordeiro", "Cordeiro de Deus", "canto"], ["comunhao", "Comunhão", "canto"],
      ["gracas", "Ação de graças", "canto"], ["final", "Canto final", "canto"],
    ];
    return l;
  }

  const linkLeituras = (iso) => `https://www.vaticannews.va/pt/palavra-do-dia/${iso.replace(/-/g, "/")}.html`;

  function quebrar(texto, largura = 62, recuo = 5) { // quebra por palavras, com recuo nas linhas seguintes
    const saida = []; let atual = "";
    for (const p of texto.split(/\s+/)) {
      if ((atual + " " + p).length > largura && atual) { saida.push(atual); atual = " ".repeat(recuo) + p; } else atual = atual ? atual + " " + p : p;
    }
    return saida.concat(atual);
  }

  /** Monta a página do roteiro e numera os cantos. Devolve {lista, texto, titulo}; lista = itens já numerados */
  function montar(lista, iso, leituras) {
    const d = dia(iso), ms = momentos(d);
    const porMomento = {};
    for (const it of lista) { const k = PARTE_MOMENTO[norm(it.Posição)]; if (k) (porMomento[k] ||= []).push(it); }
    const refs = String(leituras || "").split(";").map((s) => s.trim());
    const ref = Object.fromEntries(["l1", "salmo", ...(d.dominical ? ["l2"] : []), "ev"].map((k, i) => [k, refs[i] || ""]));

    const numero = {};
    const linhas = [];
    ms.forEach(([k, nome, tipo], i) => {
      numero[k] = i + 1;
      const cantos = (porMomento[k] || []).map((it) => it.Música).filter(Boolean);
      let resto = "";
      if (tipo === "canto") resto = cantos.length ? cantos.join(" / ") : "(sem canto)";
      else if (tipo === "leitura") resto = ref[k] || "";
      if (k === "salmo" && ref.salmo) resto = ref.salmo + (cantos.length ? " - " + cantos.join(" / ") : "");
      linhas.push(...quebrar(`${String(i + 1).padStart(2)}. ${nome}${resto ? ": " + resto : ""}`));
    });
    const outros = lista.filter((it) => !numero[PARTE_MOMENTO[norm(it.Posição)]]); // sem momento neste dia (ex.: Glória no Advento) ou parte fora da Missa
    if (outros.length) linhas.push("", ...quebrar("Fora do roteiro: " + outros.map((it) => `${it.Posição} - ${it.Música}`).join("; ")));

    const cab = [`${d.ano} - cor litúrgica: ${d.cor}`, "Leituras do dia: vaticannews.va/pt/palavra-do-dia/" + iso.replace(/-/g, "/")];
    if (!d.gloria) cab.push("Neste dia não se canta o Glória.");
    if (!d.aleluia) cab.push("Neste tempo não se canta o Aleluia.");
    if (d.especial) cab.push(...quebrar(d.especial, 62, 0));
    const texto = [...cab, "", ...linhas].join("\n");

    const numerada = lista.map((it) => {
      const k = PARTE_MOMENTO[norm(it.Posição)];
      return k && numero[k] ? { ...it, Posição: `${numero[k]}. ${it.Posição}` } : it;
    });
    return { d, texto, lista: numerada };
  }

  const DATA_RE = /(\d{2})-(\d{2})-(\d{4})/;
  const isoDoNome = (n) => { const m = DATA_RE.exec(n || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };

  /** Chamado por app.js: se ligado (opcoes.liturgia), só em Missa e com data no nome, devolve roteiro + cantos numerados */
  function aplicar(lista, rep, opcoes) {
    const iso = isoDoNome(rep && rep.nome);
    if (!opcoes.liturgia || !iso || (rep.tipo || "Missa") !== "Missa" || !lista.length) return lista;
    const r = montar(lista, iso, rep.leituras);
    const pagina = { Posição: "Roteiro da Missa", Música: r.d.titulo, Artista: "", Cifra: r.texto, URL: "", Status: "OK", Colunas: 1, ColunasAuto: true, Tamanho: 11 };
    return [pagina, ...r.lista];
  }

  /** Confere o repertório com o dia litúrgico: Glória fora do tempo, Aleluia na Quaresma, salmo e domingo que não batem */
  function avisos(musicas, iso, leituras) {
    const d = dia(iso), saida = [];
    const titulo = (m) => String((m.resultado && m.resultado.Música) || (m.busca && m.busca.titulo) || "").trim();
    const refs = String(leituras || "").split(";").map((x) => x.trim());
    const salmoRef = (/\d+/.exec(refs[1] || "") || [])[0];
    for (const m of musicas) {
      const t = titulo(m), k = PARTE_MOMENTO[norm(m.posicao)];
      if (!t) continue;
      if (k === "gloria" && !d.gloria) saida.push(`Neste dia (${d.titulo}) não se canta o Glória. Tire "${t}" ou mude a parte.`);
      if (k === "aclamacao" && !d.aleluia && /alelu/i.test(t)) saida.push(`Neste tempo (${d.tempo}) não se canta o Aleluia: "${t}" precisa de outra aclamação.`);
      if (k === "salmo" && salmoRef) {
        const n = /salmo\s+(\d+)(?:\s*\((\d+)\))?/i.exec(t);
        if (n && ![n[1], n[2]].includes(salmoRef)) saida.push(`O Salmo das leituras é o ${salmoRef}, mas "${t}" é o Salmo ${n[1]}${n[2] ? " (" + n[2] + ")" : ""}.`);
      }
      const dom = /(\d{1,2})\s*[ºo°]\s*domingo/i.exec(t);
      if (dom && !new RegExp(`${+dom[1]}º Domingo`).test(d.titulo)) saida.push(`"${t}" cita o ${dom[1]}º domingo, mas este repertório é de ${d.titulo}.`);
    }
    return saida;
  }

  window.Liturgia = { dia, montar, aplicar, isoDoNome, linkLeituras, avisos };

  // ---------------------------------------------------------------- Interface (seção Baixar)
  const $ = (s) => document.querySelector(s);
  function iniciar() {
    const alvo = $("#info-baixar");
    if (!alvo || $("#lit-incluir")) return;
    const f = document.createElement("fieldset");
    f.className = "campo";
    f.id = "liturgia-box";
    f.innerHTML = '<legend>Liturgia (só para Missa)</legend>'
      + '<label><input type="checkbox" id="lit-incluir"> Incluir o roteiro da liturgia (1, 2, 3… com o dia litúrgico) e numerar os cantos</label>'
      + '<label class="campo cresce">Leituras do dia (opcional; separe por ponto e vírgula, na ordem 1ª leitura; salmo; 2ª leitura; evangelho)'
      + '<input id="lit-leituras" type="text" maxlength="160" placeholder="Ex.: Is 5,1-7; Sl 79; Fl 4,6-9; Mt 21,33-43"></label>'
      + '<p id="lit-info" class="dica"></p>';
    alvo.before(f);
    f.addEventListener("change", (e) => {
      const CM = window.CM;
      if (e.target.id === "lit-incluir") CM.opcao("liturgia", e.target.checked);
      if (e.target.id === "lit-leituras") { CM.rep.leituras = e.target.value.trim(); CM.salvar(); CM.refazer(); }
    });
    document.addEventListener("cm:render", () => setTimeout(sincronizar, 0));
    sincronizar();
  }
  function sincronizar() {
    const CM = window.CM;
    if (!CM || !CM.rep) return;
    const missa = (CM.rep.tipo || "Missa") === "Missa", iso = isoDoNome(CM.rep.nome);
    $("#liturgia-box").hidden = !missa;
    $("#lit-incluir").checked = !!CM.opcao("liturgia");
    if (document.activeElement !== $("#lit-leituras")) $("#lit-leituras").value = CM.rep.leituras || "";
    $("#lit-info").innerHTML = !iso ? "Defina a data do repertório (campo de data lá em cima) para descobrir o dia litúrgico."
      : (() => { const d = dia(iso); return `Dia litúrgico: <b>${d.titulo}</b> (${d.ano}, ${d.cor}). <a href="${linkLeituras(iso)}" target="_blank" rel="noopener">Ver as leituras do dia ↗</a>`; })();
  }
  // Aviso litúrgico em cima da lista de músicas
  function mostrarAvisos() {
    const CM = window.CM, alvo = $("#lista-musicas");
    if (!CM || !CM.rep || !alvo) return;
    let el = $("#lit-avisos");
    if (!el) { el = document.createElement("ul"); el.id = "lit-avisos"; el.className = "aviso-alerta"; alvo.before(el); }
    const iso = isoDoNome(CM.rep.nome);
    const lista = iso && (CM.rep.tipo || "Missa") === "Missa" ? avisos(CM.rep.musicas, iso, CM.rep.leituras) : [];
    el.hidden = !lista.length;
    el.replaceChildren(...lista.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  }
  document.addEventListener("cm:render", () => setTimeout(mostrarAvisos, 0));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
