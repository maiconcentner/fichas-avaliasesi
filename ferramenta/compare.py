import subprocess, sys, os, numpy as np
from PIL import Image, ImageChops
def rast(pdf, page, dpi, out):
    subprocess.run(['pdftoppm','-r',str(dpi),'-png','-f',str(page),'-l',str(page),'-singlefile',pdf,out],stderr=subprocess.DEVNULL,check=True)
    return Image.open(out+'.png').convert('RGB')
def diff(ref_pdf, ref_page, my_pdf, my_page, dpi=150, tag='cmp', outdir='/home/claude/fichas/work'):
    a = rast(ref_pdf, ref_page, dpi, f'{outdir}/{tag}_ref'); b = rast(my_pdf, my_page, dpi, f'{outdir}/{tag}_my')
    d = np.abs(np.asarray(a).astype(int) - np.asarray(b).astype(int)).sum(axis=2)
    bad = d > 90
    pct = bad.mean() * 100
    img = np.full(d.shape + (3,), 255, np.uint8); img[bad] = (220, 0, 0)
    # fundo suave do original para contexto
    g = (np.asarray(a.convert('L')) // 3 + 170).astype(np.uint8)
    ctx = np.stack([g, g, g], axis=2); ctx[bad] = (220, 0, 0)
    Image.fromarray(ctx).save(f'{outdir}/{tag}_diff.png')
    return pct, bad
if __name__ == '__main__':
    ref, rp, my, mp = sys.argv[1], int(sys.argv[2]), sys.argv[3], int(sys.argv[4])
    pct, bad = diff(ref, rp, my, mp, tag=sys.argv[5] if len(sys.argv) > 5 else 'cmp')
    print(f'pixels diferentes: {pct:.3f}%')
