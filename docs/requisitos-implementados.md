# Matriz do briefing e implementação

Esta matriz descreve o protótipo de consulta. **Demonstrativo** significa implementação sobre dados fictícios, sem disponibilidade comprovada na fonte oficial. O briefing atualizado e o Notion orientam o comportamento; os números e a régua da imagem inicial não definem regras finais.

## Requisitos transversais

| Requisito | Tratamento no protótipo | Dependência para produção |
| --- | --- | --- |
| Fonte oficial única | Dados demonstrativos e origem identificada | Catalogar fontes SISCAF/CRA21, autorizar acessos e homologar cobertura |
| Pessoa, débito e demanda distintos | Entidades e identificadores próprios, com vínculos | IDs oficiais, relações 1:N, deduplicação e mudanças de identificador |
| Estado, etapa, prioridade e alerta independentes | Apresentação separada; alertas coexistentes | Mapear códigos e nomes originais por domínio; explicitar estados sem mapeamento |
| Processos coexistentes | Acordo, DA, protesto e demanda não se substituem por uma fase global | Vínculos oficiais e cronologia dos processos |
| Período e exercício distintos | Recorte de eventos separado do exercício | Data de competência de cada indicador e comparação |
| Mesma seleção | Contexto compartilhado de filtros, pesquisa e perfil | Escopo imposto no backend, paginação e totais conciliáveis |
| Equipe, chefia e gestão | Perfis demonstrativos sobre o mesmo modelo | Identidade institucional e matriz de módulos, registros, campos e ações |
| Configurações restritas | Parâmetros demonstrativos sem editar processos oficiais | Administração real e auditoria com usuário, instante e alteração |
| Disponibilidade explícita | Identificação da demonstração e das pendências de homologação | Carga parcial, falhas, atraso, tentativas e último sucesso da fonte |
| Sem exportação de base | Sem central ou arquivos CSV/XLS/XLSX/JSON de carteira | Templates documentais e permissões de produção aprovados |
| PDF e impressão | Snapshot imutável, centavos, metadados e seleção antes da paginação | Homologar colunas, fórmulas, fontes e escopo dos documentos |

## Campos e indicadores por domínio

| Domínio | Campos e apresentação | Indicadores/consultas | Validações e lacunas da fonte |
| --- | --- | --- | --- |
| Visão Geral | Contexto, data-base, unidade, origem e regra | Inadimplência, saldo, recuperação, acordos, débitos antigos, protestos, demandas e ações de atenção | Fórmulas, cobertura e histórico; metas após definição institucional |
| Inadimplência | ID do débito, pessoa/registro, exercício, tipo, vencimento, saldo, estado e vínculos | Faixas de valor/antiguidade, pessoa, tipo e processo | Inclusões/exclusões, encargos, data de posição e histórico do saldo |
| Cobrança | Caso/campanha, população inicial, etapa, notificações, envio e medidas | Alcance, negociação, pagamento, conversão, recuperado e restante | Campanhas, eventos de envio, regra de contagem e atribuição da recuperação |
| Negociação | Acordo, formalização, estado original, parcelas e pagamentos vinculados | Formalizados, primeira parcela pendente, vigentes, inadimplidos, concluídos e reincidência | Termo assinado não basta para vigência material; calendário e confirmação oficial |
| Dívida Ativa | Inscrição, termo, geração, envio, prazo, CDA, correções/cancelamento e histórico | Elegíveis, inscritos, termos enviados, prazos e medidas | Marco de envio, elegibilidade, calendário e permissões críticas |
| Protesto | Título, protocolo, cartório, remessa, andamento, código/retorno, motivo e eventos | Confirmados sem retorno, pagos, protestados, devolvidos, cancelados e pendências posteriores | CRA21 oficial; confirmação não é protesto; prazo oficial ou homologado |
| Pagamentos | ID, valor informado/confirmado, meio, origem, conciliação e baixa | Confirmados, não localizados, baixa pendente, divergências e regularização complementar | Comprovante não confirma pagamento; conciliação financeira/cartorial distintas |
| Demandas | ID, categoria/assunto, estado, etapa, prioridade, ação/resultado, próxima ação/espera, responsável, prazo, evidências, vínculos e encerramento | Minhas, setor, hoje, vencidas, futuras, sem responsável/ação, inativas e produtividade | Origem oficial, histórico, usuário/setor e encerramento; sem gravação oficial no protótipo |
| Relatórios | Template, unidade, filtros, pesquisa, origem, data-base, geração e perfil | Consolidados, documentos do domínio, comparações e produtividade | Histórico, fórmulas e permissão por template; sem download genérico de carteira |

## Distinções obrigatórias

- Uma pessoa pode ter DA, acordo, protesto e demanda simultaneamente. Cada processo preserva seu estado e identificador.
- Os 12 estados de apresentação de Demandas do briefing precisam ser mapeados à origem oficial. Demanda aberta exige próxima ação ou justificativa objetiva de espera. Encerramento é explícito; saldo regular não encerra o processo.
- `CONFIRMADO + SEM RETORNO` significa remessa aceita com resultado pendente. `RETORNADO + PROTESTADO` significa protesto efetivo. Devolução e cancelamento preservam motivo e fonte.
- Pagamento confirmado, baixa no SISCAF e regularização cartorial são estados distintos. Comprovante isolado não confirma pagamento.
- Vencimento de débito, prazo de ação, evento, termo gerado, termo enviado e prazo cartorial são campos diferentes. Prazo previsto após envio não começa na geração do termo.
- Data-base da fonte, extração, última tentativa, atualização visual e geração do documento têm significados diferentes.

## Contrato documental

O documento recebe um recorte tipado e seu contexto de consulta. A preparação reaplica filtros e autorização demonstrativa sem ampliar a seleção. A pesquisa acompanha o recorte; a paginação visual não limita o documento.

A ficha mantém a projeção consultada na lista ou no indicador, após validar a autorização pelo identificador canônico. Assim, campanha segmentada e pessoa contada no indicador preservam os valores do recorte, em vez de substituí-los por totais gerais. Seu documento mantém esse contexto quando aplicável. Navegar para um vínculo autorizado fora do recorte permite uma ficha individual com escopo explícito; não concede acesso adicional nem elimina filtros de todas as fichas.

Cada domínio tem colunas próprias, identificadores rastreáveis e unidade de contagem. Vínculos sem permissão de consulta não são incluídos no documento. Seleções mistas produzem somente resumos por domínio e estado, sem uma tabela genérica. Valores são inteiros em centavos: acordo apresenta valor negociado e saldo de parcelas separadamente; DA apresenta saldo vinculado e valor elegível separadamente. Demandas têm unidade operacional, sem atribuir um valor financeiro zero por ausência de informação. A impressão escapa conteúdo e atributos; o PDF usa texto e tabelas com cabeçalho e rodapé.

Em campanhas, os vínculos são contados por tipo de entidade e identificador distinto, após a autorização, em vez de listar centenas de IDs de participantes. O ID da própria campanha, sua população e seus resultados permanecem no documento; nenhuma campanha da seleção é omitida. O detalhamento dos participantes permanece no dashboard.

PDF não torna aceitável uma extração de base por si só. Relatórios de produção precisam de propósito documental, template, escopo e permissão aprovados. O detalhamento interno continua disponível conforme o perfil.

## Critérios de homologação

1. Vários débitos, acordos, títulos e demandas de uma pessoa não perdem vínculos nem duplicam totais.
2. Confirmação sem retorno não conta como protesto; comprovante não confirma pagamento; assinatura sem primeira parcela não torna o acordo automaticamente vigente.
3. Pagamento não encerra demanda cartorial aberta. Encerramento preserva responsável, motivo, data e histórico.
4. Exercício e período geram recortes distintos. Geração e envio do termo têm marcos separados.
5. Perfis compartilham o modelo com escopos autorizados; PDF não expõe registros ocultos ao usuário.
6. Documento e tabela conciliam IDs, unidades, quantidades e somas no mesmo recorte/pesquisa, independentemente da página.
7. Ausência de dado, carga parcial, falha e regra pendente não aparecem como zero confiável.
8. Não há extração de base em planilhas ou equivalentes; documentos mantêm a finalidade aprovada.

As dependências concretas de fornecimento estão em [gaps-api.md](gaps-api.md). Ausência na documentação consultada é pendência de comprovação, sem presumir que o SISCAF não possui a informação ou inventar endpoints.
