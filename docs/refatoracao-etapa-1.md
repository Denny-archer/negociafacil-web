# NegociaFácil — refatoração incremental, etapa 1

## Objetivo

Isolar responsabilidades no domínio demonstrativo sem alterar resultados da interface,
contratos públicos, cenários ou regras de negócio. Esta etapa não integra APIs e não
muda fluxos de autenticação, documentos ou páginas.

## Mapa das alterações

| Arquivo | Responsabilidade |
|---|---|
| `src/domain/defaults.ts` | Filtros e sessão demonstrativa padrão, configuração de inatividade |
| `src/domain/formatters.ts` | Formatação de moeda, números e datas |
| `src/domain/rows.ts` | Conversão de fixtures em linhas normalizadas, vínculos e alertas |
| `src/domain/queries.ts` | Autorização demonstrativa, filtros, consultas e catálogos |
| `src/domain/metrics.ts` | Indicadores e série de recuperação |
| `src/domain/repository.ts` | Fachada pública e implementação do contrato assíncrono do repositório |

`src/domain/index.ts` continua sendo a entrada pública para o código existente.
Os arquivos de componentes continuam importando os mesmos símbolos, sem necessidade
de alteração na interface.

O `package.json` ganhou `npm run typecheck` e `npm run check` para facilitar
as verificações locais e futuras integrações contínuas.

## Verificação realizada

- TypeScript `strict` (`tsc --noEmit -p tsconfig.json`): passou.
- `npm test`: 27 testes passaram.
- `npm run check`: passou com as dependências já disponíveis.
- Build completo do Vite: não validado neste ambiente Linux, pois o ZIP foi criado
  com um `node_modules` de Windows e não contém o binário nativo Linux do Rollup.
  Isso não é diagnóstico de falha do código-fonte. Com uma instalação limpa no
  ambiente do desenvolvedor, executar `npm ci && npm run build`.

## Próximas etapas recomendadas

1. Introduzir testes de comportamento de interface para tabelas, filtros, navegação,
   permissões demonstrativas, abertura de detalhes e geração de documentos.
2. Desmembrar `WorkspaceView.tsx` em componentes dos módulos de demanda,
   relatórios, configurações, tabelas e detalhes, mantendo seus contratos.
3. Separar `documents.ts` em snapshot, modelos de coluna, HTML de impressão e
   geração de PDF. Preservar os testes de documentos e invariantes de centavos.
4. Extrair hooks para navegação, sessão, filtros, dados e diálogos do `App.tsx`.
5. Aplicar formatador e lint padronizados, sem misturar mudanças de estilo com
   alterações de regras de negócio; centralizar tipos duplicados onde fizer sentido.
6. Antes da API oficial, criar adaptadores de backend tipados e testes de contrato.
   Sessão demonstrativa e filtros no cliente não são autorização de produção.

## Atenção antes de publicar

A origem dos dados permanece demonstrativa, e os testes existentes cobrem o domínio,
mas não substituem testes de interface ou validação visual. Não interpretar dados
sintéticos ou permissões do frontend como informações e controles oficiais.
