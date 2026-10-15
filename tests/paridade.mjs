// Compara o HTML do motor JavaScript (js/motor.js) com o do Python (gerado por tests/paridade.py).
// Uso: node tests/paridade.mjs CASOS.json
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarMotor, buildHtml, normalizar } from '../js/motor.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(readFileSync(join(raiz, p), 'utf8'));
const dados = ler('ferramenta/data/dados_por_ano.json');
const motor = criarMotor({ templates: ler('ferramenta/data/templates.json'), offsets: ler('ferramenta/data/baseline_offsets.json') });
const casos = JSON.parse(readFileSync(process.argv[2], 'utf8'));

let falhas = 0;
for (const [i, { rec, html }] of casos.entries()) {
  const f = normalizar(rec, dados);
  const js = buildHtml(motor.fichaPages(f), { fontUrl: (a) => `file://FONTS/${a}` });
  if (js !== html) {
    falhas++;
    if (falhas <= 3) {
      let p = 0; while (p < js.length && js[p] === html[p]) p++;
      console.log(`caso ${i} (${f.ano}, ${f.nome}) difere na posição ${p}:\n  py: ${html.slice(p - 60, p + 80)}\n  js: ${js.slice(p - 60, p + 80)}`);
    }
  }
}
console.log(`${casos.length - falhas}/${casos.length} casos idênticos`);
process.exit(falhas ? 1 : 0);
