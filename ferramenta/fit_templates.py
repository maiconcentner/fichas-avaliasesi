"""Monta os modelos (geometria dos PDFs oficiais) de cada ano e mede o espacamento/linha de base no Chrome."""
import sys, json, os, collections, pdfplumber
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_layout import serialize_page
import calibrate
BASE = '/mnt/user-data/uploads/Plano_de_estudos/CE_026_Jau/'
TOOL = os.path.dirname(os.path.abspath(__file__))

def pick_refs(A):
    refs = {}
    for ano in sorted(set(s['ano'] for s in A)):
        S = [s for s in A if s['ano'] == ano]
        tot = lambda s, i: s['contagem'][i][3] if len(s['contagem']) > i else 0
        full = next(s for s in S if tot(s, 0) > 0 and tot(s, 1) > 0)
        lp0 = next((s for s in S if tot(s, 0) == 0), None)
        mat0 = next((s for s in S if tot(s, 1) == 0), None)
        refs[ano] = {'full': full, 'lp0': lp0, 'mat0': mat0}
    return refs

def ser(st, which):
    pdf = pdfplumber.open(BASE + st['arquivo'] + '.pdf'); i = st['paginas'][0] - 1
    try:
        if which == 'p1': return serialize_page(pdf.pages[i])
        if which == 'L': return serialize_page(pdf.pages[i + 1], 0, 420)
        return serialize_page(pdf.pages[i + 1], 420, 9999)
    finally: pdf.close()

def build(A):
    refs = pick_refs(A)
    T = {}
    for ano, r in refs.items():
        full = r['full']
        t = {'p1': ser(full, 'p1'), 'L_full': ser(full, 'L'), 'R_full': ser(full, 'R'),
             'ref_nome': full['nome'], 'ref_arquivo': full['arquivo']}
        t['L_empty'] = ser(r['lp0'], 'L') if r['lp0'] else None
        t['R_empty'] = ser(r['mat0'], 'R') if r['mat0'] else None
        T[ano] = t
        print(ano, 'ok', 'lp0' if r['lp0'] else '-', 'mat0' if r['mat0'] else '-', flush=True)
    return T

def texts_of(T):
    for ano, t in T.items():
        for k, v in t.items():
            if isinstance(v, dict) and 'texts' in v:
                for x in v['texts']: yield x

def fit(T):
    allt = [x for x in texts_of(T) if not x.get('rot') and x['t'].strip() and x['f'] not in ('segoe',)]
    uniq = {}
    for x in allt: uniq.setdefault((x['f'], x['s'], x['t']), None)
    items = [(f, s, None, t) for (f, s, t) in uniq]
    res = calibrate.measure(items)
    nat = {k: w for k, (_, w) in zip(uniq, res)}
    for x in allt:
        n = len(x['t'])
        if n > 1 and 'x1' in x:
            wref = x['x1'] - x['x']; w = nat[(x['f'], x['s'], x['t'])]
            ls = (wref - w) / (n - 1)
            x['ls'] = round(ls, 4) if abs(ls) > 0.0008 else 0.0
        else: x['ls'] = 0.0
    # estilos de linha de base
    styles = set((x['f'], x['s'], 1) for x in texts_of(T) if x['f'] != 'segoe')
    styles |= {('plex', 6.6, 1)}
    for s in {x['s'] for x in texts_of(T) if x['f'] == 'inter' and abs(x['s'] - 8.4) < 0.1}: styles.add(('inter', s, 16))
    calibrate.baseline_table(styles)
    return T

if __name__ == '__main__':
    A = json.load(open(os.path.join(TOOL, 'data', 'alunos_oficiais.json')))
    T = fit(build(A))
    json.dump(T, open(os.path.join(TOOL, 'data', 'templates.json'), 'w'), ensure_ascii=False)
    print('templates salvos')
