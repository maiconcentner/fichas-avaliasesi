import sys, json, pdfplumber, collections
sys.path.insert(0,'/home/claude/fichas/tool')
from extract_layout import serialize_page
def cmp(refpdf, rp, mypdf, mp, tol=0.15, verbose=True):
    with pdfplumber.open(refpdf) as a, pdfplumber.open(mypdf) as b:
        A = serialize_page(a.pages[rp-1]); B = serialize_page(b.pages[mp-1])
    rep = []
    # textos: casar por (texto, x aprox, baseline aprox)
    used = set()
    for t in A['texts']:
        best = None
        for i, u in enumerate(B['texts']):
            if i in used or u['t'] != t['t']: continue
            d = abs(u['x'] - t['x']) + abs(u['b'] - t['b'])
            if best is None or d < best[0]: best = (d, i)
        if best is None: rep.append(('FALTA', t['t'][:40], t['x'], t['b'])); continue
        used.add(best[1]); u = B['texts'][best[1]]
        dx, db, ds = u['x'] - t['x'], u['b'] - t['b'], u['s'] - t['s']
        w = (u.get('x1', 0) - u['x']) - (t.get('x1', 0) - t['x'])
        if abs(dx) > tol or abs(db) > tol or abs(ds) > 0.06 or abs(w) > 0.6 or u['f'] != t['f']:
            rep.append(('DIF', t['t'][:34], f"x{dx:+.2f} b{db:+.2f} s{ds:+.2f} w{w:+.2f}", t['f'], u['f']))
    for i, u in enumerate(B['texts']):
        if i not in used: rep.append(('EXTRA', u['t'][:40], u['x'], u['b']))
    # formas
    def key(lst, fields): return collections.Counter(tuple(round(d[f]) if isinstance(d[f], float) else d[f] for f in fields) for d in lst)
    for name, fields in (('rects', ('x', 'y', 'w', 'h', 'c')), ('rrects', ('x', 'y', 'w', 'h', 'fill')), ('circles', ('x', 'y', 'w', 'fill')), ('rings', ('x', 'y', 'w', 'h', 'stroke')), ('dashes', ('x0', 'x1', 'y', 'c', 'n')), ('vdashes', ('x', 'y0', 'y1', 'n'))):
        ca, cb = key(A[name], fields), key(B[name], fields)
        for k in (ca - cb): rep.append(('FORMA-FALTA', name, k))
        for k in (cb - ca): rep.append(('FORMA-EXTRA', name, k))
    if verbose:
        for r in rep: print(*r)
    return rep
if __name__ == '__main__':
    r = cmp(sys.argv[1], int(sys.argv[2]), sys.argv[3], int(sys.argv[4]))
    print('total diferencas:', len(r))
