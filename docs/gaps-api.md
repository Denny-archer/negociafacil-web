# Lacunas da integração e regras em homologação

Esta implementação utiliza exclusivamente dados sintéticos do repositório local. Não envia requisições ao SISCAF, CRA21, cartório ou Financeiro e não grava operações nesses sistemas. As classificações `DEMO:` preservam explicitamente o caráter demonstrativo; não são códigos oficiais.

## Contrato de dados

Pessoa, registros, débitos, cobranças, campanhas/participações, acordos/parcelas, Dívida Ativa/Termo/CDA, títulos de protesto, pagamentos e demandas são entidades separadas. Um pagamento não encerra automaticamente uma demanda, inscrição ou efeito cartorial. As projeções de consulta mantêm identificação, status original, proveniência e vínculos.

O relógio dos cenários é fixo: **07/10/2026 às 12h, Brasília**. Atualizar a interface não muda datas-base ou prazos. O período utiliza o evento do domínio: vencimento do débito, formalização do acordo, início da campanha, evento da cobrança/DA, remessa do título, reconhecimento financeiro (ou informação se ainda não reconhecido), última movimentação da demanda e criação do cadastro. O exercício continua sendo uma dimensão própria do débito.

Os valores monetários são inteiros em centavos. Saldo de débitos não é somado novamente com valores de acordos, DA e títulos. Acordos apresentam valor negociado por instrumento e saldo de parcelas separadamente; instrumentos históricos podem compartilhar o mesmo crédito e não devem compor um saldo financeiro consolidado.

## Pendências oficiais

| Área | Informação/regra necessária | Comportamento enquanto pendente |
|---|---|---|
| Acesso | Credenciais de servidor, contrato de uso, limites, paginação, extração integral/incremental, perfis e auditoria | Nenhuma API real; escopo demonstrativo por setor/perfil. |
| Cadastro/carteira | Identificadores estáveis de pessoa/registro/débito; universo completo, inclusive inativos, empresas, DA executiva e protestados | Pessoas e registros múltiplos sintéticos; denominadores explicitados. |
| Inadimplência | Estados incluídos/excluídos, conceito de saldo, suspensões e denominador institucional | Regra demonstrativa documentada nos indicadores. |
| Faixas/antiguidade/metas | Limites e critérios aprovados; histórico oficial de posições; metas institucionais | Indicadores e filtros pendentes, sem intervalos ou metas inventados; evolução do estoque indisponível. |
| Cobrança/campanha | População inicial, ação, alcance, conversão, vínculo e atribuição confiável de recebimentos | Participações e pagamentos explicitamente vinculados no cenário. Medidas posteriores à DA não são uma sequência obrigatória. |
| Acordos | ID do instrumento/parcela, primeira parcela reconhecida, vigência, rompimento/inativação, instrumentos anteriores e renegociações | Cenários parametrizáveis; assinatura não equivale a vigência. |
| Dívida Ativa | Elegibilidade, impedimentos, lotes, inscrição, Termo/CDA gerados e enviados, notificações, atualização/cancelamento e histórico | Datas e documentos explicitamente fornecidos no cenário. Prazo/calendário oficial não é inferido. |
| Protesto | Remessa, confirmação, andamento, retorno, protocolo/cartório, motivo da devolução, anuência e regularização cartorial | Confirmado sem retorno permanece pendente; nenhum prazo cartorial calculado. Datas de prazo demo são fornecidas e identificadas. |
| Pagamentos | Localização, confirmação, compensação, baixa, estorno, fonte oficial, meio e vínculos com estratégias | Eventos reconhecidos e não reconhecidos separados; comprovante isolado não confirma recebimento. Estorno integra o resultado líquido. |
| Demandas | Identificador, status oficiais, responsável, ação/resultado, prazo/evento, protocolo, encerramento e auditoria | Todos os 12 status operacionais em cenários; ausência de saldo não encerra fila. |
| Alertas | Parâmetros autorizados e calendário | Inatividade de 15 dias é parâmetro demonstrativo declarado; nunca apresentado como regra oficial. |

## Evidências da documentação já analisada

- `POST /api/financeiro/atualiza-posicao_2` exclui explicitamente débitos em DA executiva e protestados: não é fonte integral da carteira.
- A consulta financeira do Implanta Connect é por registro; `incluirPagos` depende da configuração “Exibir pagamentos”. Os campos documentados não comprovam um livro completo de eventos/baixas/conciliação.
- Simulação/geração de renegociação não comprovam uma listagem histórica completa de instrumentos e parcelas.
- Relatórios personalizados são candidatos à extração estruturada, mas o schema genérico não documenta colunas; nomes, publicação, filtros e paginação precisam ser validados.
- O texto anteriormente fornecido registra erro de relatório não encontrado; isso não é um teste novo desta implementação nem prova de indisponibilidade permanente.

## Perfis e segurança

Equipe consulta o setor da sessão demo; Chefia e Gestão consultam a base demo. `admin` é capacidade separada e não habilita escrita em sistemas oficiais. `filterRows` e os detalhes reaplicam autorização por identificador canônico; o controle continua sendo uma simulação de interface. Autorização efetiva e auditoria devem existir no backend antes de conectar dados reais.

O detalhamento de vínculos pode abrir um registro autorizado fora do filtro visual original, preservando seu próprio contexto. A lista e o documento mantêm a população selecionada e a respectiva definição. O PDF usa a mesma seleção consultável; não é uma fonte operacional independente.

## Aceite necessário antes da integração

Homologar os casos de termo assinado sem primeira parcela, primeira parcela vencida, acordos anteriores, DA gerada sem envio, remessa confirmada sem retorno, devolução motivada, pagamento reconhecido com pendência cartorial, pagamento informado não localizado, baixa pendente, estorno e demanda aberta após regularização financeira. Conferir totais com fonte oficial na mesma data-base, com identificação e regra de cada indicador.
