# CREFITO-11 · NegociaFácil

Protótipo de consulta operacional e gerencial em React, TypeScript e CSS, baseado na identidade visual fornecida pelo CREFITO-11. Demonstra a navegação e as regras de apresentação do briefing atualizado. **Não está conectado ao SISCAF, ao CRA21 ou a uma base institucional.**

## Executar e compilar

Requer Node.js compatível com Vite 6 e npm. No diretório do projeto:

```sh
npm install
npm run dev
```

Para compilar e conferir a aplicação estática:

```sh
npm run build
npm run preview
```

O terminal informa o endereço local. O build é gerado em `dist`. A demonstração não precisa de um servidor de negócio. A configuração de hospedagem existente fica em `.openai/hosting.json`; publicar o build não conecta dados nem habilita operações oficiais.

## Verificações

- Use `npm run check` para rodar TypeScript e os testes de domínio, documentos, navegação e relatórios.
- Use `npm run build` para gerar o build de produção.

Para comparar a interface com a versão original, gere o build das duas versões. Disponibilize o Playwright em um ambiente de testes e instale o Chromium do Playwright ou aponte `CHROME_PATH` para um executável Chrome/Chromium. Se o Playwright estiver fora do projeto, aponte `PLAYWRIGHT_MODULE` para o módulo instalado. Execute na raiz do projeto refatorado:

```sh
npm run test:parity -- /caminho/para/dist-original
```

O teste opcional usa o build refatorado em `dist` por padrão. Ele compara as dez abas em duas larguras e exercita filtros, navegação, tabelas, modais, perfis e documentos nas duas versões.

## Telas e interações

- **Visão Geral:** indicadores, evolução, distribuição da carteira e ações que exigem atenção.
- **Inadimplência:** débitos, exercício, vencimento, saldo, estado e vínculos com processos.
- **Cobrança:** campanhas, casos, notificações e medidas posteriores aplicáveis.
- **Negociação:** acordos e parcelas; formalização e pagamento da primeira parcela separados.
- **Dívida Ativa:** inscrições, termos, envio, prazos, CDA e situação do processo.
- **Protesto:** títulos, cartório, protocolo, remessa e retorno; regularização financeira e cartorial distintas.
- **Pagamentos:** valores informados e confirmados, conciliação, baixa, origem e meio.
- **Demandas:** estado, etapa, prioridade, responsável, próxima ação ou espera, prazo, alertas, vínculos e histórico.
- **Relatórios:** documentos gerenciais e específicos do domínio, impressão e download de PDF.
- **Configurações:** perfis, parâmetros e informações de integração da demonstração.

As tabelas oferecem pesquisa, paginação e detalhamento. Período e exercício são recortes distintos. Estado do processo, etapa, prioridade e alertas são conceitos separados; a regularização de um débito não encerra automaticamente uma demanda ou uma pendência cartorial.

## Dados, perfis e datas

Pessoas, identificadores, valores, protocolos, responsáveis e movimentos são fictícios. Os perfis demonstrativos de equipe, chefia e gestão verificam a apresentação e o recorte sobre o mesmo modelo. **Não constituem autenticação ou autorização de produção.** A proteção real deverá ocorrer no backend, além das restrições da interface.

O protótipo é de consulta. Não cadastra demandas oficiais, edita acordos, envia notificações/remessas, cancela protestos ou efetua baixas. Configurações locais não substituem usuários, permissões ou parâmetros institucionais.

A data-base é diferente da geração de um documento e da atualização visual. Vencimento financeiro, prazo de ação e datas de eventos têm funções próprias. Metas, fórmulas, prazos e classificações pendentes de homologação continuam identificados como tal; a demonstração não os torna oficiais. Regional/UF depende de validação no escopo definitivo.

## Relatórios, impressão e PDF

Não existe central de exportação de carteira. Não são oferecidos CSV, XLS, XLSX, JSON de dados ou formatos equivalentes para extrair uma base de trabalho. PDF e impressão servem à consulta, análise e apresentação, dentro do domínio e do recorte autorizado. O detalhamento no dashboard permanece conforme o perfil.

O documento usa a seleção **antes da paginação**, incluindo a pesquisa. O motor reaplica filtros e autorização demonstrativa sem ampliar os registros recebidos. PDF e impressão compartilham snapshot imutável, identificadores, quantidades, valores em centavos e metadados. As colunas detalhadas são próprias de cada domínio; uma seleção de domínios diferentes permite somente resumo gerencial.

Fichas de processos abertas a partir da seleção preservam os valores calculados naquele recorte, incluindo populações de campanhas. A população de pessoas dos indicadores mantém seu saldo selecionado na lista e no PDF; abrir uma pessoa apresenta sua ficha cadastral e seus vínculos autorizados. Um vínculo autorizado pode levar a um registro fora do recorte original; nesse caso, a ficha e seu documento identificam o escopo individual, preservando a restrição do perfil. Os filtros da seleção não são removidos indiscriminadamente.

O relatório de campanhas preserva o identificador, a população e os resultados de cada campanha. Seus vínculos aparecem como quantidades por tipo de entidade autorizada; os detalhes dos participantes são consultados no dashboard. Isso mantém o documento legível sem reduzir a seleção de campanhas.

O PDF usa texto e tabelas, sem fotografar a tela. A impressão abre um documento A4 independente da página visível. Cabeçalhos, identificação da demonstração e paginação acompanham os documentos. O navegador permite escolher impressora ou salvar em PDF.

Esses documentos **não são relatórios oficiais, comprovantes, CDA ou instrumentos de protesto**. A produção depende de templates, regras, fontes e permissões homologados.

## Integração futura

SISCAF e integrações oficiais continuam sendo a fonte da informação: fonte oficial → adaptador no backend → modelo normalizado de consulta → dashboard. Planilhas não fazem parte permanente dessa arquitetura. Cache e modelo derivado não devem se tornar outro cadastro operacional.

Cada indicador precisa de fonte, identificadores, granularidade, cálculo, filtros aplicáveis, cobertura e regra de atualização. Ausência na documentação de API não comprova ausência no sistema: relatórios e interfaces oficiais precisam ser catalogados e homologados. Não se presumem endpoints.

Credenciais e tokens ficam no servidor, nunca em variáveis `VITE_*`. O backend deverá validar permissões, inclusive nos documentos, e tratar falhas, atraso, carga parcial, dados não homologados e estados sem mapeamento.

Veja [docs/requisitos-implementados.md](docs/requisitos-implementados.md) e [docs/gaps-api.md](docs/gaps-api.md).

## Organização

- `src/App.tsx` conecta a navegação, o contexto da consulta e as telas. Os componentes do painel e o carregamento ficam em `src/app/`.
- `src/components/WorkspaceView.tsx` monta o cabeçalho e a tela selecionada. `src/features/` contém inadimplência, demandas, processos, relatórios, configurações e os componentes reutilizados para listas e fichas.
- `src/domain/` mantém contratos, dados demonstrativos e a API pública das consultas. A [Etapa 1](docs/refatoracao-etapa-1.md) descreve a separação inicial desse domínio.
- `src/documents.ts` oferece a API de documentos. `src/features/documents/` concentra snapshot, colunas, metadados, PDF e impressão. `src/components/DocumentActions.tsx` conecta as ações à interface.
- `src/styles.css`, `src/app-workspace.css` e os estilos dos componentes mantêm a ordem das regras visuais e responsivas.
