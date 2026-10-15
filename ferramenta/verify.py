"""Fidelidade: regenera cada aluno oficial e compara palavras/posições com o PDF original."""
import json, os, sys, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen, pdfplumber
from multiprocessing import Pool
TOOL = os.path.dirname(os.path.abspath(__file__))
OFF = '/mnt/user-data/uploads/Plano_de_estudos/CE_026_Jau'
OUT = '/home/claude/fichas/work/verify'
import subprocess, numpy as np, io
def raster(pdf, dpi=60):
    d = pdf[:-4] + '_r'
    os.makedirs(d, exist_ok=True)
    subprocess.run(['pdftoppm', '-r', str(dpi), '-gray', pdf, d + '/p'], check=True)
    fs = sorted(os.listdir(d))
    from PIL import Image
    return [np.asarray(Image.open(f'{d}/{f}'), dtype=np.int16) for f in fs]
def chars(pdf):
    t = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout
    return [''.join(sorted(re.sub(r'[\s✓]+', '', p))) for p in t.split('\f')[:-1]]
import re
def job(arq):
    A = [s for s in json.load(open(os.path.join(TOOL, 'data', 'alunos_oficiais.json'))) if s['arquivo'] == arq]
    os.makedirs(OUT, exist_ok=True)
    out = f'{OUT}/{arq}.pdf'
    gen.make_pdf(A, out)
    ra, rb = raster(f'{OFF}/{arq}.pdf'), raster(out)
    ca, cb = chars(f'{OFF}/{arq}.pdf'), chars(out)
    assert len(ra) == len(rb) == 2 * len(A), (arq, len(ra), len(rb), len(A))
    res = []
    for i, (a, b) in enumerate(zip(ra, rb)):
        pix = float((np.abs(a - b) > 60).mean() * 100)
        res.append(dict(arq=arq, pag=i + 1, aluno=A[i // 2]['nome'], pix=round(pix, 3), txt_ok=(ca[i] == cb[i])))
    return res
if __name__ == '__main__':
    arqs = sorted(os.path.basename(p)[:-4] for p in glob.glob(OFF + '/*.pdf'))
    if len(sys.argv) > 1: arqs = sys.argv[1:]
    with Pool(2) as p: R = p.map(job, arqs)
    R = [x for r in R for x in r]
    json.dump(R, open(OUT + '/resultado.json', 'w'), ensure_ascii=False)
    bad = [x for x in R if not x['txt_ok'] or x['pix'] > 2.0]
    print('paginas', len(R), 'texto diferente', sum(not x['txt_ok'] for x in R), 'pix>2%', sum(x['pix'] > 2 for x in R), 'pix max', max(x['pix'] for x in R), 'media', round(sum(x['pix'] for x in R) / len(R), 3))
    for x in sorted(bad, key=lambda x: -x['pix'])[:25]: print(x)
