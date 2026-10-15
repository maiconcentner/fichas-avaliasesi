# Fichas de estudos AvaliaSESI-SP (CE 026 Jaú)

Gera a ficha de estudos (Mapa de Estudos, 2 páginas A4 paisagem) idêntica à da coordenação,
para alunos que não estão no relatório oficial ou que têm só LP ou só MAT.

**Site:** https://maiconcentner.github.io/fichas-avaliasesi/

## Como usar o site

1. **Dados da turma**: ano, turma e componentes (LP e MAT, só LP ou só MAT). Valem para todos.
2. **Alunos e resultados**:
   - *Colar lista de nomes*: cole do Excel ou do diário (nome e RM na mesma linha).
   - Na grade, clique nas bolinhas ou use o teclado: `1` ✓ Você domina, `2` ~ Quase lá,
     `3` ! Comece por aqui, `Backspace` apaga. As setas andam pela grade.
   - Clique no número do conteúdo para preencher a coluna inteira; no número da linha para
     preencher o aluno inteiro.
   - Dá para colar um bloco copiado do Excel direto na grade.
   - Ou *Baixar planilha* (já vem com os conteúdos do ano), preencher no Excel e *Carregar planilha*.
3. **Conferir e gerar**: a página lista o que falta. *Gerar PDF de todos* abre a janela de
   impressão: escolha **Salvar como PDF** (use Chrome ou Edge).

Componente sem nenhum resultado vira ficha parcial, como no relatório oficial.
Tudo fica salvo só no navegador; *Salvar projeto* guarda um arquivo para continuar em outro computador.

## Pastas

| Pasta | O que tem |
|---|---|
| `index.html`, `css/`, `js/` | O site. `js/motor.js` é o porte do motor Python e gera o mesmo HTML. |
| `vendor/` | ExcelJS 4.4.0 (licença MIT), para as planilhas. |
| `ferramenta/` | Motor original em Python (mesma estrutura da pasta `ferramenta_fichas` do Mac). Ver `ferramenta/LEIA-ME.md`. |
| `ferramenta/data/` | `dados_por_ano.json`, `templates.json`, `baseline_offsets.json`, `docx_modelo/`. Usados pelo Python e pelo site. |
| `ferramenta/fonts/` | Bricolage Grotesque, Inter e IBM Plex Mono (todas com licença livre OFL). |
| `modelos_fichas/` | Um modelo de ficha (PDF e DOCX) por ano, com aluno fictício, e a planilha de entrada do Python. |
| `tests/` | Teste de paridade Python × JavaScript. |

## Teste

    npm test     # gera 430 fichas no Python e no JavaScript e exige HTML idêntico

Precisa de Python 3 e Node. Não usa dados reais.

## Dados de alunos

Este repositório é público. **Não suba nada com aluno real**: relatórios oficiais
(`CE_026_Jau/`), `alunos_oficiais.json`, planilhas preenchidas ou fichas geradas.
O `.gitignore` já bloqueia esses nomes. O `templates.json` foi limpo: o aluno de referência
de cada ano virou "Nome do Estudante", RM 0000, sem mudar em nada a ficha gerada.

O site não envia nada para a internet: os dados digitados ficam no navegador de quem usa.

## Uso pelo Python (Mac)

Precisa de Python com playwright (Chromium), openpyxl e python-docx.

    cd ferramenta
    python3 fichas.py conferir alunos.xlsx
    python3 fichas.py gerar    alunos.xlsx -o saida --docx

A seta "→ ABRA O MAPA" agora é desenhada em SVG (`render.py`), sem a fonte Consolas.
Copie o `render.py` daqui para a pasta do Mac para manter as duas versões iguais.
