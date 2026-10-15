"""Mede, no Chrome, a distancia topo->linha de base de cada estilo de texto e a largura natural das linhas."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
TOOL = os.path.dirname(os.path.abspath(__file__))
FAM = {'bric': ('Bric', 800), 'inter': ('Intr', 400), 'interb': ('Intr', 700), 'plex': ('Plex', 500), 'plexsb': ('PlexSB', 600), 'consolas': ('Cons', 400), 'segoe': ('Intr', 400)}
def px(s): return round(s * 4 / 3, 1)

async def _measure(items):
    """items: lista de (font, size_pt, lh_px_or_None, text_or_None) -> lista de (offset_pt, largura_pt)"""
    import render
    html = f"<html><head><style>{render.css()}</style></head><body></body></html>"
    open(os.path.join(TOOL, 'data', '_cal.html'), 'w').write(html)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto('file://' + os.path.join(TOOL, 'data', '_cal.html'))
        await pg.evaluate("Promise.all([document.fonts.load('800 16px Bric'),document.fonts.load('400 16px Intr'),document.fonts.load('700 16px Intr'),document.fonts.load('500 16px Plex'),document.fonts.load('600 16px PlexSB'),document.fonts.load('400 16px Cons')])")
        js = """([fam,wt,spx,lh,txt])=>{const d=document.createElement('div');d.style.cssText=`position:absolute;left:0;top:0;white-space:pre;font-family:${fam};font-weight:${wt};font-size:${spx}pt;line-height:${lh}`;
        const t=document.createElement('span');t.textContent=txt;d.appendChild(t);const m=document.createElement('span');m.style.cssText='display:inline-block;width:0;height:0';d.appendChild(m);document.body.appendChild(d);
        const off=m.getBoundingClientRect().bottom-d.getBoundingClientRect().top;const w=t.getBoundingClientRect().width;d.remove();return [off*0.75,w*0.75]}"""
        res = []
        for font, size, lh, txt in items:
            fam, wt = FAM[font]
            r = await pg.evaluate(js, [fam, wt, size, (f'{lh}px' if lh else '1'), txt or 'Hx'])
            res.append(r)
        await b.close()
    return res

def measure(items): return asyncio.run(_measure(items))

def baseline_table(styles, path=None):
    """styles: conjunto de (font,size,lh) -> dict 'font|size|lh' -> distancia topo->linha de base (pt), medida no PDF"""
    import render, pdfplumber, logging
    logging.disable(logging.CRITICAL)
    path = path or os.path.join(TOOL, 'data', 'baseline_offsets.json')
    cache = json.load(open(path)) if os.path.exists(path) else {}
    need = sorted(s for s in styles if f'{s[0]}|{s[1]}|{s[2]}' not in cache)
    if not need: return cache
    rows = []
    for i, (font, size, lh) in enumerate(need):
        fam, wt = FAM[font]
        lhs = f'{lh}px' if lh != 1 else '1'
        rows.append(f'<div style="position:absolute;left:10pt;top:{i*40}pt;white-space:pre;font-family:{fam};font-weight:{wt};font-size:{size}pt;line-height:{lhs};color:#000">HxHx</div>')
    html = f"<html><head><meta charset='utf-8'><style>{render.css().split('@page')[0]}@page{{size:300pt {len(need)*40+40}pt;margin:0}}html,body{{margin:0}}</style></head><body>{''.join(rows)}</body></html>"
    hp = os.path.join(TOOL, 'data', '_cal.html'); pp = os.path.join(TOOL, 'data', '_cal.pdf')
    open(hp, 'w').write(html)
    import to_pdf
    to_pdf.html_to_pdf_size(hp, pp, 400, (len(need) * 40 + 40) * 4 / 3)
    with pdfplumber.open(pp) as pdf:
        pg = pdf.pages[0]; H = pg.height
        bases = sorted({round(H - c['matrix'][5], 3) for c in pg.chars})
    assert len(bases) == len(need), (len(bases), len(need))
    for i, ((f, sz, lh), b) in enumerate(zip(need, bases)): cache[f'{f}|{sz}|{lh}'] = round(b - i * 40, 4)
    json.dump(cache, open(path, 'w'), indent=0)
    return cache
