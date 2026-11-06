# Legibilidade e Refinamento Visual: Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: implementar com `frontend-design:frontend-design`, tarefa a tarefa, seguindo `superpowers:executing-plans` (ou `superpowers:subagent-driven-development`). Passos usam checkbox (`- [ ]`).

**Objetivo:** tornar o dashboard legível (base 16px, nada abaixo de 12px, contraste WCAG AA) sem mudar identidade, layout funcional ou comportamento.

**Arquitetura:** criar tokens de design no `:root` de `src/styles.css` (tipografia em `rem`, pesos, entrelinhas, cores de texto/superfície/status/gráfico, espaçamento) e migrar os 5 CSS carregados para usá-los. Um teste estático em Node (`tests/design-tokens.test.cjs`) trava as regras: tamanho mínimo, uso de tokens e contraste. Um script Playwright gera prints de antes e depois.

**Stack:** React 19 + Vite 6, CSS puro (sem pré-processador), `node --test`, Playwright via `PLAYWRIGHT_MODULE` (mesmo padrão de `tests/browser-parity.cjs`).

**Spec:** decisões do grilling de 2026-11-05, registradas abaixo em "Decisões" (não há documento separado).

## Decisões (spec)

1. Escopo (b): tipografia, contraste, espaçamento e tokens de cor. Layout e funções não mudam.
2. Identidade mantida: navy `#193b53`, fonte Inter, fundo creme `#f5f5f0`.
3. Base 16px; tabelas e corpo entre 14 e 16px; **mínimo absoluto de 12px**; escala de 7 níveis em `rem`.
4. Densidade menor é aceitável: tabelas com rolagem horizontal e grades que se reorganizam. Nada de espremer o conteúdo.
5. Contraste AA: texto ≥ 4,5:1; ícones e marcas de gráfico ≥ 3:1.
6. Tokens de cor e escala de espaçamento substituem os valores espalhados pelo código.
7. Consolidar breakpoints e seletores duplicados **só onde a tarefa já mexer**.
8. Fora do escopo: modo escuro, PDF (`src/features/documents/pdf.ts`), blocos `@media print`, reorganização ampla dos arquivos.
9. Verificação: prints antes/depois em 1440px e 390px de cada tela, mais `npm run check` e `test:parity`.

## Global Constraints

- CSS carregado (o escopo das regras): `src/styles.css`, `src/app-workspace.css`, `src/components/workspace.css`, `src/components/charts.css`, `src/components/document-actions.css`.
- `src/components/modules.css` **não é importado em lugar nenhum** (confirmado via grep): é código morto, tratado na Tarefa 2.
- Escala tipográfica (valores exatos):
  `--fs-2xs: 0.75rem` (12) · `--fs-xs: 0.8125rem` (13) · `--fs-sm: 0.875rem` (14) · `--fs-md: 1rem` (16) · `--fs-lg: 1.25rem` (20) · `--fs-xl: 1.5rem` (24) · `--fs-2xl: 2rem` (32).
- Conversão de px antigo para token: `<9` → `2xs`; `9–10.5` → `xs`; `11–12` → `sm`; `13–15` → `md`; `16–19` → `lg`; `20–23` → `xl`; `≥26` → `2xl`. `clamp(19px,1.8vw,26px)` → `clamp(var(--fs-lg), 1.8vw, var(--fs-2xl))`. Se a conversão quebrar uma hierarquia visível (por exemplo, rótulo do mesmo tamanho do valor), suba um nível no elemento mais importante; nunca desça abaixo de `2xs`.
- Pesos: `--fw-regular: 400` · `--fw-medium: 500` · `--fw-semibold: 600` · `--fw-bold: 700`. Mapeamento: 450→500, 550→600, 650→600, 750→700, 800→700. O `@import` do Google Fonts passa a pedir só `400;500;600;700`.
- Entrelinha: `--lh-tight: 1.2` · `--lh-snug: 1.35` · `--lh-body: 1.5`. Valores 1.6–1.9 viram `--lh-body`.
- Cores de texto: `--text-strong: #183047` · `--text-secondary: #495967` · `--text-muted: #5a6670`.
- Superfícies: `--surface-page: #f5f5f0` · `--surface-card: #ffffff` · `--surface-subtle: #edf1f5`. Bordas: `--border: #eaece9` · `--border-strong: #c8cfcc`.
- Status (texto): `--success-text: #2f7566` · `--danger-text: #a33a33` · `--warning-text: #8a5a1c` · `--info-text: #3a6d8c` · `--accent-text: #9b4f72`.
- Gráficos e ícones (≥ 3:1 sobre o card): `--chart-blue: #5c8ead` · `--chart-mint: #3f8a79` · `--chart-rose: #b0708f` · `--chart-gold: #a8742f` · `--navy: #193b53`. Os antigos `--blue`, `--mint`, `--rose`, `--muted` e `--line` viram aliases desses tokens, para não quebrar referências.
- Espaçamento: `--space-1: 0.25rem` · `--space-2: 0.5rem` · `--space-3: 0.75rem` · `--space-4: 1rem` · `--space-5: 1.5rem` · `--space-6: 2rem` · `--space-7: 3rem`.
- Breakpoints canônicos (media queries não aceitam variáveis; registrar num comentário no topo de `styles.css`): `600px`, `900px`, `1200px`, `min-width: 1500px`. Mapeamento: 640/650→600, 960→900, 1100/1190→1200.
- `html { font-size: 100%; }`, e `:root` deixa de ter `font-size: 12px`.
- Não alterar `.tsx` salvo onde a tarefa disser. Não alterar `pdf.ts`, `print.ts`, `printHtml.ts` nem conteúdo de `@media print`.
- Mensagens de commit em português, no estilo `style(design): …`.

## Review Focus

1. **Tabelas largas no celular (390px)**: com fonte maior, as colunas estouram. Esperado: o wrapper da tabela rola na horizontal e a página nunca rola na horizontal. Coberto pela asserção `scrollWidth <= innerWidth` do script de prints (Tarefa 1) nas duas larguras.
2. **Números grandes nos cards de indicadores** (por exemplo, "R$ 12.345.678,90"): com `--fs-xl`/`2xl` podem quebrar ou vazar. Esperado: o valor cabe no card, com `font-variant-numeric: tabular-nums` e `overflow-wrap: anywhere` como último recurso. Asserção na Tarefa 3 (nenhum `.kpi-card` com `scrollWidth > clientWidth`).
3. **Eixos e rótulos de gráfico SVG** usam `font-size` em CSS sobre `<text>`, com posição calculada em px (`y + 3`, `height - 7`). Fonte maior desalinha ou corta. Esperado: rótulos visíveis e dentro do `viewBox`. Ajuste dos offsets em `Charts.tsx` e verificação no print (Tarefa 4).
4. **Zoom ou fonte do navegador em 125%**: com `rem`, tudo escala. Esperado: sem sobreposição no menu lateral e nos filtros. O script de prints tem um modo `--font-scale=1.25` (Tarefa 1), verificado na Tarefa 7.
5. **Texto colorido de status sobre fundos tingidos** (chips em `#eaf6ef`, `#f3effb`): o contraste é medido contra o fundo real, não contra o branco. Esperado: ≥ 4,5:1. O teste de contraste inclui esses pares (Tarefa 2).

---

### Tarefa 1: Script de prints e baseline "antes"

**Arquivos:**
- Criar: `tests/visual-capture.cjs`
- Modificar: `package.json` (script `"capture": "node tests/visual-capture.cjs"`)
- Criar (sem commit): `docs/plans/capturas/antes/*.png`. **Adicionar** `docs/plans/capturas/` ao `.gitignore`.

**Interfaces:**
- Produz: `node tests/visual-capture.cjs <dist> <saida> [--font-scale=1.25]`. Para cada view de `views` (mesma lista de `browser-parity.cjs`: overview, delinquency, collection, negotiation, active-debt, protest, payments, demands, reports, settings) e para o diálogo de detalhe do primeiro registro de `#demands`, em viewports `1440x900` e `390x844`, salva `<saida>/<view>-<largura>.png` (full page). Também verifica `document.documentElement.scrollWidth <= window.innerWidth`, falhando com o nome da view. Com `--font-scale`, aplica `document.documentElement.style.fontSize = (scale*100)+'%'`.

- [ ] **Passo 1:** escrever o script reaproveitando `serve()` e `openView()` de `browser-parity.cjs` (copiar; não extrair módulo).
- [ ] **Passo 2:** gerar o baseline no estado atual. Rodar `npm run build && cp -r dist /tmp/dist-antes && PLAYWRIGHT_MODULE=$(ls -d ~/.npm/_npx/*/node_modules/playwright | head -1) npm run capture -- dist docs/plans/capturas/antes`. Esperado: 22 PNGs. Falhas de `scrollWidth` neste passo são **apenas registradas** (são o baseline) e listadas no commit.
- [ ] **Passo 3:** commit `test(design): script de captura visual por view e viewport`.

### Tarefa 2: Tokens, base 16px e teste de regras de design

**Arquivos:**
- Criar: `tests/design-tokens.test.cjs`
- Modificar: `package.json` (`"test": "node --test tests/domain.test.cjs tests/design-tokens.test.cjs"`)
- Modificar: `src/styles.css:1-23` (import de fontes, `:root`, `html`)
- Remover: `src/components/modules.css` (código morto; ver Global Constraints)

**Interfaces:**
- Produz: todos os tokens listados em Global Constraints, no `:root` de `src/styles.css`. O teste exporta `const LOADED_CSS` (lista dos 5 arquivos) e um helper `contrast(hexA, hexB): number`, usados nas tarefas seguintes ao acrescentar asserções.

- [ ] **Passo 1: escrever os testes que falham.**

```js
test('root define a escala tipográfica exata', () => {
  assert.deepEqual(rootTokens(/^--fs-/), { '--fs-2xs':'0.75rem','--fs-xs':'0.8125rem','--fs-sm':'0.875rem','--fs-md':'1rem','--fs-lg':'1.25rem','--fs-xl':'1.5rem','--fs-2xl':'2rem' });
});
test('root não fixa font-size em px', () => assert.doesNotMatch(rootBlock(), /font-size:\s*\d+px/));
test('pares de texto atingem 4.5:1', () => {
  for (const [fg, bg] of TEXT_PAIRS) assert.ok(contrast(tok(fg), tok(bg)) >= 4.5, `${fg} sobre ${bg}`);
});
test('marcas de gráfico atingem 3:1 sobre o card', () => {
  for (const t of ['--chart-blue','--chart-mint','--chart-rose','--chart-gold','--navy']) assert.ok(contrast(tok(t), tok('--surface-card')) >= 3, t);
});
test('modules.css não existe', () => assert.equal(fs.existsSync('src/components/modules.css'), false));
```

`TEXT_PAIRS`: cada um de `--text-strong`, `--text-secondary`, `--text-muted`, `--success-text`, `--danger-text`, `--warning-text`, `--info-text`, `--accent-text` contra `--surface-page`, `--surface-card`, `--surface-subtle`, mais os literais de fundo de chip `#eaf6ef` e `#f3effb` (Review Focus 5). `rootBlock()` e `tok()` leem o primeiro `:root { … }` de `src/styles.css` por regex.

- [ ] **Passo 2:** rodar `npm test`. Esperado: FAIL nos 5 testes novos.
- [ ] **Passo 3:** implementar os tokens no `:root`, `html { font-size: 100% }`, `body { color: var(--text-strong); background: var(--surface-page); line-height: var(--lh-body) }`, os aliases `--blue/--mint/--rose/--muted/--line`, o comentário de breakpoints, o import de fontes com 4 pesos e a remoção de `modules.css`.
- [ ] **Passo 4:** rodar `npm run check`. Esperado: PASS (32 + 5 testes).
- [ ] **Passo 5:** commit `style(design): tokens de tipografia, cor e espaçamento; base 16px`.

### Tarefa 3: Migrar a tipografia de `styles.css` e `app-workspace.css` (shell, cards, filtros)

**Arquivos:**
- Modificar: `src/styles.css`, `src/app-workspace.css`
- Modificar: `tests/design-tokens.test.cjs`, `tests/visual-capture.cjs`

- [ ] **Passo 1: teste que falha**, parametrizado por arquivo (os próximos arquivos entram na lista nas Tarefas 4 e 5):

```js
const TYPO_MIGRATED = ['src/styles.css', 'src/app-workspace.css'];
test('font-size usa tokens, fora de @media print', () => {
  for (const f of TYPO_MIGRATED) for (const v of fontSizes(stripPrint(read(f))))
    assert.match(v, /^(var\(--fs-[a-z0-9]+\)|clamp\(var\(--fs-.+\)|inherit)$/, `${f}: ${v}`);
});
test('font-weight usa tokens', () => { /* idem com /^var\(--fw-/ ou inherit */ });
```

`stripPrint` remove os blocos `@media print { … }` com contagem de chaves.
- [ ] **Passo 2:** `npm test`. Esperado: FAIL listando os valores em px.
- [ ] **Passo 3:** substituir todo `font-size`, `font-weight` e `line-height` dos dois arquivos seguindo os mapeamentos. Nos seletores tocados: unificar breakpoints para os canônicos e fundir regras duplicadas do mesmo seletor no mesmo arquivo quando forem adjacentes ao trecho editado. Nos cards de indicador: `font-variant-numeric: tabular-nums` no valor. Paddings e gaps tocados usam `--space-*`.
- [ ] **Passo 4:** no `visual-capture.cjs`, acrescentar a verificação "nenhum `.kpi-card` com `scrollWidth > clientWidth`" (Review Focus 2).
- [ ] **Passo 5:** `npm run check`, depois `npm run build`, depois a captura em `docs/plans/capturas/depois`. Esperado: testes PASS, sem estouro horizontal em overview, delinquency e settings a 390px. Comparar visualmente com `antes/`.
- [ ] **Passo 6:** commit `style(design): tipografia do shell, cards e filtros em tokens`.

### Tarefa 4: Migrar `workspace.css` (tabelas, grupos, diálogo de registro)

**Arquivos:** modificar `src/components/workspace.css` e `tests/design-tokens.test.cjs` (acrescentar o arquivo a `TYPO_MIGRATED`).

- [ ] **Passo 1:** acrescentar o arquivo à lista e rodar `npm test`. Esperado: FAIL.
- [ ] **Passo 2:** migrar como na Tarefa 3. Corpo de tabela em `--fs-sm`, cabeçalho em `--fs-xs` com `--fw-semibold`, ID de linha (`.ws-row-id`) em `--fs-sm` tabular. O contêiner de `.ws-table` e `.table-records` ganha `overflow-x: auto` e as células `white-space: nowrap` só nas colunas de valor e data.
- [ ] **Passo 3:** `npm run check`, build, captura. Esperado: PASS; nas views demands, collection, negotiation, active-debt, protest e payments a 390px, a tabela rola e a página não.
- [ ] **Passo 4:** commit `style(design): tabelas e workspace legíveis com rolagem horizontal`.

### Tarefa 5: Gráficos e ações de documento (`charts.css`, `document-actions.css`, `Charts.tsx`)

**Arquivos:** modificar `src/components/charts.css`, `src/components/document-actions.css`, `src/components/Charts.tsx:123-135` e `tests/design-tokens.test.cjs`.

- [ ] **Passo 1:** acrescentar os dois CSS a `TYPO_MIGRATED`, mais o teste `fill de texto de gráfico usa token` (`.chart-axis`, `.chart-month` têm `fill: var(--text-muted)`). `npm test`: FAIL.
- [ ] **Passo 2:** eixos e meses em `--fs-2xs`; tooltip em `--fs-sm`/título `--fs-md`. Em `Charts.tsx`, trocar os offsets fixos `+ 3` e `height - 7` por constantes nomeadas `AXIS_LABEL_DY = 4` e `MONTH_LABEL_OFFSET = 4`, e garantir margem inferior/esquerda suficiente para texto de 12px (aumentar `left` e o padding inferior conforme o que for medido no print). Cores de série passam a `--chart-*`.
- [ ] **Passo 3:** `npm run check`, build, captura. Esperado: PASS; rótulos dos eixos inteiros e legíveis em overview e reports (Review Focus 3).
- [ ] **Passo 4:** commit `style(design): gráficos e ações de documento com tipografia e cores acessíveis`.

### Tarefa 6: Cores de texto em tokens (todos os CSS carregados)

**Arquivos:** modificar os 5 CSS carregados e `tests/design-tokens.test.cjs`.

- [ ] **Passo 1: teste que falha.** Em `LOADED_CSS`, fora de `:root` e de `@media print`, toda declaração `color:` deve ser `var(--…)`, `inherit`, `currentColor` ou `#fff`/`white` (este último só é permitido onde o fundo for `--navy` ou uma cor de status escura; registrar a lista de seletores permitidos no próprio teste). Hoje são 318 valores distintos. `npm test`: FAIL.
- [ ] **Passo 2:** mapear cada cor literal para o token mais próximo por papel: título → `--text-strong`; corpo/secundário → `--text-secondary`; legenda/meta → `--text-muted`; verdes → `--success-text`; vermelhos/rosas de alerta → `--danger-text` ou `--accent-text`; dourados → `--warning-text`; azuis de link/info → `--info-text`. Fundos e bordas tocados passam a `--surface-*`/`--border*` quando forem equivalentes visualmente (diferença ≤ 3 em cada canal RGB); os demais ficam como estão (fora do escopo).
- [ ] **Passo 3:** `npm run check`, build, captura. Esperado: PASS; nas capturas, a hierarquia de cor está preservada e os textos claros (`#9aabb9`, `#7892a3`) sumiram.
- [ ] **Passo 4:** commit `style(design): cores de texto via tokens com contraste AA`.

### Tarefa 7: Verificação final

- [ ] **Passo 1:** `npm run check`. Esperado: todos os testes PASS.
- [ ] **Passo 2:** `npm run build && PLAYWRIGHT_MODULE=… npm run test:parity -- /tmp/dist-antes dist`. Esperado: PASS. Os comportamentos são idênticos; só o visual mudou.
- [ ] **Passo 3:** captura com `--font-scale=1.25` em `docs/plans/capturas/zoom125`. Esperado: sem estouro horizontal e sem sobreposição no menu e nos filtros (Review Focus 4).
- [ ] **Passo 4:** auditoria no navegador: em cada view a 1440px, `[...document.querySelectorAll('body *')].filter(e => e.childNodes[0]?.nodeType === 3 && e.offsetParent).map(e => parseFloat(getComputedStyle(e).fontSize))` não tem valor menor que 12. Registrar o resultado no PR.
- [ ] **Passo 5:** montar a comparação antes/depois para o usuário (pares de prints por view) e só então propor merge com `superpowers:finishing-a-development-branch`.
