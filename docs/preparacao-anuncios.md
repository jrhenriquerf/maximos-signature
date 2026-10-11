# Preparação para divulgação e anúncios

## Publicação e catálogo

Cada SKU tem uma página HTML em `bolsas/`, com conteúdo visível antes de executar
JavaScript, metadados de compartilhamento, URL canônica e dados estruturados de
produto e oferta. O sitemap inclui essas páginas. Os endereços antigos
`produto.html?id=...&sku=...` continuam funcionando. O feed Meta usa as novas páginas.

Depois de alterar JavaScript, CSS ou catálogo:

```bash
python3 scripts/generate_meta_feed.py
node scripts/generate_public_pages.cjs
node scripts/test_availability.cjs
node scripts/test_campaign.cjs
node scripts/test_analytics.cjs
node scripts/test_public_pages.cjs
python3 -m unittest discover -s scripts -p 'test_*.py'
python3 scripts/build_public_site.py
```

O gerenciador local regenera e publica páginas, sitemap, estilos agrupados e feed
junto com o catálogo. Os estilos originais são a fonte; não editar os arquivos
`*-bundle.css` manualmente. Os arquivos públicos usam versões por conteúdo para
evitar reutilizar scripts e estilos antigos no navegador.

No Cloudflare Pages, o comando de build recomendado é
`python3 scripts/build_public_site.py`, com saída em `dist`. Esse artefato contém
somente arquivos públicos. Os backups do WordPress não fazem parte do projeto.
Os redirecionamentos em `_redirects` e cabeçalhos em `_headers` são para Cloudflare
Pages; não são interpretados pelo GitHub Pages.

## Origem de campanha e contatos

Exemplo de destino de anúncio:

```text
https://maximossignature.com.br/bolsas/maximos-aura-mx-bag-007?utm_source=instagram&utm_medium=paid_social&utm_campaign=colecao&utm_content=video1
```

Com consentimento, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term` e `utm_id` são preservados durante a sessão. A mensagem preparada para
o WhatsApp inclui origem, campanha e anúncio. A revogação interrompe a medição e
remove os parâmetros do armazenamento de sessão. Sem autorização, o atendimento
continua funcionando e não inclui essa referência de campanha.

`Contact` é emitido depois de preparar o link de atendimento e inclui o SKU
e o preço quando o contato parte de um produto. Ele representa o clique para abrir
o WhatsApp; não comprova mensagem enviada ou venda. Não há evento `Purchase`,
checkout integrado, confirmação automática de pagamento ou cotação automática
de frete neste catálogo. O Asaas e o Melhor Envio são utilizados no atendimento.

## Validação nas contas do Meta

A validação de navegador verifica a emissão dos eventos com o SDK simulado;
ela não comprova que a conta Meta recebeu ou associou os eventos.

1. No Gerenciador de Eventos, selecionar o Pixel/dataset Maximos Signature
   (`1011169471576704`) e abrir **Testar eventos**.
2. Abrir o site pelo teste e aceitar os recursos opcionais. Confirmar `PageView`.
3. Abrir a página de um SKU. Confirmar `ViewContent`, `content_ids` igual ao SKU,
   preço e moeda `BRL`.
4. Clicar para comprar pelo WhatsApp. Confirmar apenas um `Contact` por clique,
   com o SKU correto. O painel pode levar algum tempo para exibir o evento.
5. Revogar o consentimento e repetir. A medição deve ficar bloqueada.
6. No Commerce Manager, conferir a última importação de
   `https://maximossignature.com.br/data/meta-commerce.csv`, os 20 SKUs atuais,
   preços, disponibilidade, imagens e links. A quantidade varia com o catálogo.
7. Revisar diagnósticos, permissões da conta de anúncios e associação do Pixel
   ao catálogo. Esses estados só podem ser confirmados dentro da conta.

No atendimento, registrar campanha recebida, SKU, conversa qualificada, pedido,
valor recebido e frete. Esse registro permite comparar cliques com vendas reais.

## Google e performance

Cadastrar/verificar o domínio no Search Console, enviar
`https://maximossignature.com.br/sitemap.xml` e inspecionar algumas páginas de SKU.
Validar dados estruturados no teste de resultados avançados. A marcação não
garante indexação nem resultados enriquecidos.

O Lighthouse mede uma visita simulada; acompanhar também dados reais no
PageSpeed Insights/Search Console quando houver tráfego suficiente.

Auditoria local final em 10/10/2026, Lighthouse 13.5.0, emulação mobile:

| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Início | 91 | 100 | 100 | 100 | 3,3 s | 0 |
| Catálogo | 94 | 100 | 100 | 100 | 2,9 s | 0,001 |
| Produto Aura MX-BAG-007 | 98 | 100 | 100 | 100 | 2,3 s | 0 |

O servidor local não usa a compressão e o cache da hospedagem. Essas notas são
uma referência de laboratório, não uma medição de usuários reais nem garantia
de aprovação de anúncios. O fluxo também foi verificado em navegador mobile e
desktop, com JavaScript desativado, consentimento aceito/revogado e SDK Meta
simulado. Não houve erros JavaScript nem requisições locais com erro.

## Políticas recuperadas

A base veio das páginas publicadas do backup WordPress de 01/10/2026:
`privacy-policy`, `termos-de-uso-maximos-signature` e
`politica-de-troca-devolucao-e-envio`. Os textos foram adaptados ao atendimento
pelo WhatsApp, ao contato atual e ao consentimento do catálogo. Pagamento por
Asaas, envio via Melhor Envio e solicitação de troca em 7 dias já constavam do backup.

O texto diferencia a troca por preferência do arrependimento e da garantia legal,
sem condicionar direitos legais à embalagem original ou à percepção imediata de
um defeito. Fontes: artigo 49 do CDC e Decreto 7.962/2013.

O responsável continua pessoa física, conforme informado pelo proprietário;
a identificação fiscal foi recuperada da política anteriormente publicada.
O endereço de fabricação foi informado e autorizado para publicação pelo
proprietário em 11/10/2026: Rua André Padilha Sobrinho, 354 — Centro — Bauru/SP.
As páginas de informações exibem o endereço e esclarecem que a operação é
exclusivamente online, sem atendimento presencial ou retirada no local.


## Ajustes após auditoria Meta e Search Console (11/10/2026)

O código configura `fbq('set', 'autoConfig', false, pixelId)` antes de `init`,
seguindo o template oficial da Meta:
https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl
A página de documentação avançada do Pixel retornou HTTP 429 durante a consulta;
a ordem foi confirmada no código oficial do template. Isso desativa configuração
automática/coleta inferida; os três eventos explícitos continuam com `track`.
Não foram adicionados eventos de compra nem parâmetros artificiais de URL.
A apresentação “personalizado” no painel e a URL raiz não provam erro do payload.

Os testes locais usam SDK simulado: confirmam comandos, ordem, bloqueios,
reaceitação, uma inicialização/listener e Contact único com SKU/preço/BRL.
Também cobrem revogação enquanto o SDK ainda carrega, removendo eventos pendentes.
A campanha armazenada na sessão é removida ao revogar.

`PRODUCT_IMAGES.productUrl` mantém o caminho físico `.html` para geração e links
relativos compatíveis com o servidor local. `publicProductUrl` fornece o destino
sem extensão para canonical, og:url, Product/Offer e breadcrumbs. O sitemap e
feed também usam URLs públicas sem extensão. Os redirecionamentos antigos
apontam diretamente para essas URLs. O gerenciador regenera os mesmos artefatos.

Verificação de produção antes de publicar estes ajustes: `curl` recebeu HTTP 200,
Content-Type `application/xml`, XML com namespace correto e 26 URLs ainda com
extensão. Uma requisição Python urllib ao mesmo endereço recebeu HTTP 403.
Essa diferença não identifica a causa do erro de leitura no Search Console.
O chat do Edge deve verificar data da última tentativa, detalhes do erro,
regras/desafios/bloqueios Cloudflare e, se disponíveis, logs de acesso do Google.
Não alterar regras de segurança com base apenas nesse teste.

### Validação após deploy

1. Confirmar que `/sitemap.xml` retorna HTTP 200, XML real (sem HTML de fallback
   ou desafio), Content-Type XML, namespace padrão e 26 URLs únicas sem `.html`.
   Conferir o sitemap em `robots.txt`. Abrir exemplos de URLs e verificar que
   canonical, og:url, ofertas e breadcrumbs coincidem com os destinos finais.
2. Em sessão limpa, recusar opcionais: não carregar `fbevents.js`, nem enviar
   eventos para Meta. Abrir produtos e clicar WhatsApp sem enviar mensagem.
3. Aceitar: no Meta Testar eventos, confirmar PageView, ViewContent e um Contact
   por clique com SKU, valor e BRL. Na rede do navegador, verificar `ev=PageView`
   e o parâmetro `dl` dos eventos de produto contra a página acessada; registrar
   divergências entre payload observado e apresentação da interface.
4. Abrir preferências e recusar: verificar ausência de SubscribedButtonClick,
   eventos inferidos e eventos explícitos desse clique e das ações seguintes.
   Confirmar limpeza de `maximos_campaign_v1`; trocar modelo, navegar e clicar
   WhatsApp. Reaceitar e confirmar funcionamento sem eventos duplicados.
   Repetir com rede lenta, revogando enquanto o SDK carrega.
5. No Edge, conferir também configuração de coleta automática e Event Setup Tool
   na conta Meta; o código não comprova nem altera esses estados externos.
6. Reimportar o feed Meta: conferir 20 IDs únicos, sem `item_group_id`, links sem
   extensão, atributos preservados e diagnósticos. Usar a quantidade atual se
   houver atualização de catálogo.
7. Reenviar o sitemap na propriedade existente do Search Console e acompanhar
   o novo processamento. HTTP 200 local ou em produção não comprova leitura pelo
   Google. Registrar resultado e pendências com evidências.
