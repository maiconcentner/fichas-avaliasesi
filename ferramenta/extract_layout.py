"""Serializa a geometria de paginas do PDF oficial (textos por linha, retangulos, circulos, cartoes, tracejados)."""
import pdfplumber, logging, collections, json
logging.disable(logging.CRITICAL)

FONTKEY = [('IBMPlexMono-SemiBold', 'plexsb'), ('IBMPlexMono', 'plex'), ('Consolas', 'consolas'), ('SegoeUISymbol', 'segoe'),
           ('Inter-Bold', 'interb'), ('Inter', 'inter'), ('Bricolage', 'bric')]
def fkey(name):
    for k, v in FONTKEY:
        if k in name: return v
    return name
hexc = lambda c: '#%02x%02x%02x' % tuple(round(x * 255) for x in c) if c else None

def serialize_page(pg, x_from=0, x_to=9999):
    H = pg.height
    out = {'texts': [], 'rects': [], 'rrects': [], 'circles': [], 'rings': [], 'dashes': [], 'vdashes': []}
    rows = collections.OrderedDict()
    for c in pg.chars:
        if not (x_from <= c['x0'] < x_to): continue
        m = c['matrix']
        key = (round(H - m[5], 1), fkey(c['fontname']), round(c['size'], 3), hexc(c['non_stroking_color']), round(m[1], 2))
        rows.setdefault(key, []).append(c)
    for (b, f, s, col, rot), cs in rows.items():
        cs.sort(key=lambda c: c['matrix'][4])
        if rot != 0.0:   # texto girado: cada caractere com sua origem
            for c in cs:
                m = c['matrix']
                out['texts'].append({'x': round(m[4], 2), 'b': round(H - m[5], 2), 'f': f, 's': round(c['size'], 3), 'c': col, 't': c['text'],
                                     'rot': round(m[1], 3), 'm': [round(v, 4) for v in m]})
            continue
        run = [cs[0]]
        runs = []
        for c in cs[1:]:
            if c['x0'] - run[-1]['x1'] > 3.0: runs.append(run); run = [c]
            else: run.append(c)
        runs.append(run)
        for r in runs:
            out['texts'].append({'x': round(r[0]['matrix'][4], 2), 'x1': round(r[-1]['x1'], 2), 'b': b, 'f': f, 's': s, 'c': col,
                                 't': ''.join(c['text'] for c in r), 'rot': 0.0,
                                 'xs': [round(c['matrix'][4], 2) for c in r]})
    for r in pg.rects:
        w, h = r['x1'] - r['x0'], r['bottom'] - r['top']
        if w > 800 and h > 590: continue
        if not (x_from <= r['x0'] < x_to): continue
        out['rects'].append({'x': round(r['x0'], 2), 'y': round(r['top'], 2), 'w': round(w, 2), 'h': round(h, 2), 'c': hexc(r['non_stroking_color'])})
    tiny = collections.defaultdict(list)
    for c in pg.curves:
        w, h = c['x1'] - c['x0'], c['bottom'] - c['top']
        if not (x_from <= c['x0'] < x_to): continue
        if (h < 1.0 and w < 3.0 and w > h) :
            tiny[('h', round(c['top'], 2), round(h, 2), hexc(c['non_stroking_color']))].append(c); continue
        if (w < 1.0 and h < 3.0 and h > w):
            tiny[('v', round(c['x0'], 2), round(w, 2), hexc(c['non_stroking_color']))].append(c); continue
        fill = hexc(c['non_stroking_color']) if c['fill'] else None
        stroke = hexc(c['stroking_color']) if c['stroke'] else None
        d = {'x': round(c['x0'], 2), 'y': round(c['top'], 2), 'w': round(w, 2), 'h': round(h, 2), 'fill': fill, 'stroke': stroke,
             'lw': round(c.get('linewidth') or 0, 2)}
        if abs(w - h) < 0.06 and len(c['pts']) >= 17 and fill:
            out['circles'].append(d)
        else:
            ys = [p[1] - c['top'] for p in c['pts'] if abs(p[0] - c['x0']) < 0.02 and p[1] - c['top'] <= h / 2 + 0.01]
            d['r'] = round(max(ys), 2) if ys else 0
            (out['rrects'] if fill else out['rings']).append(d)
    for k, v in tiny.items():
        xs = sorted(c['x0'] for c in v) if k[0] == 'h' else None
        if k[0] == 'h':
            out['dashes'].append({'x0': round(min(c['x0'] for c in v), 2), 'x1': round(max(c['x1'] for c in v), 2), 'y': k[1], 'h': k[2], 'c': k[3], 'n': len(v)})
        else:
            tops = sorted(c['top'] for c in v)
            out['vdashes'].append({'x': k[1], 'w': k[2], 'n': len(v), 'y0': round(tops[0], 2), 'y1': round(max(c['bottom'] for c in v), 2), 'c': k[3]})
    return out
