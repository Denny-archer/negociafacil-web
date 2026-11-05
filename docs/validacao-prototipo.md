# Validação da adequação das telas

Verificação realizada em 07/10/2026 sobre dados sintéticos, sem chamadas ao SISCAF/CRA21.

- Build de produção com TypeScript e Vite: aprovado.
- 27 testes automatizados de domínio e documentos: aprovados (`npm test`).
- Dez abas verificadas no Chrome, em 1440 px e 390 px: sem erros de execução ou transbordamento horizontal da página. As tabelas mantêm rolagem própria.
- Navegação antiga `#service` e `#exports`: redirecionada para Demandas e Relatórios.
- Fichas, vínculos e históricos próprios dos processos: verificados.
- Cenários de erro, vazio, parcial, desatualizado, acesso restrito e homologação pendente: distinguíveis na interface.
- Atualização visual: preserva a data-base fixa da demonstração.
- Perfis demonstrativos e capacidade administrativa separada: verificados; não substituem autorização no backend.
- 14 PDFs nativos e um documento de impressão gerados para conferência. IDs, quantidades, centavos, origem, perfil e filtros conciliados; resumos gerenciais agrupam a seleção por estado.
- PDFs obtidos nas páginas 1 e 2 da tabela: conteúdo igual para a mesma seleção completa.
- Detalhamento do período anterior: conserva o intervalo próprio na lista e no PDF.
- PDF de campanhas: preserva todas as campanhas e resume os vínculos autorizados por quantidade, evitando listar centenas de IDs relacionados.

Os testes cobrem coexistência de acordo/DA/protesto/demanda, primeira parcela, geração versus envio, confirmação versus retorno, pagamento não localizado, estorno, pendências cartoriais e demandas abertas após pagamento. Faixas, metas, histórico de estoque e regras oficiais sem definição permanecem em homologação.

Esta conferência valida o protótipo. Produção depende das fontes, contratos, cálculos e permissões institucionais descritos em [gaps-api.md](gaps-api.md).
