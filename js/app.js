// Página do gerador de fichas. Tudo roda no navegador; nada é enviado para fora.
import { criarMotor, buildHtml, normalizar, exemplo, ordenar, sit, NOME_SIM, ORDEM_ANO, ESCOLA_PADRAO, PW, PH } from './motor.js';
import { gerarPlanilha, lerPlanilha } from './planilha.js';

const CHAVE = 'fichas-avaliasesi:v1';
const $ = (s) => document.querySelector(s);
const CLASSE = { '✓': 'ok', '~': 'quase', '!': 'comece' };
const NOME_K = { LP: 'Língua Portuguesa', MAT: 'Matemática' };
const TECLA = { 1: '✓', v: '✓', '✓': '✓', 2: '~', q: '~', '~': '~', 3: '!', c: '!', '!': '!' };
const CICLO = ['', '✓', '~', '!'];
const PX = PW * 4 / 3, PY = PH * 4 / 3;          // tamanho da página em px CSS
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fontUrl = (arq) => new URL(`ferramenta/fonts/${encodeURIComponent(arq)}`, location.href).href;
const CSS_IMPRESSAO = 'html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}';
const CSS_PREVIA = 'html,body{background:#e9ebe8}.pg{margin:0 0 16px}';

let dados, motor, S;
let seq = 0;
const novoId = () => `a${Date.now().toString(36)}${(seq++).toString(36)}`;

// ---------- estado ----------
const estadoInicial = () => ({ lote: { ano: '9º EF', turma: 'A', comp: 'ambos', escola: ESCOLA_PADRAO, turmaPorAluno: false }, alunos: [], sel: null });
const nK = (k, ano = S.lote.ano) => dados[ano].descritores[k].length;
const comps = () => (S.lote.comp === 'ambos' ? ['LP', 'MAT'] : [S.lote.comp]);
const novoAluno = (o = {}) => ({ id: novoId(), nome: '', rm: '', turma: '', LP: Array(nK('LP')).fill(''), MAT: Array(nK('MAT')).fill(''), ...o });
const temDados = (a) => a.nome.trim() || a.rm.trim() || a.LP.some(Boolean) || a.MAT.some(Boolean);

function sanear(j) {
  const base = estadoInicial();
  const lote = { ...base.lote, ...(j.lote || {}) };
  if (!dados[lote.ano]) lote.ano = base.lote.ano;
  if (!['ambos', 'LP', 'MAT'].includes(lote.comp)) lote.comp = 'ambos';
  S = { lote, alunos: [], sel: j.sel ?? null };
  S.alunos = (j.alunos || []).map((a) => novoAluno({
    id: a.id || novoId(), nome: String(a.nome ?? ''), rm: String(a.rm ?? ''), turma: String(a.turma ?? ''),
    LP: Array.isArray(a.LP) ? a.LP : [], MAT: Array.isArray(a.MAT) ? a.MAT : [],
  }));
  ajustarTamanhos();
  return S;
}
function ajustarTamanhos() {
  for (const a of S.alunos) for (const k of ['LP', 'MAT']) {
    a[k] = Array.from({ length: nK(k) }, (_, i) => (CLASSE[a[k][i]] ? a[k][i] : ''));
  }
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify({ versao: 1, lote: S.lote, alunos: S.alunos, sel: S.sel })); } catch { /* sem armazenamento: segue sem salvar */ }
}
function carregar() {
  try { const j = JSON.parse(localStorage.getItem(CHAVE)); if (j && j.lote && Array.isArray(j.alunos)) return sanear(j); } catch { /* ignora */ }
  return null;
}

// ---------- avaliação de cada aluno ----------
function turmaDe(a) { return ((S.lote.turmaPorAluno && a.turma.trim()) || S.lote.turma || '').trim().toUpperCase(); }
function recDe(a) {
  return { nome: a.nome, ano: S.lote.ano, turma: turmaDe(a), rm: a.rm.trim(), escola: S.lote.escola.trim() || ESCOLA_PADRAO,
    LP: comps().includes('LP') ? a.LP : [], MAT: comps().includes('MAT') ? a.MAT : [] };
}
function avaliar(a) {
  if (!temDados(a)) return { estado: 'vazia', erros: [] };
  const erros = [];
  if (!a.nome.trim()) erros.push('falta o nome');
  if (!a.rm.trim()) erros.push('falta o RM'); else if (!/^\d+$/.test(a.rm.trim())) erros.push('RM deve ter só números');
  if (!turmaDe(a)) erros.push('falta a turma');
  let incompleto = false, algum = false;
  for (const k of comps()) {
    const f = a[k].filter(Boolean).length;
    if (f) algum = true;
    if (f && f < a[k].length) { incompleto = true; erros.push(`${k}: faltam ${a[k].length - f} de ${a[k].length} conteúdos`); }
  }
  if (!algum && !incompleto) erros.push('nenhum resultado marcado');
  if (erros.length) return { estado: algum || incompleto ? 'erro' : 'nada', erros, incompleto };
  try {
    const f = normalizar(recDe(a), dados);
    return { estado: 'ok', ficha: f, erros: [] };
  } catch (e) { return { estado: 'erro', erros: [e.message] }; }
}
function tagDe(av) {
  if (av.estado === 'vazia') return '';
  if (av.estado === 'nada') return '<span class="tag nada">sem resultados</span>';
  if (av.estado === 'erro') return `<span class="tag erro" title="${esc(av.erros.join('; '))}">pendente</span>`;
  const s = av.ficha.situacao;
  const esperado = { ambos: 'completo', LP: 'falta MAT', MAT: 'falta LP' }[S.lote.comp];
  const txt = s === 'completo' ? 'completa' : s === 'falta MAT' ? 'só LP' : 'só MAT';
  return `<span class="tag ${s === esperado ? 'completa' : 'parcial'}">${txt}</span>`;
}

// ---------- grade ----------
function colunas() {
  const c = [{ t: 'nome' }, { t: 'rm' }];
  if (S.lote.turmaPorAluno) c.push({ t: 'turma' });
  for (const k of comps()) for (let i = 0; i < nK(k); i++) c.push({ t: 's', k, i });
  return c;
}

function renderGrade() {
  const t = $('#grade');
  const cols = colunas();
  const desc = dados[S.lote.ano].descritores;
  $('#vazio').hidden = S.alunos.length > 0;
  t.hidden = S.alunos.length === 0;
  let h = '<thead><tr><th class="fixa" rowspan="2">#</th><th class="fixa nome" rowspan="2">Nome do aluno</th><th rowspan="2">RM</th>';
  if (S.lote.turmaPorAluno) h += '<th rowspan="2">Turma</th>';
  for (const k of comps()) h += `<th class="grupo" colspan="${nK(k)}">${NOME_K[k]}</th>`;
  h += '<th rowspan="2">Ficha</th><th rowspan="2"></th></tr><tr>';
  for (const k of comps()) {
    desc[k].forEach((d, i) => {
      h += `<th class="cod${i === 0 ? ' ini' : ''}"><button type="button" data-ck="${k}" data-ci="${i}" title="${esc(`${k} ${i + 1}: ${d}`)}">${i + 1}</button></th>`;
    });
  }
  h += '</tr></thead><tbody>';
  S.alunos.forEach((a, r) => {
    const av = avaliar(a);
    h += `<tr data-id="${a.id}" class="${a.id === S.sel ? 'sel' : ''}${av.incompleto ? ' falta' : ''}">`;
    h += `<td class="num fixa"><button type="button" data-linha="${r}" title="Opções deste aluno">${r + 1}</button></td>`;
    cols.forEach((c, ci) => {
      if (c.t === 'nome') h += `<td class="nome fixa"><input data-r="${r}" data-c="${ci}" data-campo="nome" value="${esc(a.nome)}" placeholder="Nome completo" autocomplete="off" spellcheck="false"></td>`;
      else if (c.t === 'rm') h += `<td class="rm"><input data-r="${r}" data-c="${ci}" data-campo="rm" value="${esc(a.rm)}" inputmode="numeric" autocomplete="off"></td>`;
      else if (c.t === 'turma') h += `<td class="tur"><input data-r="${r}" data-c="${ci}" data-campo="turma" value="${esc(a.turma)}" placeholder="${esc(S.lote.turma)}" maxlength="4" autocomplete="off"></td>`;
      else {
        const v = a[c.k][c.i];
        h += `<td class="c ${CLASSE[v] || 'vz'}${c.i === 0 ? ' ini' : ''}" tabindex="0" data-r="${r}" data-c="${ci}" aria-label="${c.k} ${c.i + 1}: ${NOME_SIM[v] || 'vazio'}"><span>${v}</span></td>`;
      }
    });
    h += `<td class="est">${tagDe(av)}</td><td class="del"><button type="button" data-del="${r}" title="Remover aluno" aria-label="Remover aluno ${r + 1}">×</button></td></tr>`;
  });
  t.innerHTML = h + '</tbody>';
  const l1 = t.tHead?.rows[0];
  if (l1) {
    for (const th of t.tHead.rows[1].cells) th.style.top = `${l1.offsetHeight}px`;
    const esq = `${l1.cells[0].offsetWidth}px`;            // coluna do nome fica fixa logo depois do número
    for (const c of t.querySelectorAll('.nome.fixa')) c.style.left = esq;
  }
}

function atualizarLinha(r) {
  const a = S.alunos[r];
  const tr = $('#grade').tBodies[0]?.rows[r];
  if (!a || !tr) return;
  const av = avaliar(a);
  tr.classList.toggle('falta', !!av.incompleto);
  tr.querySelector('td.est').innerHTML = tagDe(av);
}
const atualizarLinhas = () => S.alunos.forEach((_, r) => atualizarLinha(r));

function celula(r, c) { return $('#grade').querySelector(`[data-r="${r}"][data-c="${c}"]`); }
function focar(r, c) {
  const el = celula(r, c);
  if (!el) return false;
  el.focus();
  if (el.tagName === 'INPUT') el.select();
  return true;
}

function definir(r, ci, v) {
  const c = colunas()[ci];
  S.alunos[r][c.k][c.i] = v;
  const td = celula(r, ci);
  td.className = `c ${CLASSE[v] || 'vz'}${c.i === 0 ? ' ini' : ''}`;
  td.firstChild.textContent = v;
  td.setAttribute('aria-label', `${c.k} ${c.i + 1}: ${NOME_SIM[v] || 'vazio'}`);
  atualizarLinha(r);
  agendar();
}

function selecionar(id) {
  if (S.sel === id) return;
  S.sel = id;
  for (const tr of $('#grade').tBodies[0]?.rows || []) tr.classList.toggle('sel', tr.dataset.id === id);
  $('#previa-aluno').value = id || '';
  agendar();
}

// ---------- prévia ----------
let ultimaPrevia = '';
function fichaPrevia() {
  const a = S.alunos.find((x) => x.id === S.sel) || S.alunos.find((x) => x.nome.trim());
  if (!a) {
    return { f: normalizar({ ...exemplo(S.lote.ano, dados), escola: S.lote.escola || ESCOLA_PADRAO, MAT: comps().includes('MAT') ? exemplo(S.lote.ano, dados).MAT : [], LP: comps().includes('LP') ? exemplo(S.lote.ano, dados).LP : [] }, dados), aviso: 'Modelo com um aluno fictício. Quando houver alunos, a prévia mostra o aluno selecionado.' };
  }
  const av = avaliar(a);
  if (av.estado === 'ok') return { f: av.ficha };
  const rec = recDe(a);
  rec.nome = rec.nome.trim() || 'Nome do Estudante';
  rec.rm = /^\d+$/.test(rec.rm) ? rec.rm : '0000';
  rec.turma = rec.turma || '?';
  for (const k of ['LP', 'MAT']) if (rec[k].some((x) => !x)) rec[k] = [];
  return { f: normalizar(rec, dados), aviso: `Prévia incompleta: ${av.erros.join('; ')}.` };
}
function renderPrevia() {
  let res;
  try { res = fichaPrevia(); } catch (e) { res = null; $('#previa-aviso').textContent = e.message; $('#previa-aviso').hidden = false; return; }
  $('#previa-aviso').hidden = !res.aviso;
  $('#previa-aviso').textContent = res.aviso || '';
  const html = buildHtml(motor.fichaPages(res.f), { fontUrl, extraCss: CSS_PREVIA });
  if (html !== ultimaPrevia) { ultimaPrevia = html; $('#previa').srcdoc = html; }
  escalarPrevia();
}
function escalar(caixa, ifr) {
  const alto = PY * 2 + 16;
  const k = caixa.clientWidth / PX;
  ifr.style.width = `${PX}px`; ifr.style.height = `${alto}px`;
  ifr.style.transform = `scale(${k})`;
  caixa.style.height = `${alto * k}px`;
}
const escalarPrevia = () => escalar($('#previa-caixa'), $('#previa'));
function ampliarPrevia() {
  const d = $('#dlg-previa');
  $('#previa-grande').srcdoc = ultimaPrevia;
  d.showModal();
  escalar($('#previa-grande-caixa'), $('#previa-grande'));
}
function renderSeletor() {
  const sel = $('#previa-aluno');
  const op = S.alunos.filter((a) => a.nome.trim()).map((a) => `<option value="${a.id}">${esc(a.nome.trim())}</option>`);
  sel.innerHTML = op.length ? op.join('') : '<option value="">Aluno fictício</option>';
  sel.value = S.sel && S.alunos.some((a) => a.id === S.sel && a.nome.trim()) ? S.sel : sel.options[0].value;
}

// ---------- conferência ----------
function renderConferencia() {
  const lin = S.alunos.map((a, r) => ({ a, r, av: avaliar(a) })).filter((x) => x.av.estado !== 'vazia');
  const ok = lin.filter((x) => x.av.estado === 'ok');
  const esperado = { ambos: 'completo', LP: 'falta MAT', MAT: 'falta LP' }[S.lote.comp];
  const parciais = ok.filter((x) => x.av.ficha.situacao !== esperado);
  const pend = lin.filter((x) => x.av.estado !== 'ok');
  const rms = new Map();
  for (const x of lin) { const rm = x.a.rm.trim(); if (rm) rms.set(rm, [...(rms.get(rm) || []), x]); }
  const repetidos = [...rms.entries()].filter(([, v]) => v.length > 1);
  let h = '<div class="resumo">';
  if (!lin.length) h += '<span>Nenhum aluno na lista.</span>';
  else {
    h += `<span><strong>${ok.length}</strong> de ${lin.length} fichas prontas</span>`;
    if (parciais.length) h += `<span class="tag parcial">${parciais.length} parcia${parciais.length > 1 ? 'is' : 'l'}</span>`;
    if (pend.length) h += `<span class="tag erro">${pend.length} com pendência</span>`;
    if (!pend.length && !repetidos.length) h += '<span class="ok-tudo">Tudo certo.</span>';
  }
  h += '</div>';
  const itens = [];
  for (const x of pend) itens.push(`<li>Linha ${x.r + 1}${x.a.nome.trim() ? `, ${esc(x.a.nome.trim())}` : ''}: ${esc(x.av.erros.join('; '))} <button type="button" class="link" data-ir="${x.r}">ir</button></li>`);
  for (const [rm, v] of repetidos) itens.push(`<li>RM ${esc(rm)} repetido nas linhas ${v.map((x) => x.r + 1).join(', ')}</li>`);
  if (parciais.length && S.lote.comp === 'ambos') itens.push(`<li style="color:var(--suave)">Parciais (saem com o componente que falta em branco, como no relatório oficial): ${parciais.map((x) => esc(x.a.nome.trim())).join(', ')}</li>`);
  if (itens.length) h += `<ul>${itens.join('')}</ul>`;
  $('#conferencia').innerHTML = h;
  $('#bt-pdf').disabled = !ok.length;
  $('#bt-pdf').textContent = ok.length ? `Gerar PDF de todos (${ok.length} ficha${ok.length > 1 ? 's' : ''})` : 'Gerar PDF de todos';
  const sel = S.alunos.find((a) => a.id === S.sel);
  $('#bt-pdf-um').disabled = !(sel && avaliar(sel).estado === 'ok');
}

// ---------- atualização agendada ----------
let timer = 0;
function agendar() {
  clearTimeout(timer);
  timer = setTimeout(() => { salvar(); renderSeletor(); renderConferencia(); renderPrevia(); }, 120);
}
function renderTudo() {
  renderLote(); renderGrade(); renderConteudos(); renderSeletor(); renderConferencia(); renderPrevia(); salvar();
}

// ---------- lote ----------
function renderLote() {
  $('#ano').value = S.lote.ano;
  $('#turma').value = S.lote.turma;
  $('#escola').value = S.lote.escola;
  $('#turmaPorAluno').checked = S.lote.turmaPorAluno;
  for (const r of document.querySelectorAll('input[name=comp]')) r.checked = r.value === S.lote.comp;
}
function renderConteudos() {
  const desc = dados[S.lote.ano].descritores;
  $('#lista-conteudos').innerHTML = comps().map((k) => `<div><h4>${NOME_K[k]} (${desc[k].length})</h4><ol>${desc[k].map((d) => `<li>${esc(d)}</li>`).join('')}</ol></div>`).join('');
}
async function trocarAno(novo) {
  const marcados = S.alunos.some((a) => a.LP.some(Boolean) || a.MAT.some(Boolean));
  if (marcados) {
    const r = await escolher(`Trocar para ${novo}?`, 'Os conteúdos são outros, então os resultados marcados serão apagados. Nomes e RMs ficam.', [['trocar', 'Trocar e apagar resultados', true], ['cancelar', 'Cancelar']]);
    if (r !== 'trocar') { $('#ano').value = S.lote.ano; return; }
    for (const a of S.alunos) { a.LP = []; a.MAT = []; }
  }
  S.lote.ano = novo;
  ajustarTamanhos();
  renderTudo();
}

// ---------- menus ----------
let fecharMenu = null;
function abrirMenu(ancora, html, aoClicar) {
  fecharMenu?.();
  const m = $('#menu');
  m.innerHTML = html;
  m.hidden = false;
  const r = ancora.getBoundingClientRect();
  const w = m.offsetWidth, hgt = m.offsetHeight;
  m.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  m.style.top = `${r.bottom + 6 + hgt > innerHeight ? Math.max(8, r.top - hgt - 6) : r.bottom + 6}px`;
  const clique = (e) => { const b = e.target.closest('button'); if (b) { aoClicar(b, m); fecha(); } };
  const fora = (e) => { if (!m.contains(e.target) && e.target !== ancora) fecha(); };
  const tecla = (e) => { if (e.key === 'Escape') { fecha(); ancora.focus(); } };
  function fecha() {
    m.hidden = true; m.removeEventListener('click', clique);
    document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla);
    fecharMenu = null;
  }
  m.addEventListener('click', clique);
  setTimeout(() => { document.addEventListener('mousedown', fora); document.addEventListener('keydown', tecla); });
  fecharMenu = fecha;
  m.querySelector('button')?.focus();
}
const botoesSim = (k) => `<button type="button" class="sb ok" data-k="${k}" data-v="✓" title="Você domina">✓</button><button type="button" class="sb quase" data-k="${k}" data-v="~" title="Quase lá">~</button><button type="button" class="sb comece" data-k="${k}" data-v="!" title="Comece por aqui">!</button><button type="button" data-k="${k}" data-v="">limpar</button>`;

function menuColuna(bt) {
  const k = bt.dataset.ck, i = Number(bt.dataset.ci);
  const html = `<h4>${NOME_K[k]} ${i + 1}: ${esc(dados[S.lote.ano].descritores[k][i])}</h4><div class="linha"><b>Todos</b>${botoesSim(k)}</div><label><input type="checkbox" id="m-vazias"> só nas células vazias</label>`;
  abrirMenu(bt, html, (b, m) => {
    if (b.dataset.v === undefined) return;
    const soVazias = m.querySelector('#m-vazias').checked;
    for (const a of S.alunos) if (temDados(a) && (!soVazias || !a[k][i])) a[k][i] = b.dataset.v;
    renderGrade(); agendar();
  });
}
function menuLinha(bt) {
  const r = Number(bt.dataset.linha), a = S.alunos[r];
  selecionar(a.id);
  let html = `<h4>${esc(a.nome.trim() || `Linha ${r + 1}`)}</h4>`;
  for (const k of comps()) html += `<div class="linha"><b>${k}</b>${botoesSim(k)}</div>`;
  html += '<label><input type="checkbox" id="m-vazias"> só nas células vazias</label><hr><div class="linha"><button type="button" data-acao="dup">Duplicar linha</button><button type="button" data-acao="del" class="perigo">Remover aluno</button></div>';
  abrirMenu(bt, html, (b, m) => {
    if (b.dataset.acao === 'del') return remover(r);
    if (b.dataset.acao === 'dup') { S.alunos.splice(r + 1, 0, novoAluno({ turma: a.turma, LP: [...a.LP], MAT: [...a.MAT] })); renderGrade(); agendar(); focar(r + 1, 0); return; }
    const soVazias = m.querySelector('#m-vazias').checked;
    const k = b.dataset.k;
    a[k] = a[k].map((x) => (soVazias && x ? x : b.dataset.v));
    renderGrade(); agendar();
  });
}

// ---------- ações ----------
function remover(r) {
  const [a] = S.alunos.splice(r, 1);
  if (S.sel === a.id) S.sel = null;
  renderGrade(); agendar();
  if (temDados(a)) aviso(`Aluno removido${a.nome.trim() ? `: ${a.nome.trim()}` : ''}.`, ['Desfazer', () => { S.alunos.splice(r, 0, a); renderGrade(); agendar(); }]);
}
function adicionar() {
  S.alunos.push(novoAluno());
  renderGrade(); agendar();
  focar(S.alunos.length - 1, 0);
}

function lerLinhaNome(l) {
  l = l.replace(/^\s*\d+\s*[.)\-–]\s+/, '').trim();
  if (!l || /^nome\b/i.test(l)) return null;
  let partes = l.includes('\t') ? l.split('\t') : l.includes(';') ? l.split(';') : null;
  if (!partes) {
    const m = l.match(/^(\d+)\s+(.+)$/) || l.match(/^(.+?)\s+(\d+)$/);
    partes = m ? [m[1], m[2]] : [l];
  }
  let rm = '', turma = '';
  const nomes = [];
  for (const p of partes.map((x) => x.trim()).filter(Boolean)) {
    if (/^\d+(\.0)?$/.test(p) && !rm) rm = p.replace(/\.0$/, '');
    else if (/^[A-Za-z]$/.test(p) && !turma) turma = p.toUpperCase();
    else nomes.push(p);
  }
  const nome = nomes.sort((a, b) => b.length - a.length)[0];
  return nome ? { nome: nome.replace(/\s+/g, ' '), rm, turma } : null;
}
function colarNomes(txt) {
  const novos = txt.split(/\r?\n/).map(lerLinhaNome).filter(Boolean);
  if (!novos.length) return;
  S.alunos = S.alunos.filter(temDados);
  for (const n of novos) S.alunos.push(novoAluno(n));
  if (novos.some((n) => n.turma && n.turma !== S.lote.turma)) S.lote.turmaPorAluno = true;
  renderTudo();
  aviso(`${novos.length} aluno${novos.length > 1 ? 's' : ''} adicionado${novos.length > 1 ? 's' : ''}.`);
}

// colar um bloco (do Excel) a partir da célula r, c
function colarBloco(r0, c0, txt) {
  const linhas = txt.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((l) => l.split('\t'));
  const cols = colunas();
  let invalidos = 0;
  linhas.forEach((cel, di) => {
    const r = r0 + di;
    while (r >= S.alunos.length) S.alunos.push(novoAluno());
    const a = S.alunos[r];
    cel.forEach((v, dj) => {
      const c = cols[c0 + dj];
      if (!c) return;
      v = v.trim();
      if (c.t === 's') { try { a[c.k][c.i] = sit(v) || ''; } catch { invalidos++; } }
      else if (c.t === 'nome') a.nome = v.replace(/\s+/g, ' ');
      else if (c.t === 'rm') a.rm = v.replace(/\.0$/, '');
      else a.turma = v.toUpperCase();
    });
  });
  renderGrade(); agendar();
  focar(r0, c0);
  aviso(invalidos ? `Colado. ${invalidos} valor${invalidos > 1 ? 'es' : ''} não reconhecido${invalidos > 1 ? 's' : ''} (use ✓, ~, ! ou acertos/total).` : `Colado em ${linhas.length} linha${linhas.length > 1 ? 's' : ''}.`, null, !!invalidos);
}

function exemploAlunos() {
  const n = { LP: nK('LP'), MAT: nK('MAT') };
  const sorteio = (k, pesos) => Array.from({ length: n[k] }, () => { const x = Math.random() * 10; return x < pesos[0] ? '✓' : x < pesos[0] + pesos[1] ? '~' : '!'; });
  S.alunos = [
    novoAluno({ nome: 'Ana Beatriz Exemplo', rm: '1001', LP: sorteio('LP', [6, 3]), MAT: sorteio('MAT', [4, 4]) }),
    novoAluno({ nome: 'Bruno Henrique Exemplo', rm: '1002', LP: sorteio('LP', [3, 4]), MAT: sorteio('MAT', [2, 4]) }),
    novoAluno({ nome: 'Carla Exemplo Parcial', rm: '1003', LP: sorteio('LP', [5, 3]) }),
  ];
  ajustarTamanhos();
  S.sel = S.alunos[0].id;
  renderTudo();
}

async function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const slug = (s) => s.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
const rotulo = () => `${S.lote.ano.replace('º ', '')}_${slug(S.lote.turma || 'turma')}`;

async function baixarPlanilha() {
  try {
    aviso('Montando a planilha...');
    const alunos = S.alunos.filter(temDados).map((a) => ({ ...a, turma: S.lote.turmaPorAluno ? a.turma : '' }));
    baixar(await gerarPlanilha({ lote: S.lote, alunos, dados }), `fichas_${rotulo()}.xlsx`);
    aviso('Planilha baixada. Preencha e use Carregar planilha.');
  } catch (e) { aviso(e.message, null, true); }
}

async function carregarPlanilha(arq) {
  let res;
  try { res = await lerPlanilha(arq, dados); } catch (e) { return aviso(e.message, null, true); }
  if (!res.alunos.length) return aviso('Não encontrei alunos na planilha.', null, true);
  const ano = res.lote.ano || S.lote.ano;
  const atuais = S.alunos.filter(temDados).length;
  let modo = 'substituir';
  if (atuais) {
    const outroAno = ano !== S.lote.ano;
    modo = await escolher('Carregar planilha',
      outroAno ? `A planilha é do ${ano} e a lista atual é do ${S.lote.ano}. A lista atual (${atuais} alunos) será substituída.`
        : `A lista já tem ${atuais} aluno${atuais > 1 ? 's' : ''}. O que fazer com os ${res.alunos.length} da planilha?`,
      outroAno ? [['substituir', 'Substituir', true], ['cancelar', 'Cancelar']]
        : [['substituir', 'Substituir a lista', true], ['adicionar', 'Adicionar à lista'], ['cancelar', 'Cancelar']]);
    if (!modo || modo === 'cancelar') return;
  }
  S.lote.ano = ano;
  if (res.lote.comp) S.lote.comp = res.lote.comp;
  if (res.lote.escola) S.lote.escola = res.lote.escola;
  const turmas = new Set(res.alunos.map((a) => a.turma).filter(Boolean));
  if (res.lote.turma) S.lote.turma = res.lote.turma;
  else if (turmas.size === 1 && modo === 'substituir') S.lote.turma = [...turmas][0];
  const novos = res.alunos.map((a) => novoAluno({ ...a, turma: a.turma && a.turma !== S.lote.turma ? a.turma : '' }));
  if (novos.some((a) => a.turma)) S.lote.turmaPorAluno = true;
  S.alunos = modo === 'adicionar' ? [...S.alunos.filter(temDados), ...novos] : novos;
  S.sel = S.alunos[0]?.id ?? null;
  ajustarTamanhos();
  renderTudo();
  const extra = res.avisos.length ? ` ${res.avisos.length} valor${res.avisos.length > 1 ? 'es' : ''} não reconhecido${res.avisos.length > 1 ? 's' : ''} ficaram em branco (ex.: ${res.avisos[0]}).` : '';
  aviso(`${novos.length} aluno${novos.length > 1 ? 's' : ''} carregado${novos.length > 1 ? 's' : ''}.${extra}`, null, !!extra);
}

// ---------- PDF (impressão do navegador) ----------
async function imprimir(fichas, titulo) {
  aviso('Preparando o PDF...');
  const html = buildHtml(fichas.flatMap((f) => motor.fichaPages(f)), { fontUrl, extraCss: CSS_IMPRESSAO, titulo });
  const ifr = document.createElement('iframe');
  ifr.setAttribute('aria-hidden', 'true');
  ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:10px;height:10px;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(ifr);
  await new Promise((ok) => { ifr.onload = ok; ifr.srcdoc = html; });
  const doc = ifr.contentDocument;
  await Promise.all(['800 12px Bric', '400 12px Intr', '700 12px Intr', '500 12px Plex', '600 12px PlexSB'].map((f) => doc.fonts.load(f)));
  await doc.fonts.ready;
  const antigo = document.title;
  document.title = titulo;
  let feito = false;
  const fim = () => { if (feito) return; feito = true; document.title = antigo; setTimeout(() => ifr.remove(), 1500); };
  ifr.contentWindow.addEventListener('afterprint', fim);
  $('#toast').hidden = true;
  ifr.contentWindow.focus();
  ifr.contentWindow.print();
  setTimeout(fim, 60000);
}
async function pdfTodos() {
  const av = S.alunos.map(avaliar);
  const ok = ordenar(av.filter((x) => x.estado === 'ok').map((x) => x.ficha));
  const fora = av.filter((x) => x.estado === 'erro' || x.estado === 'nada').length;
  if (fora) {
    const r = await escolher('Alunos com pendência', `${fora} aluno${fora > 1 ? 's' : ''} com pendência fica${fora > 1 ? 'm' : ''} fora do PDF. Veja a lista em Conferir e gerar.`, [['gerar', `Gerar as ${ok.length} prontas`, true], ['cancelar', 'Voltar e corrigir']]);
    if (r !== 'gerar') return;
  }
  imprimir(ok, `Fichas_${rotulo()}`);
}
function pdfUm() {
  const a = S.alunos.find((x) => x.id === S.sel);
  const av = a && avaliar(a);
  if (!av || av.estado !== 'ok') return aviso('Selecione na grade um aluno com a ficha pronta.', null, true);
  imprimir([av.ficha], `Ficha_${rotulo()}_${slug(av.ficha.nome)}`);
}

// ---------- projeto ----------
function salvarProjeto() {
  const j = JSON.stringify({ app: 'fichas-avaliasesi', versao: 1, lote: S.lote, alunos: S.alunos.filter(temDados) }, null, 1);
  baixar(new Blob([j], { type: 'application/json' }), `projeto_fichas_${rotulo()}.json`);
}
async function abrirProjeto(arq) {
  try {
    const j = JSON.parse(await arq.text());
    if (!j || !j.lote || !Array.isArray(j.alunos)) throw new Error();
    sanear(j);
    renderTudo();
    aviso(`Projeto aberto: ${S.alunos.length} alunos.`);
  } catch { aviso('Arquivo de projeto inválido.', null, true); }
}

// ---------- avisos e diálogos ----------
let tAviso = 0;
function aviso(txt, acao = null, erro = false) {
  const t = $('#toast');
  t.className = `aviso-flutuante${erro ? ' erro' : ''}`;
  t.textContent = txt;
  if (acao) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: acao[0], className: 'link' });
    b.style.cssText = 'color:#9fe0c1;margin-left:12px';
    b.onclick = () => { t.hidden = true; acao[1](); };
    t.appendChild(b);
  }
  t.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => { t.hidden = true; }, erro || acao ? 8000 : 3500);
}
function escolher(titulo, texto, botoes) {
  const d = $('#dlg-escolha');
  $('#esc-titulo').textContent = titulo;
  $('#esc-texto').textContent = texto;
  $('#esc-botoes').innerHTML = [...botoes].reverse().map(([v, t, p]) => `<button value="${v}"${p ? ' class="principal"' : ''}>${esc(t)}</button>`).join('');
  d.returnValue = '';
  d.showModal();
  return new Promise((ok) => d.addEventListener('close', () => ok(d.returnValue), { once: true }));
}

// ---------- eventos ----------
function ligar() {
  $('#ano').innerHTML = ORDEM_ANO.filter((a) => dados[a]).map((a) => `<option>${a}</option>`).join('');
  $('#ano').addEventListener('change', (e) => trocarAno(e.target.value));
  $('#turma').addEventListener('input', (e) => { S.lote.turma = e.target.value.toUpperCase().trim(); atualizarLinhas(); agendar(); });
  $('#escola').addEventListener('input', (e) => { S.lote.escola = e.target.value; agendar(); });
  $('#turmaPorAluno').addEventListener('change', (e) => { S.lote.turmaPorAluno = e.target.checked; renderGrade(); agendar(); });
  for (const r of document.querySelectorAll('input[name=comp]')) r.addEventListener('change', (e) => { S.lote.comp = e.target.value; renderGrade(); renderConteudos(); agendar(); });

  $('#bt-add').onclick = adicionar;
  $('#bt-exemplo').onclick = exemploAlunos;
  $('#bt-colar').onclick = () => { $('#txt-colar').value = ''; $('#dlg-colar').showModal(); };
  $('#dlg-colar').addEventListener('close', () => { if ($('#dlg-colar').returnValue === 'ok') colarNomes($('#txt-colar').value); });
  $('#bt-modelo').onclick = baixarPlanilha;
  $('#bt-carregar').onclick = () => $('#arq-planilha').click();
  $('#arq-planilha').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) carregarPlanilha(f); };
  $('#bt-pdf').onclick = pdfTodos;
  $('#bt-pdf-um').onclick = pdfUm;
  $('#bt-salvar').onclick = salvarProjeto;
  $('#bt-abrir').onclick = () => $('#arq-projeto').click();
  $('#arq-projeto').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) abrirProjeto(f); };
  $('#bt-limpar').onclick = async () => {
    if (!S.alunos.some(temDados)) return;
    const r = await escolher('Começar do zero?', 'A lista de alunos e os resultados serão apagados deste navegador. Se quiser guardar, use antes Salvar projeto.', [['apagar', 'Apagar lista', true], ['cancelar', 'Cancelar']]);
    if (r === 'apagar') { S.alunos = []; S.sel = null; renderTudo(); }
  };
  $('#previa-aluno').onchange = (e) => {
    selecionar(e.target.value || null);
    $('#grade').querySelector(`tr[data-id="${e.target.value}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  $('#conferencia').addEventListener('click', (e) => { const b = e.target.closest('[data-ir]'); if (b) focar(Number(b.dataset.ir), 0); });

  const g = $('#grade');
  g.addEventListener('click', (e) => {
    const td = e.target.closest('td.c');
    if (td) { const r = +td.dataset.r, c = +td.dataset.c; const v = S.alunos[r][colunas()[c].k][colunas()[c].i]; definir(r, c, CICLO[(CICLO.indexOf(v) + 1) % 4]); td.focus(); return; }
    const bc = e.target.closest('th.cod button'); if (bc) return menuColuna(bc);
    const bl = e.target.closest('td.num button'); if (bl) return menuLinha(bl);
    const bd = e.target.closest('[data-del]'); if (bd) return remover(+bd.dataset.del);
  });
  g.addEventListener('focusin', (e) => { const tr = e.target.closest('tbody tr'); if (tr) selecionar(tr.dataset.id); });
  g.addEventListener('input', (e) => {
    const i = e.target; if (!i.dataset.campo) return;
    const r = +i.dataset.r;
    S.alunos[r][i.dataset.campo] = i.dataset.campo === 'turma' ? i.value.toUpperCase() : i.value;
    atualizarLinha(r); agendar();
  });
  g.addEventListener('keydown', (e) => {
    const el = e.target.closest('[data-r][data-c]'); if (!el) return;
    const r = +el.dataset.r, c = +el.dataset.c, nc = colunas().length;
    const ir = (rr, cc) => { if (focar(rr, cc)) e.preventDefault(); };
    if (el.tagName === 'INPUT') {
      if (e.key === 'Enter') { e.preventDefault(); if (!focar(r + 1, c) && S.alunos[r].nome.trim()) { adicionar(); focar(r + 1, c); } }
      else if (e.key === 'ArrowDown') ir(r + 1, c);
      else if (e.key === 'ArrowUp') ir(r - 1, c);
      else if (e.key === 'ArrowRight' && el.selectionStart === el.value.length && el.selectionEnd === el.value.length) ir(r, c + 1);
      else if (e.key === 'ArrowLeft' && el.selectionStart === 0 && el.selectionEnd === 0) ir(r, c - 1);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (TECLA[k]) { e.preventDefault(); definir(r, c, TECLA[k]); if (!focar(r, c + 1)) { const p = colunas().findIndex((x) => x.t === 's'); focar(r + 1, p); } }
    else if (['Backspace', 'Delete', '0'].includes(k)) { e.preventDefault(); definir(r, c, ''); }
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); el.click(); }
    else if (k === 'ArrowRight') ir(r, Math.min(c + 1, nc - 1));
    else if (k === 'ArrowLeft') ir(r, c - 1);
    else if (k === 'ArrowDown') ir(r + 1, c);
    else if (k === 'ArrowUp') ir(r - 1, c);
  });
  g.addEventListener('paste', (e) => {
    const el = e.target.closest('[data-r][data-c]'); if (!el) return;
    const txt = e.clipboardData.getData('text/plain');
    if (el.tagName === 'INPUT' && !/[\t\n]/.test(txt.trim())) return;
    e.preventDefault();
    colarBloco(+el.dataset.r, +el.dataset.c, txt);
  });
  $('#bt-ampliar').onclick = ampliarPrevia;
  $('#previa-caixa').addEventListener('click', ampliarPrevia);
  new ResizeObserver(escalarPrevia).observe($('#previa-caixa'));
  new ResizeObserver(() => escalar($('#previa-grande-caixa'), $('#previa-grande'))).observe($('#previa-grande-caixa'));
}

async function iniciar() {
  try {
    const [d, t, o] = await Promise.all(['dados_por_ano', 'templates', 'baseline_offsets'].map(async (n) => {
      const r = await fetch(`ferramenta/data/${n}.json`);
      if (!r.ok) throw new Error(`não carreguei ${n}.json (${r.status})`);
      return r.json();
    }));
    dados = d;
    motor = criarMotor({ templates: t, offsets: o });
  } catch (e) {
    document.querySelector('main').innerHTML = `<section class="cartao"><h2>Não consegui abrir a ferramenta</h2><p class="dica">${esc(e.message)}. Se abriu o arquivo direto do computador, use o endereço do site (GitHub Pages).</p></section>`;
    return;
  }
  if (!carregar()) S = estadoInicial();
  ligar();
  renderTudo();
}
iniciar();
