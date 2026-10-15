"""Gera casos de teste e o HTML de referência do motor Python (ferramenta/).

Uso: python3 tests/paridade.py SAIDA.json [quantidade]
Depois: node tests/paridade.mjs SAIDA.json   (compara com js/motor.js)
Só usa alunos fictícios.
"""
import json, os, random, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'ferramenta'))
import fichas, gen, render

render.FONTS = 'FONTS'          # url previsível das fontes: file://FONTS/<arquivo>
NOMES = ['Ana', 'João Pedro', 'Maria Eduarda', 'Ícaro', 'Zé', 'Lívia', 'Ântonio', 'Kauã', "D'Ávila", 'Ana & Bia <teste>',
         'Pedro "Pepe"', 'Gabriela', 'Ômega', 'Çá']
SOBRENOMES = ['da Silva', 'Souza Santos', 'Oliveira', 'de Campos Andrade Lima', 'Fernandes', 'Ü', 'Prado Neto']

def casos(qtd, rnd):
    D = fichas.dados()
    out = []
    for ano in fichas.ORDEM_ANO:                         # modelo de cada ano: completo, só LP, só MAT
        e = fichas.exemplo(ano, D)
        out += [e, {**e, 'MAT': []}, {**e, 'LP': []}]
    for i in range(qtd):
        ano = rnd.choice(fichas.ORDEM_ANO)
        nome = ' '.join([rnd.choice(NOMES)] + rnd.sample(SOBRENOMES, rnd.randint(0, 3)))
        rec = dict(nome='  ' + nome + ' ', ano=ano, turma=rnd.choice('ABCD'), rm=str(rnd.randint(1, 999999)))
        modo = rnd.choice(['ambos', 'ambos', 'LP', 'MAT'])
        for k in ('LP', 'MAT'):
            nk = len(D[ano]['descritores'][k])
            peso = rnd.choice([(1, 1, 1), (10, 1, 1), (1, 1, 10), (1, 10, 1)])
            rec[k] = rnd.choices(['✓', '~', '!'], weights=peso, k=nk) if modo in ('ambos', k) else []
        out.append(rec)
    return out

if __name__ == '__main__':
    saida = sys.argv[1]
    qtd = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    D = fichas.dados()
    res = []
    for rec in casos(qtd, random.Random(2026)):
        f = fichas.normalizar(rec, D)
        res.append({'rec': rec, 'html': render.build_html(gen.ficha_pages(f))})
    json.dump(res, open(saida, 'w'), ensure_ascii=False)
    print(f'{len(res)} casos gravados em {saida}')
