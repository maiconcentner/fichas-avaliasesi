// Planilhas: modelo para baixar (já com os conteúdos do ano) e leitura do que o professor sobe.
// Usa ExcelJS (vendor/exceljs.min.js), carregado só quando precisa.
import { sit, normAno } from './motor.js';

export async function carregarExcelJS() {
  if (window.ExcelJS) return window.ExcelJS;
  await new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = 'vendor/exceljs.min.js';
    s.onload = ok;
    s.onerror = () => erro(new Error('não consegui carregar a biblioteca de planilhas'));
    document.head.appendChild(s);
  });
  return window.ExcelJS;
}

const NOME_COMP = { ambos: 'LP e MAT', LP: 'Só LP', MAT: 'Só MAT' };
const COR = { titulo: 'FF17303A', ok: 'FFC8E6D8', quase: 'FFF6DFB0', comece: 'FFF3C6BF', vazio: 'FFFFF7D1', lp: 'FFE3EEF2', mat: 'FFF1E9DA' };
const preench = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb }, bgColor: { argb } });
const colLetra = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

// lote: {ano, turma, comp, escola}; alunos: [{nome, rm, turma, LP:[], MAT:[]}]; dados: dados_por_ano.json
export async function gerarPlanilha({ lote, alunos, dados }) {
  const ExcelJS = await carregarExcelJS();
  const desc = dados[lote.ano].descritores;
  const comps = lote.comp === 'ambos' ? ['LP', 'MAT'] : [lote.comp];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Fichas AvaliaSESI';

  // ---- aba Alunos: uma linha por aluno, uma coluna por conteúdo
  const ws = wb.addWorksheet('Alunos', { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] });
  const cab = ['Nome', 'RM', 'Turma'];
  for (const k of comps) desc[k].forEach((_, i) => cab.push(`${k}${i + 1}`));
  ws.addRow(cab);
  ws.getColumn(1).width = 38; ws.getColumn(2).width = 10; ws.getColumn(3).width = 8;
  const linha1 = ws.getRow(1);
  linha1.height = 22;
  linha1.eachCell((c, i) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = preench(COR.titulo);
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    if (i > 3) {
      const [, k, num] = cab[i - 1].match(/^(LP|MAT)(\d+)$/);
      c.note = `${k === 'LP' ? 'Língua Portuguesa' : 'Matemática'} ${num}: ${desc[k][num - 1]}`;
      ws.getColumn(i).width = 6.5;
    }
  });
  linha1.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  for (const a of alunos) {
    const r = [a.nome, /^\d+$/.test(a.rm) ? Number(a.rm) : a.rm, a.turma || lote.turma];
    for (const k of comps) desc[k].forEach((_, i) => r.push(a[k]?.[i] || null));
    ws.addRow(r);
  }
  const ultima = Math.max(41, alunos.length + 11);
  const c1 = colLetra(4), cN = colLetra(cab.length);
  for (let r = 2; r <= ultima; r++) {
    for (let c = 4; c <= cab.length; c++) {
      const cel = ws.getCell(r, c);
      cel.alignment = { horizontal: 'center' };
      cel.dataValidation = {
        type: 'list', allowBlank: true, formulae: ['"✓,~,!"'], showErrorMessage: true, errorStyle: 'warning',
        errorTitle: 'Situação', error: 'Use ✓ (domina), ~ (quase lá) ou !  (comece por aqui). Também vale acertos/total, como 2/3.',
      };
    }
  }
  const ref = `${c1}2:${cN}${ultima}`;
  const regra = (txt, cor) => ({ type: 'cellIs', operator: 'equal', formulae: [`"${txt}"`], style: { fill: preench(cor) } });
  ws.addConditionalFormatting({ ref, rules: [regra('✓', COR.ok), regra('~', COR.quase), regra('!', COR.comece)] });

  // ---- aba Lote: o que vale para todos
  const wl = wb.addWorksheet('Lote');
  wl.columns = [{ width: 18 }, { width: 30 }, { width: 70 }];
  wl.addRow(['Campo', 'Valor', 'Observação']).eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = preench(COR.titulo); });
  wl.addRow(['Ano', lote.ano, 'Os conteúdos desta planilha são deste ano. Para outro ano, baixe outro modelo na página.']);
  wl.addRow(['Componentes', NOME_COMP[lote.comp], 'LP e MAT, Só LP ou Só MAT']);
  wl.addRow(['Turma padrão', lote.turma, 'Usada quando a coluna Turma da aba Alunos estiver vazia']);
  wl.addRow(['Escola', lote.escola]);

  // ---- aba Conteúdos
  const wc = wb.addWorksheet('Conteúdos');
  wc.columns = [{ width: 10 }, { width: 110 }];
  wc.addRow(['Coluna', 'Conteúdo']).eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = preench(COR.titulo); });
  for (const k of comps) desc[k].forEach((d, i) => { const r = wc.addRow([`${k}${i + 1}`, d]); r.getCell(1).fill = preench(k === 'LP' ? COR.lp : COR.mat); });

  // ---- aba Instruções
  const wi = wb.addWorksheet('Instruções');
  wi.getColumn(1).width = 120;
  [
    'Como preencher',
    '1) Na aba Alunos, uma linha por aluno: nome completo, RM (só números) e turma.',
    '2) Em cada coluna de conteúdo (LP1, LP2... MAT1...), escolha na lista: ✓ Você domina, ~ Quase lá, ! Comece por aqui.',
    '   Regra: acertou todas as questões do conteúdo = ✓; acertou parte = ~; nenhuma = !.',
    '   Também aceita acertos/total (ex.: 2/3) ou as letras v (domina), q (quase lá) e c (comece).',
    '3) Passe o mouse no título da coluna para ver o conteúdo, ou veja a aba Conteúdos.',
    '4) Se o aluno não tem resultado de um componente, deixe as colunas dele vazias: a ficha sai parcial.',
    '5) Salve e carregue o arquivo na página (botão Carregar planilha).',
  ].forEach((t, i) => { const r = wi.addRow([t]); if (i === 0) r.font = { bold: true, size: 13 }; });

  wb.views = [{ activeTab: 0 }];
  return new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const textoCel = (c) => {
  if (!c || c.value === null || c.value === undefined) return '';
  try { return String(c.text ?? '').trim(); } catch { return String(c.value).trim(); }
};

// Lê a planilha do site (aba Alunos) ou a do Python (aba Respostas, uma linha por conteúdo).
// Devolve {lote:{ano?, comp?, escola?, turma?}, alunos:[{nome, rm, turma, LP, MAT}], avisos:[]}
export async function lerPlanilha(arquivo, dados) {
  const ExcelJS = await carregarExcelJS();
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(await arquivo.arrayBuffer()); } catch { throw new Error('Não consegui abrir o arquivo. Ele precisa ser .xlsx (Excel).'); }
  const avisos = [];
  const lote = {};

  const wl = wb.getWorksheet('Lote');
  if (wl) {
    wl.eachRow((r) => {
      const k = textoCel(r.getCell(1)).toLowerCase(), v = textoCel(r.getCell(2));
      if (!v) return;
      if (k === 'ano') { try { lote.ano = normAno(v); } catch (e) { avisos.push(`Aba Lote: ${e.message}`); } }
      if (k === 'componentes') lote.comp = /s[óo]\s*lp/i.test(v) ? 'LP' : /s[óo]\s*mat/i.test(v) ? 'MAT' : 'ambos';
      if (k === 'escola') lote.escola = v;
      if (k.startsWith('turma')) lote.turma = v.toUpperCase();
    });
  }

  const conv = (v, onde) => {
    try { return sit(v) || ''; } catch (e) { avisos.push(`${onde}: ${e.message}`); return ''; }
  };

  const wa = wb.getWorksheet('Alunos');
  if (wa) {
    const cab = [];
    wa.getRow(1).eachCell({ includeEmpty: true }, (c, i) => { cab[i] = textoCel(c); });
    const ix = (nome) => cab.findIndex((h) => h && h.toLowerCase() === nome);
    const iNome = ix('nome'), iRm = ix('rm'), iTurma = ix('turma');
    if (iNome < 0) throw new Error('A aba Alunos precisa da coluna Nome.');
    const colsSit = [];
    cab.forEach((h, i) => { const m = h && h.replace(/\s+/g, '').match(/^(LP|MAT)(\d+)$/i); if (m) colsSit.push({ i, k: m[1].toUpperCase(), n: Number(m[2]) }); });
    const qtd = { LP: 0, MAT: 0 };
    colsSit.forEach((c) => { qtd[c.k] = Math.max(qtd[c.k], c.n); });
    if (lote.ano) {
      for (const k of ['LP', 'MAT']) {
        if (qtd[k] && qtd[k] !== dados[lote.ano].descritores[k].length) {
          throw new Error(`A planilha tem ${qtd[k]} colunas de ${k}, mas o ${lote.ano} tem ${dados[lote.ano].descritores[k].length} conteúdos. Baixe o modelo do ano certo.`);
        }
      }
    }
    if (!lote.comp) lote.comp = qtd.LP && qtd.MAT ? 'ambos' : qtd.LP ? 'LP' : qtd.MAT ? 'MAT' : 'ambos';
    const alunos = [];
    wa.eachRow((r, num) => {
      if (num === 1) return;
      const nome = textoCel(r.getCell(iNome)).replace(/\s+/g, ' ');
      if (!nome) return;
      const a = { nome, rm: iRm > 0 ? textoCel(r.getCell(iRm)).replace(/\.0$/, '') : '', turma: iTurma > 0 ? textoCel(r.getCell(iTurma)).toUpperCase() : '', LP: Array(qtd.LP).fill(''), MAT: Array(qtd.MAT).fill('') };
      for (const c of colsSit) a[c.k][c.n - 1] = conv(textoCel(r.getCell(c.i)), `${nome}, ${c.k}${c.n}`);
      alunos.push(a);
    });
    return { lote, alunos, avisos };
  }

  // formato do Python: uma linha por conteúdo
  const wr = wb.getWorksheet('Respostas') || wb.worksheets[0];
  const cab = {};
  wr.getRow(1).eachCell((c, i) => { cab[textoCel(c).toLowerCase()] = i; });
  const falta = ['nome', 'ano', 'turma', 'rm', 'componente', 'situação'].filter((h) => !cab[h]);
  if (falta.length) throw new Error(`Não reconheci a planilha. Use o modelo baixado na página (colunas que faltam: ${falta.join(', ')}).`);
  const grupos = new Map();
  const anos = new Set();
  wr.eachRow((r, num) => {
    if (num === 1) return;
    const nome = textoCel(r.getCell(cab.nome));
    if (!nome) return;
    const rm = textoCel(r.getCell(cab.rm)).replace(/\.0$/, '');
    const chave = `${rm}|${nome}`;
    if (!grupos.has(chave)) {
      let ano = '';
      try { ano = normAno(textoCel(r.getCell(cab.ano))); anos.add(ano); } catch (e) { avisos.push(`${nome}: ${e.message}`); }
      grupos.set(chave, { nome: nome.replace(/\s+/g, ' '), rm, turma: textoCel(r.getCell(cab.turma)).toUpperCase(), LP: [], MAT: [] });
    }
    const comp = textoCel(r.getCell(cab.componente)).toUpperCase().startsWith('L') ? 'LP' : 'MAT';
    grupos.get(chave)[comp].push(conv(textoCel(r.getCell(cab['situação'])), `${nome}, ${comp}`));
  });
  if (anos.size > 1) throw new Error(`A planilha mistura anos (${[...anos].join(', ')}). Separe um arquivo por ano.`);
  lote.ano = [...anos][0];
  const alunos = [...grupos.values()];
  const tem = (k) => alunos.some((a) => a[k].some(Boolean));
  lote.comp = tem('LP') && tem('MAT') ? 'ambos' : tem('LP') ? 'LP' : tem('MAT') ? 'MAT' : 'ambos';
  return { lote, alunos, avisos };
}
