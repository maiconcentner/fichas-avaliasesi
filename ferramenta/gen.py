"""Gera o PDF/HTML de fichas a partir de dados de alunos (dicts) usando os modelos por ano."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render
TOOL = os.path.dirname(os.path.abspath(__file__))
_T = None
def templates():
    global _T
    if _T is None: _T = json.load(open(os.path.join(TOOL, 'data', 'templates.json')))
    return _T

def ficha_pages(f):
    """f: nome, ano ('9º EF'), turma, rm, contagem [[g,a,r,tot],[g,a,r,tot]], itens {'LP':[[sym,txt],..],'MAT':[...]}"""
    T = templates()[f['ano']]
    stL = 'L_full' if f['itens']['LP'] else 'L_empty'
    stR = 'R_full' if f['itens']['MAT'] else 'R_empty'
    return [render.page1(f, T['p1']), render.page2(f, _half(f['ano'], stL), _half(f['ano'], stR))]

def _half(ano, st):
    """metade da pagina 2 do ano; se o ano nao tem o estado (ex.: 2o EM sem MAT), usa outro ano do mesmo segmento (mesmo layout e texto generico)"""
    T = templates()
    if T[ano][st] is not None: return T[ano][st]
    seg = 'EM' if 'EM' in ano else ('EF1' if ano[0] in '345' else 'EF2')
    for a, t in T.items():
        s2 = 'EM' if 'EM' in a else ('EF1' if a[0] in '345' else 'EF2')
        if s2 == seg and t[st] is not None: return t[st]
    raise ValueError(f'sem modelo {st} para {ano}')

def counts_from_items(itens):
    out = []
    for k in ('LP', 'MAT'):
        it = itens[k] or []
        out.append([sum(1 for s, _ in it if s == sy) for sy in ('✓', '~', '!')] + [len(it)])
    return out

def make_pdf(fichas, out_pdf, html_path=None):
    import to_pdf
    pages = []
    for f in fichas: pages += ficha_pages(f)
    html = render.build_html(pages)
    html_path = html_path or out_pdf[:-4] + '.html'
    open(html_path, 'w').write(html)
    to_pdf.html_to_pdf(html_path, out_pdf)
