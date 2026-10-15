// Motor da ficha: porte fiel de ferramenta/render.py, gen.py e das regras de fichas.py.
// Gera o mesmo HTML que o Python (conferido por tests/paridade.mjs), então o PDF sai igual.
// Funciona no navegador e no Node (sem dependências).

export const PW = 841.92, PH = 594.96;
const GREEN = '#1f8a5f', AMBER = '#c97f06', RED = '#ce4b39';
const SYMCOL = { '✓': GREEN, '~': AMBER, '!': RED };
const FF = {
  bric: ['Bric', 800], inter: ['Intr', 400], interb: ['Intr', 700], plex: ['Plex', 500], plexsb: ['PlexSB', 600],
  consolas: ['Cons', 400], segoe: ['Intr', 400],
};
const CHECK_PTS = [[119, 210], [130, 203], [144, 205], [162, 229], [176, 249], [194, 205], [222, 152], [250, 113], [264, 104], [274, 109], [271, 122], [242, 167], [217, 212], [198, 255], [188, 275], [172, 280], [164, 276], [150, 255], [132, 232], [120, 219]];
const ROTK = 1.58;
export const ESCOLA_PADRAO = 'CE 026 - Jaú';
export const FONTES = {
  Bric: 'BricolageGrotesque[opsz,wdth,wght].ttf', Intr: 'Inter[opsz,wght].ttf',
  Plex: 'IBMPlexMono-Medium.ttf', PlexSB: 'IBMPlexMono-SemiBold.ttf',
};

// ---------- números e textos no formato do Python ----------
// f'{v:.{d}f}': arredonda o valor binário exato, empate vai para o par.
function fixed(v, d) {
  if (Object.is(v, -0)) return '-' + (0).toFixed(d);
  const a = Math.abs(v), m = a * 2 ** (d + 1);
  if (Number.isInteger(m) && m % 2 === 1) {            // empate exato
    let q = Math.floor(a * 10 ** d);
    if (q % 2) q += 1;
    return (v < 0 ? '-' : '') + (q / 10 ** d).toFixed(d);
  }
  return v.toFixed(d);
}
const strip = (s) => s.replace(/0+$/, '').replace(/\.$/, '');
const n = (v) => strip(fixed(v, 2));
const n3 = (v) => strip(fixed(v, 3));
const pyFloat = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));   // str(float)
function pyRound(x) {                                                      // round() do Python
  const f = Math.floor(x);
  if (x - f === 0.5) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const len = (s) => [...s].length;
const igual = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const contem = (lista, t) => lista.some((x) => igual(x, t));
const porChave = (k) => (a, b) => a[k] - b[k];
export const primeiroNome = (nome) => nome.trim().split(/\s+/)[0];

export function criarMotor({ templates, offsets }) {
  function offsNear(font, size, lh) {
    const c = Object.entries(offsets).filter(([k]) => k.split('|')[0] === font && k.split('|')[2] === String(lh))
      .map(([k, v]) => [Math.abs(parseFloat(k.split('|')[1]) - size), k, v]);
    c.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    const [, k, v] = c[0];
    return v * size / parseFloat(k.split('|')[1]);
  }

  class Page {
    constructor() { this.layers = [[], [], [], [], [], []]; this.svg = []; }
    div(layer, style) { this.layers[layer].push(`<div class="a" style="${style}"></div>`); }
    raw(layer, h) { this.layers[layer].push(h); }
    rect(x, y, w, h, c, layer = 2) { this.div(layer, `left:${n(x)}pt;top:${n(y)}pt;width:${n(w)}pt;height:${n(h)}pt;background:${c}`); }
    rrect(x, y, w, h, c, r, layer = 1) { this.div(layer, `left:${n(x)}pt;top:${n(y)}pt;width:${n(w)}pt;height:${n(h)}pt;background:${c};border-radius:${n(r)}pt`); }
    circle(x, y, d, c, layer = 3) { this.div(layer, `left:${n(x)}pt;top:${n(y)}pt;width:${n(d)}pt;height:${n(d)}pt;background:${c};border-radius:50%`); }
    ring(x, y, w, h, c, r, lw) {
      const o = lw / 2;
      this.div(3, `left:${n(x - o)}pt;top:${n(y - o)}pt;width:${n(w + lw)}pt;height:${n(h + lw)}pt;border:${n(lw)}pt solid ${c};border-radius:${n(r + o)}pt`);
    }
    hdash(x0, x1, y, h, c) { this.div(3, `left:${n(x0)}pt;top:${n(y)}pt;width:${n(x1 - x0)}pt;height:0;border-bottom:${n(h)}pt dashed ${c}`); }
    vdash(x, y0, y1, w, c) { this.div(3, `left:${n(x)}pt;top:${n(y0)}pt;width:0;height:${n(y1 - y0)}pt;border-left:${n(w)}pt dashed ${c}`); }
    text(x, b, size, font, color, t, ls = 0.0, rot = 0.0, lh = null) {
      const [fam, wt] = FF[font];
      const off = offsets[`${font}|${pyFloat(size)}|${lh || 1}`] || offsNear(font, size, lh || 1);
      const lsx = Math.abs(ls) > 0.004 ? `;letter-spacing:${n(ls)}pt` : '';
      const lhs = lh ? `${n(lh)}px` : '1';
      let sty = `left:${n(x)}pt;top:${n(b - off)}pt;font-family:${fam};font-weight:${wt};font-size:${n3(size)}pt;line-height:${lhs};color:${color};white-space:pre${lsx}`;
      if (rot) sty += `;transform-origin:0 ${n(off)}pt;transform:rotate(90deg)`;
      this.layers[4].push(`<div class="a" style="${sty}">${esc(t)}</div>`);
    }
    check(cx, cy, d, color = '#fff') {
      const k = d / 376.0;
      const pts = CHECK_PTS.map(([x, y]) => `${n(cx + x * k)},${n(cy + y * k)}`).join(' ');
      this.svg.push(`<polygon points="${pts}" fill="${color}" stroke="${color}" stroke-width="${n(0.12 * d / 11.2)}" stroke-linejoin="round"/>`);
    }
    arrow(x, b, size, color) {
      const k = size / 2048.0, sw = 150 * k;
      const x0 = x + 20 * k, tip = x + 1106 * k - sw * 0.7, hx = x + 660 * k;
      const cy = b - 565 * k, hh = 330 * k;
      this.svg.push(`<path d="M${n(x0)} ${n(cy)}H${n(tip)}M${n(hx)} ${n(cy - hh)}L${n(tip)} ${n(cy)}L${n(hx)} ${n(cy + hh)}" ` +
        `fill="none" stroke="${color}" stroke-width="${n(sw)}" stroke-linejoin="miter" stroke-linecap="butt"/>`);
    }
    html() {
      const body = this.layers.slice(0, 5).map((l) => l.join('')).join('');
      const svg = `<svg class="t" viewBox="0 0 ${PW} ${PH}" xmlns="http://www.w3.org/2000/svg">${this.svg.join('')}</svg>`;
      return `<div class="pg">${body}${svg}${this.layers[5].join('')}</div>`;
    }
  }

  function drawStatic(P, el, skipText = () => false, skipCircle = () => false, skipRect = () => false) {
    for (const r of el.rects) { if (skipRect(r)) continue; P.rect(r.x, r.y, r.w, r.h, r.c, r.h > 500 ? 0 : 2); }
    for (const r of el.rrects) { if (skipRect(r)) continue; P.rrect(r.x, r.y, r.w, r.h, r.fill, r.r, 1); }
    for (const c of el.circles.filter((c) => !skipCircle(c))) P.circle(c.x, c.y, c.w, c.fill);
    for (const r of el.rings) P.ring(r.x, r.y, r.w, r.h, r.stroke, r.r, Math.max(r.lw, 0.75));
    for (const d of el.dashes) P.hdash(d.x0, d.x1, d.y, d.h, d.c);
    for (const d of el.vdashes) P.vdash(d.x, d.y0, d.y1, d.w, d.c);
    for (const t of el.texts) {
      if (skipText(t)) continue;
      if (t.f === 'consolas' && t.t === '→') { P.arrow(t.x, t.b, t.s, t.c); continue; }
      if (t.f === 'segoe' && t.t === '✓') {
        const cx = t.x + 2.5;
        for (const c of el.circles) {
          if (c.x - 0.5 <= cx && cx <= c.x + c.w + 0.5 && c.y - 1 <= t.b - 3 && t.b - 3 <= c.y + c.w + 1) { P.check(c.x, c.y, c.w); break; }
        }
        continue;
      }
      if (t.rot) { P.text(t.x, t.b, t.s * ROTK, t.f, t.c, t.t, 0.0, t.rot); continue; }
      P.text(t.x, t.b, t.s, t.f, t.c, t.t, t.ls ?? 0.0);
    }
  }

  function monoRun(P, ref, s, rightAlign = false) {
    const adv = ref.s * 0.6, ls = ref.ls ?? 0.0;
    const W = len(s) * adv + (len(s) - 1) * ls;
    const x0 = rightAlign ? ref.x1 - W : ref.x;
    P.text(x0, ref.b, ref.s, ref.f, ref.c, s, ls);
  }

  function page1(f, T) {
    const P = new Page();
    const counts = f.contagem;
    const rr = T.rrects.find((r) => Math.abs(r.h - 6) < 0.01 && Math.abs(r.w - 333.75) < 0.01) ?? null;
    const rad = rr ? rr.r : 3.0;
    const trackfill = rr ? rr.fill : '#f1f5f4';
    const ys = [];
    for (const r of [...T.rects, ...T.rrects].sort(porChave('y'))) {
      if (Math.abs(r.h - 6) < 0.01 && r.x > 440 && r.w < 333.8 && !ys.some((y) => Math.abs(r.y - y) < 0.3)) ys.push(r.y);
    }
    const tracks = ys.map((y) => ({ x: 463.5, y, w: 333.75, h: 6.0, r: rad }));
    if (tracks.length !== 2) throw new Error(`modelo sem as 2 barras: ${ys}`);
    const ty = tracks.map((t) => t.y);
    const isbar = (r) => Math.abs(r.h - 6) < 0.01 && ty.some((y) => Math.abs(r.y - y) < 0.3);
    const isdot = (c) => Math.abs(c.w - 4.5) < 0.01 && ty.some((y) => Math.abs(c.y - (y + 12)) < 0.3);
    const nameT = T.texts.find((t) => t.f === 'bric' && Math.abs(t.s - 12.7) < 0.15 && t.x > 440);
    const ceT = T.texts.find((t) => t.f === 'plex' && Math.abs(t.s - 6.7) < 0.1 && t.x > 440 && t.t.startsWith('CE'));
    const greet = T.texts.filter((t) => t.f === 'inter' && Math.abs(t.s - 8.4) < 0.1);
    const cntruns = T.texts.filter((t) => t.f === 'plex' && Math.abs(t.s - 6.6) < 0.1 && t.x > 440);
    const skipT = (t) => t === nameT || t === ceT || contem(greet, t) || contem(cntruns, t);
    drawStatic(P, T, skipT, isdot, isbar);
    P.text(nameT.x, nameT.b, nameT.s, 'bric', nameT.c, f.nome);
    monoRun(P, ceT, `${f.escola} · ${f.ano} · Turma ${f.turma} · RM ${f.rm}`);
    const gs = [...greet].sort(porChave('b'));
    const g0 = gs[0], pitch = gs[1].b - g0.b;
    const msg = `Oi, ${primeiroNome(f.nome)}! Este mapa mostra como foi seu desempenho nos conteúdos avaliados e dá dicas de como continuar avançando nos estudos.`;
    const lhpx = pyRound(pitch * 4 / 3);
    const goff = offsets[`inter|${pyFloat(g0.s)}|${lhpx}`];
    if (goff === undefined) throw new Error('ajuste de fonte da saudação ausente');
    P.raw(4, `<div class="a" style="left:${n(g0.x)}pt;top:${n(g0.b - goff)}pt;width:${n(806.25 - g0.x)}pt;font:400 ${n3(g0.s)}pt/${lhpx}px Intr;color:${g0.c}">${esc(msg)}</div>`);
    const lines = [...new Set(cntruns.map((t) => t.b))].sort((a, b) => a - b);
    tracks.forEach((trk, i) => {
      const [g, a, r, tot] = counts[i];
      let inner = '', cum = 0;
      const totalPx = pyRound(trk.w * 4 / 3);
      for (const [v, c] of [[g, GREEN], [a, AMBER], [r, RED]]) {
        if (v && tot) {
          const e0 = Math.floor(cum / tot * totalPx + 0.5); cum += v; const e1 = Math.floor(cum / tot * totalPx + 0.5);
          inner += `<div class="a" style="left:${n(e0 * 0.75)}pt;top:0;width:${n((e1 - e0) * 0.75)}pt;height:${n(trk.h)}pt;background:${c}"></div>`;
        }
      }
      P.raw(2, `<div class="a" style="left:${n(trk.x)}pt;top:${n(trk.y)}pt;width:${n(trk.w)}pt;height:${n(trk.h)}pt;border-radius:${n(trk.r)}pt;overflow:hidden;background:${trackfill}">${inner}</div>`);
      const bl = lines[i];
      const runs = cntruns.filter((t) => t.b === bl).sort(porChave('x'));
      const nums = runs.filter((t) => /^\d+$/.test(t.t.trim()) && !t.t.startsWith('·')).slice(0, 3);
      const suf = runs.find((t) => t.t.startsWith('·'));
      const pitch1 = nums[1].x - nums[0].x, adv = nums[0].s * 0.6;
      let c2 = 0.0;
      for (const [v, c] of [[g, GREEN], [a, AMBER], [r, RED]]) {
        const dxp = Math.floor((463.5 + c2) * 4 / 3 + 1e-6) * 0.75;
        P.circle(dxp, trk.y + 12.0, 4.5, c);
        P.text(nums[0].x + c2, nums[0].b, nums[0].s, 'plex', nums[0].c, String(v));
        c2 += pitch1 + (String(v).length - 1) * adv;
      }
      P.text(suf.x + (c2 - 3 * pitch1), suf.b, suf.s, 'plex', suf.c, `· ${tot} conteúdos`);
    });
    return P.html();
  }

  function glyphParams(T, x0) {
    const gp = {};
    const circs = T.circles.filter((c) => Math.abs(c.w - 11.25) < 0.1 && Math.abs(c.x - x0) < 0.3 && c.y > 100 && c.y < 480);
    for (const t of T.texts) {
      if (t.c === '#ffffff' && t.f === 'interb' && (t.t === '~' || t.t === '!') && x0 - 1 < t.x && t.x < x0 + 12) {
        const c = circs.find((c) => Math.abs(c.y + 8.25 - t.b) < 1.0);
        if (c) gp[t.t] = { dx: t.x - c.x, db: t.b - c.y, s: t.s };
      }
    }
    return gp;
  }

  function page2(f, TL, TR) {
    const P = new Page();
    const hdr = TL.texts.find((t) => t.f === 'plex' && Math.abs(t.s - 6.0) < 0.05 && t.t.startsWith('AVALIA'));
    const foot = TR.texts.find((t) => t.f === 'plex' && Math.abs(t.s - 5.6) < 0.05 && t.x > 600);
    const rowcirc = (c, x0) => Math.abs(c.w - 11.25) < 0.1 && Math.abs(c.x - x0) < 0.3 && c.y > 100 && c.y < 480;
    const rowglyph = (t, x0) => t.c === '#ffffff' && (t.f === 'interb' || t.f === 'segoe') && x0 - 1 < t.x && t.x < x0 + 12 && t.b > 100 && t.b < 485;
    const Lc = TL.circles.filter((c) => rowcirc(c, 35.2)).sort(porChave('y'));
    const Rc = TR.circles.filter((c) => rowcirc(c, 444.7)).sort(porChave('y'));
    const gpL = glyphParams(TL, 35.2), gpR = glyphParams(TR, 444.7);
    drawStatic(P, TL, (t) => t === hdr || rowglyph(t, 35.2), (c) => rowcirc(c, 35.2));
    drawStatic(P, TR, (t) => t === foot || rowglyph(t, 444.7), (c) => rowcirc(c, 444.7));
    monoRun(P, hdr, `AVALIA SESI-SP · ${f.ano} ${f.turma} · ${f.escola.toUpperCase()}`);
    monoRun(P, foot, f.nome, true);
    for (const [circs, key, gp] of [[Lc, 'LP', gpL], [Rc, 'MAT', gpR]]) {
      const items = f.itens[key];
      if (items.length !== circs.length) throw new Error(`${key}: ${items.length} conteúdos, o modelo tem ${circs.length}`);
      const base = gp['~'] || gp['!'] || { dx: 3.55, db: 8.25, s: 6.67 };
      circs.forEach((c, i) => {
        const sym = items[i][0];
        P.circle(c.x, c.y, c.w, SYMCOL[sym]);
        if (sym === '✓') P.check(c.x, c.y, c.w);
        else {
          const g = gp[sym] || { dx: base.dx + (sym === '!' ? 1.2 : 0), db: base.db - (sym === '!' ? 0.05 : 0), s: base.s };
          P.text(c.x + g.dx, c.y + g.db, g.s, 'interb', '#ffffff', sym);
        }
      });
    }
    return P.html();
  }

  const segmento = (a) => (a.includes('EM') ? 'EM' : '345'.includes(a[0]) ? 'EF1' : 'EF2');
  function half(ano, st) {
    if (templates[ano][st] != null) return templates[ano][st];
    for (const [a, t] of Object.entries(templates)) if (segmento(a) === segmento(ano) && t[st] != null) return t[st];
    throw new Error(`sem modelo ${st} para ${ano}`);
  }

  // f: ficha normalizada (ver normalizar)
  function fichaPages(f) {
    f = { escola: ESCOLA_PADRAO, ...f };
    const T = templates[f.ano];
    const stL = f.itens.LP.length ? 'L_full' : 'L_empty';
    const stR = f.itens.MAT.length ? 'R_full' : 'R_empty';
    return [page1(f, T.p1), page2(f, half(f.ano, stL), half(f.ano, stR))];
  }

  return { fichaPages };
}

// ---------- documento ----------
// fontUrl(nomeDoArquivo) -> url da fonte. extraCss é acrescentado no fim (ex.: cores na impressão).
export function css({ fontUrl, extraCss = '' }) {
  const f = (k) => fontUrl(FONTES[k]);
  return `
@font-face{font-family:Bric;src:url('${f('Bric')}');font-weight:200 800;font-stretch:75% 100%}
@font-face{font-family:Intr;src:url('${f('Intr')}');font-weight:100 900}
@font-face{font-family:Plex;src:url('${f('Plex')}');font-weight:500}
@font-face{font-family:PlexSB;src:url('${f('PlexSB')}');font-weight:600}
@page{size:${PW}pt ${PH}pt;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
.pg{position:relative;width:${PW}pt;height:${PH}pt;overflow:hidden;background:#fff;page-break-after:always;break-after:page}
.pg:last-child{page-break-after:auto;break-after:auto}
.a{position:absolute}
svg.t{position:absolute;left:0;top:0;width:${PW}pt;height:${PH}pt;overflow:visible}
svg.t text{white-space:pre}
${extraCss}`;
}

export function buildHtml(pages, opts) {
  const titulo = opts.titulo ? `<title>${esc(opts.titulo)}</title>` : '';
  return `<!doctype html><html><head><meta charset="utf-8">${titulo}<style>${css(opts)}</style></head><body>${pages.join('')}</body></html>`;
}

// ---------- regras dos dados (fichas.py) ----------
export const SIM = ['✓', '~', '!'];
export const NOME_SIM = { '✓': 'Você domina', '~': 'Quase lá', '!': 'Comece por aqui' };
export const ORDEM_ANO = ['3º EF', '4º EF', '5º EF', '6º EF', '7º EF', '8º EF', '9º EF', '1º EM', '2º EM', '3º EM'];
const ascii = (s) => String(s).normalize('NFKD').replace(/[^\x00-\x7f]/g, '');

export function normAno(v) {
  const s = ascii(v).toLowerCase();
  const m = s.match(/(\d)/);
  if (!m) throw new Error(`ano inválido: ${v}`);
  const k = Number(m[1]);
  const em = /\bem\b|medio|serie/.test(s), ef = /\bef\b|fundamental/.test(s);
  const seg = em ? 'EM' : (ef || k >= 4) ? 'EF' : null;
  if (!seg) throw new Error(`ano ambíguo (informe EF ou EM): ${v}`);
  const ano = `${k}º ${seg}`;
  if (!ORDEM_ANO.includes(ano)) throw new Error(`ano sem modelo: ${ano}`);
  return ano;
}

// situação: símbolo, texto, "2/3", [acertos, total] ou atalho de digitação (v, q, c)
export function sit(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const [a, t] = v;
    if (t === null || t === undefined || t === 0 || t === '') return null;
    return a >= t ? '✓' : a <= 0 ? '!' : '~';
  }
  const s = String(v).trim();
  if (s === '') return null;
  if (SIM.includes(s)) return s;
  const k = ascii(s).toLowerCase();
  if (['voce domina', 'domina', 'dominio', 'ok', 'certo'].some((p) => k.startsWith(p)) || s === '✔' || s === '√' || k === 'v') return '✓';
  if (['quase', 'parcial'].some((p) => k.startsWith(p)) || s === '≈' || k === 'q') return '~';
  if (['comece', 'nao domina', 'erro', 'errado'].some((p) => k.startsWith(p)) || s === '❗' || s === '¡' || k === 'c') return '!';
  const m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return sit([Number(m[1]), Number(m[2])]);
  throw new Error(`situação inválida: "${v}"`);
}

export function contagem(itens) {
  return ['LP', 'MAT'].map((k) => [...SIM.map((sy) => itens[k].filter(([s]) => s === sy).length), itens[k].length]);
}

// aluno bruto {nome, ano, turma, rm, LP:[...], MAT:[...], escola?} -> ficha pronta. Lança Error com mensagem clara.
export function normalizar(rec, dados) {
  const nome = String(rec.nome ?? '').split(/\s+/).filter(Boolean).join(' ');
  const ano = normAno(rec.ano);
  const turma = String(rec.turma ?? '').trim().toUpperCase();
  const rm = String(rec.rm ?? '').trim().replace(/\.0$/, '');
  if (!nome || !turma || !/^\d+$/.test(rm)) throw new Error(`${nome || '?'}: nome, turma e RM (numérico) são obrigatórios`);
  const itens = {};
  for (const k of ['LP', 'MAT']) {
    const desc = dados[ano].descritores[k];
    const st = (rec[k] || []).map(sit);
    if (st.every((x) => x === null)) { itens[k] = []; continue; }
    if (st.length !== desc.length) throw new Error(`${nome} (${ano}) ${k}: ${st.length} situações, o ano tem ${desc.length} conteúdos`);
    if (st.some((x) => x === null)) throw new Error(`${nome} (${ano}) ${k}: há conteúdos sem situação (preencha todos ou deixe o componente vazio)`);
    itens[k] = st.map((s, i) => [s, desc[i]]);
  }
  const f = { nome, ano, turma, rm, escola: rec.escola || ESCOLA_PADRAO, itens, contagem: contagem(itens) };
  f.situacao = itens.LP.length && itens.MAT.length ? 'completo' : itens.MAT.length ? 'falta LP' : itens.LP.length ? 'falta MAT' : 'sem dados';
  return f;
}

export function exemplo(ano, dados) {
  const ciclo = ['✓', '~', '!'];
  return {
    nome: 'Nome do Estudante', ano, turma: 'A', rm: '0000',
    LP: dados[ano].descritores.LP.map((_, i) => ciclo[i % 3]),
    MAT: dados[ano].descritores.MAT.map((_, i) => ciclo[(i + 1) % 3]),
  };
}

// ordem do PDF: ano, turma, nome (mesma ordem do Python)
export function ordenar(fichas) {
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return [...fichas].sort((a, b) => ORDEM_ANO.indexOf(a.ano) - ORDEM_ANO.indexOf(b.ano) || cmp(a.turma, b.turma) || cmp(a.nome, b.nome));
}
