"""Extrai dos PDFs oficiais do Avalia SESI-SP os dados de cada aluno e o conteudo estatico de cada ano."""
import pdfplumber, logging, re, collections, json, os, glob, hashlib
logging.disable(logging.CRITICAL)

def words(pg, x0=0, x1=9999):
    ws = pg.extract_words(extra_attrs=['size'], x_tolerance=1.5, keep_blank_chars=False)
    return [w for w in ws if x0 <= w['x0'] < x1]

def group_lines(ws, tol=1.2):
    ws = sorted(ws, key=lambda w: (w['top'], w['x0']))
    lines = []
    for w in ws:
        for L in lines:
            if abs(L['top'] - w['top']) <= tol and abs(L['size'] - w['size']) < 0.6:
                L['w'].append(w); break
        else:
            lines.append({'top': w['top'], 'size': w['size'], 'w': [w]})
    out = []
    for L in lines:
        L['w'].sort(key=lambda w: w['x0'])
        out.append({'top': L['top'], 'x0': L['w'][0]['x0'], 'x1': L['w'][-1]['x1'], 'size': L['size'],
                    'text': ' '.join(w['text'] for w in L['w'])})
    return sorted(out, key=lambda l: (l['top'], l['x0']))

def split_words_cols(ws):
    rows = {}
    for w in ws: rows.setdefault(round(w['top']), []).append(w)
    xl = min(w['x0'] for w in ws)
    cand = collections.Counter()
    for r in rows.values():
        r.sort(key=lambda w: w['x0'])
        for a, b in zip(r, r[1:]):
            if b['x0'] - a['x1'] > 8 and b['x0'] > xl + 100: cand[round(b['x0'])] += 1
    xr = cand.most_common(1)[0][0] if cand else 9999
    thr = xr - 4
    return [w for w in ws if w['x0'] < thr], [w for w in ws if w['x0'] >= thr]

def bullets(col):
    if not col: return []
    tops = [l['top'] for l in col]
    diffs = sorted(b - a for a, b in zip(tops, tops[1:]))
    pitch = diffs[0] if diffs else 9
    res = [[col[0]['text']]]
    for a, l in zip(col, col[1:]):
        if l['top'] - a['top'] > pitch + 1.4: res.append([l['text']])
        else: res[-1].append(l['text'])
    return res

def page2_half(pg, left):
    x0, x1 = (0, 420) if left else (420, 9999)
    ws = words(pg, x0, x1)
    L = group_lines(ws)
    hi = next(i for i, l in enumerate(L) if l['top'] > 100 and l['size'] < 10 and l['x0'] < x0 + 50 + (0 if left else 30)
              and re.search(r'(Língua Portuguesa|Matemática)$', l['text']) and l['size'] > 8)
    htop = L[hi]['top']
    tw = [w for w in ws if w['top'] > htop + 3 and w['size'] < 7.0 and w['top'] < 530]
    a, b = split_words_cols(tw)
    icons = sorted([w for w in ws if w['text'] in ('✓', '~', '!') and 6.3 < w['size'] < 7.0 and 100 < w['top'] < htop], key=lambda w: w['top'])
    tx = [w for w in ws if 7.3 < w['size'] < 7.9 and 100 < w['top'] < htop and w['x0'] > x0 + (50 if left else 30)]
    rows = []
    for l in group_lines(tx):
        if rows and l['top'] - rows[-1]['last'] < 14: rows[-1]['t'].append(l['text']); rows[-1]['last'] = l['top']
        else: rows.append({'t': [l['text']], 'last': l['top']})
    items = [[ic['text'], ' '.join(r['t'])] for ic, r in zip(icons, rows)]
    if len(icons) != len(rows): items = None
    return {'tips_title': L[hi]['text'], 'tips': [bullets(group_lines(a)), bullets(group_lines(b))], 'items': items,
            'n_icons': len(icons), 'n_rows': len(rows)}

def rotina(pg):
    ws = [w for w in words(pg, 440, 9999) if 388 < w['top'] < 535 and 6.3 < w['size'] < 6.9]
    a, b = split_words_cols(ws)
    return [bullets(group_lines(a)), bullets(group_lines(b))]

def hsh(o): return hashlib.md5(json.dumps(o, ensure_ascii=False).encode()).hexdigest()[:8]

def parse_pdf(path):
    key = os.path.basename(path)[:-4]
    res = []
    with pdfplumber.open(path) as pdf:
        for i in range(0, len(pdf.pages), 2):
            p1, p2 = pdf.pages[i], pdf.pages[i + 1]
            t1 = p1.crop((420, 0, p1.width, p1.height)).extract_text() or ''
            m = re.search(r'^(.*)\nCE 026 - Jaú · (\S+ \S+) · Turma (\w) · RM (\d+)\n(.*?)\n', t1, re.M)
            counts = re.findall(r'^(\d+) (\d+) (\d+) · (\d+) conte', t1, re.M)
            st = {'arquivo': key, 'paginas': [i + 1, i + 2], 'nome': m.group(1), 'ano': m.group(2), 'turma': m.group(3),
                  'rm': m.group(4), 'saudacao': m.group(5), 'contagem': [list(map(int, c)) for c in counts]}
            halves = {}
            for left, comp in ((True, 'LP'), (False, 'MAT')):
                ph = page2_half(p2, left)
                halves[comp] = ph['items']
                st['tips_' + comp] = hsh(ph['tips']); st['titulo_' + comp] = ph['tips_title']
                if ph['items'] is None: st['erro_itens_' + comp] = [ph['n_icons'], ph['n_rows']]
            st['itens'] = halves
            st['rotina'] = hsh(rotina(p1))
            res.append(st)
    return res

def parse_all(base, out_json, procs=2):
    from multiprocessing import Pool
    files = sorted(glob.glob(base + '/*.pdf'))
    with Pool(procs) as p: r = p.map(parse_pdf, files)
    allst = [s for x in r for s in x]
    json.dump(allst, open(out_json, 'w'), ensure_ascii=False, indent=0)
    return allst
