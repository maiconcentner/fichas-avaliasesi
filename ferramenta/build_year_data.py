"""Extrai por ano: descritores, dicas (por componente), rotina e dicas genericas (quando nao ha dados)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pdfplumber, extract_year as E
_w = E.words
E.words = lambda pg, x0=0, x1=9999: [w for w in _w(pg, x0, x1) if not (410 <= w['x0'] <= 432 and w['text'] in ('DOBRE', 'AQUI'))]
TOOL = os.path.dirname(os.path.abspath(__file__))
OFF = '/mnt/user-data/uploads/Plano_de_estudos/CE_026_Jau'
J = lambda b: [' '.join(x) for x in b]
def tips_of(pg, left):
    ph = E.page2_half(pg, left)
    return {'titulo': ph['tips_title'], 'colunas': [J(c) for c in ph['tips']]}
def main():
    A = json.load(open(os.path.join(TOOL, 'data', 'alunos_oficiais.json')))
    out = {}
    for ano in sorted({s['ano'] for s in A}):
        S = [s for s in A if s['ano'] == ano]
        full = next(s for s in S if s['itens']['LP'] and s['itens']['MAT'])
        def pages(s):
            pdf = pdfplumber.open(f"{OFF}/{s['arquivo']}.pdf"); i = s['paginas'][0] - 1
            return pdf, pdf.pages[i], pdf.pages[i + 1]
        pdf, p1, p2 = pages(full)
        d = {'descritores': {k: [t for _, t in E.page2_half(p2, k == 'LP')['items']] for k in ('LP', 'MAT')}}
        d['rotina'] = [J(E.bullets(E.group_lines(c))) if False else [' '.join(b) for b in col] for col in E.rotina(p1)]
        d['dicas'] = {'LP': tips_of(p2, True), 'MAT': tips_of(p2, False)}
        d['dicas_genericas'] = {}
        for k, left in (('LP', True), ('MAT', False)):
            e = next((s for s in S if not s['itens'][k]), None)
            if e:
                pdf2, _, q2 = pages(e); d['dicas_genericas'][k] = tips_of(q2, left)
        d['segmento'] = 'EM' if 'EM' in ano else ('EF1' if ano[0] in '345' else 'EF2')
        out[ano] = d
        print(ano, {k: len(v) for k, v in d['descritores'].items()}, list(d['dicas_genericas']), flush=True)
    json.dump(out, open(os.path.join(TOOL, 'data', 'dados_por_ano.json'), 'w'), ensure_ascii=False, indent=1)
if __name__ == '__main__': main()
