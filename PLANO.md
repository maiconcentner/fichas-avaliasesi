# Plano: gerador de fichas AvaliaSESI no navegador

Objetivo: levar para uma página web o que hoje a skill `fichas-avaliasesi` faz com Python
(`fichas.py`, `gen.py`, `render.py`, `to_pdf.py`, `docx_ficha.py`). O professor abre o site,
informa turma e alunos, marca os resultados e baixa as fichas no mesmo modelo da coordenação
(Mapa de Estudos AvaliaSESI-SP, CE 026 Jaú, 2 páginas A4 paisagem por aluno).

## 1. Princípios

- **Tudo roda no navegador.** Sem servidor, sem login, sem banco de dados. O site fica no
  GitHub Pages e é só HTML, CSS e JavaScript.
- **Dados de aluno nunca saem do computador do professor.** Nome, RM e resultados ficam na
  memória da página e no armazenamento local do navegador. Nada é enviado para lugar nenhum
  (LGPD). O repositório é público, então nele vão só código, modelos e textos dos descritores,
  nunca relatórios oficiais nem planilhas com alunos reais.
- **Fidelidade igual à da skill.** A ficha é desenhada com o mesmo HTML/CSS que o `render.py`
  usa hoje e impressa pelo próprio Chrome, que é o mesmo motor que o Playwright usa para gerar
  o PDF. O resultado deve sair igual ao atual.
- **Simples de manter.** Sem etapa de build: arquivos estáticos, bibliotecas copiadas para
  `vendor/`. Dá para editar um texto de dica direto no GitHub.

## 2. Fluxo da página (4 passos)

### Passo 1. Dados comuns do lote (informações repetidas)
Preenchidos uma vez e aplicados a todos os alunos do lote:
- Escola (padrão: CE 026 Jaú, editável e lembrado pelo navegador)
- Ano/série: lista com os anos que existem em `dados_por_ano.json` (9º EF, 1º EM, 2º EM...)
- Turma: A, B, C (lista, com opção "outra")
- Edição/etapa e data (se aparecerem na ficha)
- **Componentes**: `LP + MAT` (padrão original), `Só LP` ou `Só MAT`
- Professor responsável (opcional, se aparecer na ficha)

Cada campo tem um botão "variar por aluno": se o lote mistura turmas, por exemplo, a coluna
Turma aparece na tabela de alunos em vez de ficar fixa.

### Passo 2. Alunos
Três jeitos de entrar, que podem ser combinados:
1. **Colar lista**: o professor copia do Excel/diário a coluna de nomes (e RM, se tiver) e cola
   numa caixa. A página separa por linha e por tabulação.
2. **Digitar na tabela**: linha nova com Enter, apagar, reordenar.
3. **Subir planilha** preenchida (ver seção 4).

Validações: RM numérico e sem repetir, nome não vazio, aviso de nome com espaço extra.
A saudação "Oi, <primeiro nome>!" aparece ao lado para conferir.

### Passo 3. Resultados
Uma grade por componente: **linhas = alunos, colunas = conteúdos do ano** (na ordem oficial de
`descritores`). O cabeçalho mostra o código e, ao passar o mouse, o texto do conteúdo.

Em cada célula o professor escolhe a situação:
- clique alterna `✓` Você domina → `~` Quase lá → `!` Comece por aqui → vazio;
- teclado: `1`/`2`/`3` ou `v`/`q`/`c`, setas para andar, igual planilha;
- ou modo "acertos": digita `2/3` e a página converte pela regra da skill
  (todas = ✓, parte = ~, nenhuma = !).

Atalhos para o que se repete:
- preencher a coluna inteira (um conteúdo para todos) ou a linha inteira (um aluno);
- colar um bloco copiado do Excel direto na grade;
- copiar resultados de um aluno para outro.

Componente sem nenhum dado vira ficha parcial, como hoje (mostra "0 conteúdos avaliados" e o
cartão de dicas genérico). A página mostra um selo "parcial" ao lado do aluno.

### Passo 4. Prévia e geração
- Prévia ao vivo da ficha do aluno selecionado (as 2 páginas), atualizando a cada clique.
- Painel de conferência (o atual `fichas.py conferir`): contagem de conteúdos, alunos parciais,
  RMs repetidos, células vazias.
- Botões de saída:
  - **PDF de todos** (ordenado por ano, turma e nome, 2 páginas por aluno);
  - **PDF de um aluno**;
  - **Planilha editável** (.xlsx, linhas amarelas onde falta preencher), igual à `alunos_editavel.xlsx`;
  - **Word (.docx)** no modelo da coordenação, para os parciais ou para todos;
  - **Salvar projeto** (.json) para continuar depois ou em outro computador.

## 3. Como o PDF é gerado no navegador

Opção escolhida para a primeira versão: **impressão do navegador**.
A página monta todas as fichas num documento oculto com `@page { size: A4 landscape; margin: 0 }`
e chama a janela de impressão; o professor escolhe "Salvar como PDF". Vantagens: texto
vetorial, mesmas fontes, mesmo motor do Playwright, zero dependência. Recomendado usar
Chrome ou Edge (o Safari às vezes ignora margens e fundos; a página avisa).

Para "um PDF por aluno" em lote (um .zip com 30 arquivos), a impressão não serve. Isso fica
para a fase 3, com `pdf-lib`/`jsPDF` desenhando a partir do SVG da ficha, e só se for preciso.
Na maioria dos casos o PDF único já resolve.

## 4. Planilha modelo (baixar, preencher, subir)

A página gera a planilha **já com os conteúdos do ano escolhido**, então ela sempre bate com a
ficha. Feita com ExcelJS, que permite listas suspensas.

Formato proposto (largo, mais prático para o professor):

| Nome | RM | Turma | LP-01 | LP-02 | ... | MAT-01 | ... |
|------|----|-------|-------|-------|-----|--------|-----|

- Linha 1: códigos; linha 2: texto curto do conteúdo; uma aba "Instruções" com a legenda.
- Células de situação com lista suspensa `✓ ~ !` (aceita também `2/3`).
- Se o lote é só LP ou só MAT, a planilha só traz as colunas daquele componente.
- Campos comuns (escola, ano, turma) numa aba "Lote", preenchidos com o que estava no passo 1.

Ao subir, a página também aceita o formato antigo `modelo_planilha_entrada.xlsx` (uma linha por
conteúdo) e a `alunos_editavel.xlsx` gerada antes, para não perder o que já existe.
Depois do upload, tudo cai na grade do passo 3 para conferir antes de gerar.

## 5. Arquivos que vêm da pasta `ferramenta_fichas`

O motor Python fica em `ferramenta/`, com a mesma estrutura da pasta do Mac. A página lê
direto `ferramenta/data/` e `ferramenta/fonts/`, sem copiar.

| Hoje (Python) | No site |
|---|---|
| `data/dados_por_ano.json` | lido pela página (conteúdos, dicas, rotina) |
| `data/templates.json` | lido pela página (layout de cada ano, 1,2 MB) |
| `data/baseline_offsets.json` | lido pela página (ajuste fino das fontes) |
| `render.py` + `gen.py` (HTML da ficha) | `js/render.js` (portado linha a linha; mesmo HTML/CSS) |
| `fonts/` | servidas pela página (4 são OFL; a seta da Consolas precisa ser trocada) |
| `to_pdf.py` | impressão do navegador (`css/print.css`) |
| `fichas.py conferir` | `js/conferir.js` |
| `fichas.py gerar` (xlsx) | `js/planilha.js` com ExcelJS |
| `docx_ficha.py` + `data/docx_modelo/` | `js/docx.js` com JSZip editando o XML do modelo |
| `verify.py` | teste local com Playwright (fora do site; usa PDFs oficiais que **não** sobem) |

Estrutura do repositório:

```
index.html                 página (fase 1 em diante)
css/  app.css  print.css
js/   app.js  estado.js  render.js  conferir.js  planilha.js  docx.js
vendor/ exceljs.min.js  jszip.min.js
tests/                     compara o HTML do site com o do Python
ferramenta/                motor Python (referência e uso no Mac)
  data/  dados_por_ano.json  templates.json  baseline_offsets.json  docx_modelo/
  fonts/
modelos_fichas/            modelo por ano (PDF/DOCX) e planilha de entrada
.github/workflows/pages.yml
```

Teste de fidelidade sem dados reais: para cada ano, gerar a ficha de um aluno fictício
(completa, só LP, só MAT) no Python e no site e exigir HTML idêntico. Como o Python já foi
validado contra os 884 oficiais, HTML igual garante PDF igual.

## 6. Fases

1. **Base**: trazer `dados_por_ano.json`, fontes e o HTML do `render.py`; página que mostra a
   ficha de um aluno de exemplo idêntica à do Python. Comparar pixel a pixel com o PDF da skill
   para um aluno fictício completo e um parcial.
2. **Ferramenta completa**: passos 1 a 4, salvamento automático, PDF por impressão,
   planilha modelo para baixar e subir, xlsx editável. Publicar no GitHub Pages.
3. **Extras**: .docx no modelo da coordenação, zip com um PDF por aluno, importar direto a
   planilha exportada do AvaliaSESI (se o formato for estável).

## 7. Situação

- [x] Código, dados, fontes e modelos no repositório, organizados em `ferramenta/` e `modelos_fichas/`.
- [x] Dados reais removidos: `alunos_oficiais.json` fora do repositório; `templates.json` anonimizado
  (saída idêntica nos 10 anos, completa, só LP e só MAT).
- [ ] Trocar `Consolas-arrow.ttf` (fonte da Microsoft, uma seta só) por uma seta livre antes de publicar.
- [ ] Fase 1.

Observações do código que mudam o plano:
- O cabeçalho da ficha tem a escola fixa ("CE 026 - Jaú"). Os campos que variam são nome, ano,
  turma e RM. Escola fica como configuração (padrão CE 026 Jaú).
- Anos com modelo: 3º a 9º EF e 1º a 3º EM. Ano novo ou lista de conteúdos diferente exige
  reconstruir `templates.json` no Mac com o relatório oficial.
