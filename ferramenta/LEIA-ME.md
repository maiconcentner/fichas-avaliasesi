# Ferramenta de fichas AvaliaSESI-SP (CE 026 Jaú)

Gera a ficha de estudos (2 páginas A4 paisagem) idêntica à da coordenação, para alunos que não estão no relatório oficial
ou que têm só LP ou só MAT. Testada contra os 884 alunos do relatório oficial: texto idêntico em todas as 1768 páginas e
diferença de pixels abaixo de 1% (só suavização de bordas).

## Pastas
- `fichas.py`: comando principal (`gerar`, `conferir`, `modelos`).
- `gen.py`, `render.py`, `to_pdf.py`: motor que desenha a ficha (HTML para PDF com Chromium).
- `docx_ficha.py`: gera o .docx editável a partir do modelo da coordenação.
- `data/dados_por_ano.json`: conteúdos, dicas e rotina de cada ano.
- `data/templates.json`: layout de cada ano, copiado do relatório oficial.
- `data/alunos_oficiais.json`: os 884 alunos oficiais (usado para avisar se o aluno já consta). **Não fica no GitHub**
  (dados reais); existe só na pasta do Mac. Sem ele a ferramenta gera normalmente, só não faz esse aviso.
- `data/docx_modelo/`: .docx e ícones da coordenação.
- `fonts/`: Bricolage Grotesque, Inter, IBM Plex Mono, Consolas.
- `verify.py`, `extract_*.py`, `fit_templates.py`, `build_year_data.py`, `calibrate.py`, `refit.py`: reconstrução e testes.

## Uso (precisa de Python com playwright + chromium, openpyxl e python-docx)
    python3 fichas.py modelos -o modelos_fichas
    python3 fichas.py conferir  alunos.xlsx
    python3 fichas.py gerar     alunos.xlsx -o saida --docx            # .docx só dos parciais (use --docx todos para todos)
    python3 fichas.py gerar     alunos.json -o saida --individual      # também um PDF por aluno

Saída: `fichas_geradas.pdf`, `alunos_editavel.xlsx` (preencha o que falta e gere de novo), `editaveis_docx/`.

## Regra das situações
Acertou todas as questões do conteúdo = ✓ (Você domina). Acertou parte = ~ (Quase lá). Nenhuma = ! (Comece por aqui).
