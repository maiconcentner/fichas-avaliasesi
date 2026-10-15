"""Gera as fichas do Avalia SESI-SP (HTML -> PDF) calcando o layout do PDF oficial."""
import json, os, re, math, html as H
TOOL = os.path.dirname(os.path.abspath(__file__))
OFFS = json.load(open(os.path.join(TOOL, 'data', 'baseline_offsets.json'))) if os.path.exists(os.path.join(TOOL, 'data', 'baseline_offsets.json')) else {}
FONTS = os.path.join(TOOL, 'fonts')
PW, PH = 841.92, 594.96
GREEN, AMBER, RED = '#1f8a5f', '#c97f06', '#ce4b39'
SYMCOL = {'✓': GREEN, '~': AMBER, '!': RED}
FF = {'bric': ("Bric", 800), 'inter': ("Intr", 400), 'interb': ("Intr", 700), 'plex': ("Plex", 500), 'plexsb': ("PlexSB", 600),
      'consolas': ("Cons", 400), 'segoe': ("Intr", 400)}
CHECK_PTS = [(119,210),(130,203),(144,205),(162,229),(176,249),(194,205),(222,152),(250,113),(264,104),(274,109),(271,122),(242,167),(217,212),(198,255),(188,275),(172,280),(164,276),(150,255),(132,232),(120,219)]

def css():
    f = lambda n: 'file://' + os.path.join(FONTS, n)
    return f"""
@font-face{{font-family:Bric;src:url('{f('BricolageGrotesque[opsz,wdth,wght].ttf')}');font-weight:200 800;font-stretch:75% 100%}}
@font-face{{font-family:Intr;src:url('{f('Inter[opsz,wght].ttf')}');font-weight:100 900}}
@font-face{{font-family:Plex;src:url('{f('IBMPlexMono-Medium.ttf')}');font-weight:500}}
@font-face{{font-family:PlexSB;src:url('{f('IBMPlexMono-SemiBold.ttf')}');font-weight:600}}
@font-face{{font-family:Cons;src:url('{f('Consolas-arrow.ttf')}')}}
@page{{size:{PW}pt {PH}pt;margin:0}}
*{{box-sizing:border-box}}
html,body{{margin:0;padding:0;background:#fff}}
.pg{{position:relative;width:{PW}pt;height:{PH}pt;overflow:hidden;background:#fff;page-break-after:always;break-after:page}}
.pg:last-child{{page-break-after:auto;break-after:auto}}
.a{{position:absolute}}
svg.t{{position:absolute;left:0;top:0;width:{PW}pt;height:{PH}pt;overflow:visible}}
svg.t text{{white-space:pre}}
"""

def n(v): return f'{v:.2f}'.rstrip('0').rstrip('.')
def n3(v): return f'{v:.3f}'.rstrip('0').rstrip('.')

# ---------- primitivas ----------
ROTK = 1.58  # tamanho real do texto "DOBRE AQUI" (o PDF guarda 2.925 com matriz 0.75)

def offs_near(font, size, lh):
    """Offset da linha de base para um tamanho sem calibracao: escala do mais proximo da mesma fonte."""
    c = [(abs(float(k.split('|')[1]) - size), k, v) for k, v in OFFS.items() if k.split('|')[0] == font and k.split('|')[2] == str(lh)]
    _, k, v = min(c)
    return v * size / float(k.split('|')[1])

class Page:
    def __init__(s):
        s.layers = {i: [] for i in range(6)}   # 0 fundos, 1 cartoes, 2 retangulos, 3 formas, 4 extras, 5 html
        s.svg = []
    def div(s, layer, style): s.layers[layer].append(f'<div class="a" style="{style}"></div>')
    def raw(s, layer, h): s.layers[layer].append(h)
    def rect(s, x, y, w, h, c, layer=2): s.div(layer, f'left:{n(x)}pt;top:{n(y)}pt;width:{n(w)}pt;height:{n(h)}pt;background:{c}')
    def rrect(s, x, y, w, h, c, r, layer=1): s.div(layer, f'left:{n(x)}pt;top:{n(y)}pt;width:{n(w)}pt;height:{n(h)}pt;background:{c};border-radius:{n(r)}pt')
    def circle(s, x, y, d, c, layer=3): s.div(layer, f'left:{n(x)}pt;top:{n(y)}pt;width:{n(d)}pt;height:{n(d)}pt;background:{c};border-radius:50%')
    def ring(s, x, y, w, h, c, r, lw):
        o = lw / 2
        s.div(3, f'left:{n(x-o)}pt;top:{n(y-o)}pt;width:{n(w+lw)}pt;height:{n(h+lw)}pt;border:{n(lw)}pt solid {c};border-radius:{n(r+o)}pt')
    def hdash(s, x0, x1, y, h, c): s.div(3, f'left:{n(x0)}pt;top:{n(y)}pt;width:{n(x1-x0)}pt;height:0;border-bottom:{n(h)}pt dashed {c}')
    def vdash(s, x, y0, y1, w, c): s.div(3, f'left:{n(x)}pt;top:{n(y0)}pt;width:0;height:{n(y1-y0)}pt;border-left:{n(w)}pt dashed {c}')
    def text(s, x, b, size, font, color, t, ls=0.0, rot=0.0, lh=None):
        fam, wt = FF[font]
        off = OFFS.get(f'{font}|{size}|{lh or 1}') or offs_near(font, size, lh or 1)
        lsx = f';letter-spacing:{n(ls)}pt' if abs(ls) > 0.004 else ''
        lhs = f'{n(lh)}px' if lh else '1'
        sty = f'left:{n(x)}pt;top:{n(b - off)}pt;font-family:{fam};font-weight:{wt};font-size:{n3(size)}pt;line-height:{lhs};color:{color};white-space:pre{lsx}'
        if rot:
            sty += f';transform-origin:0 {n(off)}pt;transform:rotate(90deg)'
        s.layers[4].append(f'<div class="a" style="{sty}">{H.escape(t)}</div>')
    def check(s, cx, cy, d, color='#fff'):
        k = d / 376.0
        pts = ' '.join(f'{n(cx + (x - 28 + 0) * k - 0)},{n(cy + (y - 33 + 0) * k)}' for x, y in CHECK_PTS)
        # CHECK_PTS estao no sistema da caixa 376x376 do circulo (ja deslocados)
        pts = ' '.join(f'{n(cx + x * k)},{n(cy + y * k)}' for x, y in CHECK_PTS)
        s.svg.append(f'<polygon points="{pts}" fill="{color}" stroke="{color}" stroke-width="{n(0.12*d/11.2)}" stroke-linejoin="round"/>')
    def html(s):
        body = ''.join(''.join(s.layers[i]) for i in range(5))
        svg = f'<svg class="t" viewBox="0 0 {PW} {PH}" xmlns="http://www.w3.org/2000/svg">{"".join(s.svg)}</svg>'
        return f'<div class="pg">{body}{svg}{"".join(s.layers[5])}</div>'

def draw_static(P, el, skip_text=lambda t: False, skip_circle=lambda c: False, skip_rect=lambda r: False):
    """desenha os elementos serializados de uma pagina/metade"""
    for r in el['rects']:
        if skip_rect(r): continue
        full = r['w'] > 400 and r['h'] > 500
        P.rect(r['x'], r['y'], r['w'], r['h'], r['c'], 0 if (r['h'] > 500) else 2)
    for r in el['rrects']:
        if skip_rect(r): continue
        P.rrect(r['x'], r['y'], r['w'], r['h'], r['fill'], r['r'], 1)
    circles = [c for c in el['circles'] if not skip_circle(c)]
    for c in circles: P.circle(c['x'], c['y'], c['w'], c['fill'])
    for r in el['rings']: P.ring(r['x'], r['y'], r['w'], r['h'], r['stroke'], r['r'], max(r['lw'], 0.75))
    for d in el['dashes']: P.hdash(d['x0'], d['x1'], d['y'], d['h'], d['c'])
    for d in el['vdashes']: P.vdash(d['x'], d['y0'], d['y1'], d['w'], d['c'])
    # ✓ estatico: desenhado sobre o circulo que o contem
    for t in el['texts']:
        if skip_text(t): continue
        if t['f'] == 'segoe' and t['t'] == '✓':
            cx = t['x'] + 2.5
            for c in el['circles']:
                if c['x'] - 0.5 <= cx <= c['x'] + c['w'] + 0.5 and c['y'] - 1 <= t['b'] - 3 <= c['y'] + c['w'] + 1:
                    P.check(c['x'], c['y'], c['w']); break
            continue
        if t.get('rot'):
            P.text(t['x'], t['b'], t['s'] * ROTK, t['f'], t['c'], t['t'], rot=t['rot']); continue
        P.text(t['x'], t['b'], t['s'], t['f'], t['c'], t['t'], t.get('ls', 0.0))

# ---------- partes dinamicas ----------
def mono_run(P, ref, s, right_align=False):
    """texto monoespacado (Plex Mono) com o espacamento entre letras medido no original"""
    adv = ref['s'] * 0.6; ls = ref.get('ls', 0.0)
    W = len(s) * adv + (len(s) - 1) * ls
    x0 = (ref['x1'] - W) if right_align else ref['x']
    P.text(x0, ref['b'], ref['s'], ref['f'], ref['c'], s, ls)

def esc_html(t): return H.escape(t)

def first_name(nome): return nome.split()[0]

def page1(f, T):
    """f: dict da ficha; T: pagina 1 serializada do ano"""
    P = Page()
    counts = f['contagem']                       # [[g,a,r,total],[g,a,r,total]]
    rr = next((r for r in T['rrects'] if abs(r['h'] - 6) < 0.01 and abs(r['w'] - 333.75) < 0.01), None)
    rad = rr['r'] if rr else 3.0
    trackfill = rr['fill'] if rr else '#f1f5f4'
    ys = []
    for r in sorted(T['rects'] + T['rrects'], key=lambda r: r['y']):
        if abs(r['h'] - 6) < 0.01 and r['x'] > 440 and r['w'] < 333.8 and not any(abs(r['y'] - y) < 0.3 for y in ys): ys.append(r['y'])
    tracks = [dict(x=463.5, y=y, w=333.75, h=6.0, r=rad) for y in ys]
    assert len(tracks) == 2, ys
    ty = [t['y'] for t in tracks]
    isbar = lambda r: abs(r['h'] - 6) < 0.01 and any(abs(r['y'] - y) < 0.3 for y in ty)
    isdot = lambda c: abs(c['w'] - 4.5) < 0.01 and any(abs(c['y'] - (y + 12)) < 0.3 for y in ty)
    name_t = next(t for t in T['texts'] if t['f'] == 'bric' and abs(t['s'] - 12.7) < 0.15 and t['x'] > 440)
    ce_t = next(t for t in T['texts'] if t['f'] == 'plex' and abs(t['s'] - 6.7) < 0.1 and t['x'] > 440 and t['t'].startswith('CE'))
    greet = [t for t in T['texts'] if t['f'] == 'inter' and abs(t['s'] - 8.4) < 0.1]
    cntruns = [t for t in T['texts'] if t['f'] == 'plex' and abs(t['s'] - 6.6) < 0.1 and t['x'] > 440]
    skip_t = lambda t: t is name_t or t is ce_t or t in greet or t in cntruns
    draw_static(P, T, skip_text=skip_t, skip_circle=isdot, skip_rect=isbar)
    P.text(name_t['x'], name_t['b'], name_t['s'], 'bric', name_t['c'], f['nome'])
    mono_run(P, ce_t, f"CE 026 - Jaú · {f['ano']} · Turma {f['turma']} · RM {f['rm']}")
    # saudacao (HTML, quebra de linha do proprio Chrome)
    g0 = sorted(greet, key=lambda t: t['b'])[0]
    pitch = sorted(greet, key=lambda t: t['b'])[1]['b'] - g0['b']
    msg = f"Oi, {first_name(f['nome'])}! Este mapa mostra como foi seu desempenho nos conteúdos avaliados e dá dicas de como continuar avançando nos estudos."
    lhpx = round(pitch * 4 / 3)
    goff = OFFS[f'inter|{g0["s"]}|{lhpx}']
    P.raw(4, f'<div class="a" style="left:{n(g0["x"])}pt;top:{n(g0["b"] - goff)}pt;width:{n(806.25 - g0["x"])}pt;font:400 {n3(g0["s"])}pt/{lhpx}px Intr;color:{g0["c"]}">{esc_html(msg)}</div>')
    # cartoes: barras e contagens
    lines = sorted({t['b'] for t in cntruns})
    for i, trk in enumerate(tracks):
        g, a, r, tot = counts[i]
        if True:
            segs = [(g, GREEN), (a, AMBER), (r, RED)]
            inner = ''; cum = 0
            total_px = round(trk['w'] * 4 / 3)
            for v, c in segs:
                if v and tot:
                    e0 = math.floor(cum / tot * total_px + 0.5); cum += v; e1 = math.floor(cum / tot * total_px + 0.5)
                    inner += f'<div class="a" style="left:{n(e0*0.75)}pt;top:0;width:{n((e1-e0)*0.75)}pt;height:{n(trk["h"])}pt;background:{c}"></div>'
            P.raw(2, f'<div class="a" style="left:{n(trk["x"])}pt;top:{n(trk["y"])}pt;width:{n(trk["w"])}pt;height:{n(trk["h"])}pt;border-radius:{n(trk["r"])}pt;overflow:hidden;background:{trackfill}">{inner}</div>')
        bl = lines[i]
        runs = sorted([t for t in cntruns if t['b'] == bl], key=lambda t: t['x'])
        nums = [t for t in runs if t['t'].strip().isdigit() and not t['t'].startswith('·')][:3]
        suf = next(t for t in runs if t['t'].startswith('·'))
        pitch1 = nums[1]['x'] - nums[0]['x']; adv = nums[0]['s'] * 0.6
        cum = 0.0
        for k, (v, c) in enumerate(((g, GREEN), (a, AMBER), (r, RED))):
            dxp = math.floor((463.5 + cum) * 4 / 3 + 1e-6) * 0.75
            P.circle(dxp, trk['y'] + 12.0, 4.5, c)
            P.text(nums[0]['x'] + cum, nums[0]['b'], nums[0]['s'], 'plex', nums[0]['c'], str(v))
            cum += pitch1 + (len(str(v)) - 1) * adv
        P.text(suf['x'] + (cum - 3 * pitch1), suf['b'], suf['s'], 'plex', suf['c'], f"· {tot} conteúdos")
    return P.html()

def glyph_params(T, x0):
    """posicao do ~ e ! dentro dos circulos de linha, medida no modelo da metade"""
    gp = {}
    circs = [c for c in T['circles'] if abs(c['w'] - 11.25) < 0.1 and abs(c['x'] - x0) < 0.3 and 100 < c["y"] < 480]
    for t in T['texts']:
        if t['c'] == '#ffffff' and t['f'] == 'interb' and t['t'] in ('~', '!') and x0 - 1 < t['x'] < x0 + 12:
            c = next((c for c in circs if abs(c['y'] + 8.25 - t['b']) < 1.0), None)
            if c: gp[t['t']] = {'dx': t['x'] - c['x'], 'db': t['b'] - c['y'], 's': t['s']}
    return gp

def page2(f, TL, TR):
    P = Page()
    hdr = next(t for t in TL['texts'] if t['f'] == 'plex' and abs(t['s'] - 6.0) < 0.05 and t['t'].startswith('AVALIA'))
    foot = next(t for t in TR['texts'] if t['f'] == 'plex' and abs(t['s'] - 5.6) < 0.05 and t['x'] > 600)
    def rowcirc(c, x0): return abs(c['w'] - 11.25) < 0.1 and abs(c['x'] - x0) < 0.3 and 100 < c["y"] < 480
    def rowglyph(t, x0): return t['c'] == '#ffffff' and t['f'] in ('interb', 'segoe') and x0 - 1 < t['x'] < x0 + 12 and 100 < t["b"] < 485
    L_circ = sorted([c for c in TL['circles'] if rowcirc(c, 35.2)], key=lambda c: c['y'])
    R_circ = sorted([c for c in TR['circles'] if rowcirc(c, 444.7)], key=lambda c: c['y'])
    gpL, gpR = glyph_params(TL, 35.2), glyph_params(TR, 444.7)
    draw_static(P, TL, skip_text=lambda t: t is hdr or rowglyph(t, 35.2), skip_circle=lambda c: rowcirc(c, 35.2))
    draw_static(P, TR, skip_text=lambda t: t is foot or rowglyph(t, 444.7), skip_circle=lambda c: rowcirc(c, 444.7))
    mono_run(P, hdr, f"AVALIA SESI-SP · {f['ano']} {f['turma']} · CE 026 - JAÚ")
    mono_run(P, foot, f['nome'], right_align=True)
    for circs, key, gp in ((L_circ, 'LP', gpL), (R_circ, 'MAT', gpR)):
        items = f['itens'][key]
        assert len(items) == len(circs), (key, len(items), len(circs))
        base = gp.get('~') or gp.get('!') or {'dx': 3.55, 'db': 8.25, 's': 6.67}
        for c, (sym, _) in zip(circs, items):
            P.circle(c['x'], c['y'], c['w'], SYMCOL[sym])
            if sym == '✓': P.check(c['x'], c['y'], c['w'])
            else:
                g = gp.get(sym) or {'dx': base['dx'] + (1.2 if sym == '!' else 0), 'db': base['db'] - (0.05 if sym == '!' else 0), 's': base['s']}
                P.text(c['x'] + g['dx'], c['y'] + g['db'], g['s'], 'interb', '#ffffff', sym)
    return P.html()

def build_html(pages):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{css()}</style></head><body>{"".join(pages)}</body></html>'
