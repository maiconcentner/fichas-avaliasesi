# Fichas de estudos AvaliaSESI-SP (CE 026 Jaú)

Gera a ficha de estudos (Mapa de Estudos, 2 páginas A4 paisagem) idêntica à da coordenação,
para alunos que não estão no relatório oficial ou que têm só LP ou só MAT.

O objetivo do projeto é levar essa geração para uma página no navegador. O plano está em
[`PLANO.md`](PLANO.md).

## Pastas

| Pasta | O que tem |
|---|---|
| `ferramenta/` | Motor atual em Python (mesma estrutura da pasta `ferramenta_fichas` do Mac). Ver `ferramenta/LEIA-ME.md`. |
| `ferramenta/data/` | `dados_por_ano.json` (conteúdos, dicas e rotina de cada ano), `templates.json` (layout de cada ano), `baseline_offsets.json` (ajuste fino das fontes) e `docx_modelo/` (modelo .docx da coordenação e ícones). |
| `ferramenta/fonts/` | Bricolage Grotesque, Inter, IBM Plex Mono e o recorte da seta da Consolas. |
| `modelos_fichas/` | Um modelo de ficha (PDF e DOCX) por ano, com aluno fictício, e `modelo_planilha_entrada.xlsx`. |

A página web vai ficar na raiz do repositório e ler os mesmos arquivos de `ferramenta/data/`
e `ferramenta/fonts/`, para existir uma fonte só de verdade.

## Dados de alunos

Este repositório é público. **Não suba nada com aluno real**: relatórios oficiais
(`CE_026_Jau/`), `alunos_oficiais.json`, planilhas preenchidas ou fichas geradas.
O `.gitignore` já bloqueia esses nomes. O `templates.json` foi limpo: o aluno de referência
de cada ano virou "Nome do Estudante", RM 0000, sem mudar em nada a ficha gerada.

Sem o `alunos_oficiais.json`, a ferramenta Python funciona normalmente; só deixa de avisar
quando o RM já consta no relatório oficial. Os scripts de reconstrução e teste
(`build_year_data.py`, `fit_templates.py`, `verify.py`) precisam dele e dos PDFs oficiais,
então rodam só no computador do Maicon.

## Uso rápido (Python)

Precisa de Python com playwright (Chromium), openpyxl e python-docx.

    cd ferramenta
    python3 fichas.py conferir alunos.xlsx
    python3 fichas.py gerar    alunos.xlsx -o saida --docx
