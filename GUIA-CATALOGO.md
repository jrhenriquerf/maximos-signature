# Guia do catálogo Maximos Signature

## Arquivos principais

- `data/products.json`: fonte única dos dados dos produtos.
- `data/meta-commerce.csv`: feed publico do Meta, gerado com um item por SKU.
- `catalogo.html`: coleção completa, filtros e acesso às peças.
- `produto.html?id=maximos-aura&sku=MX-BAG-007`: página individual com o modelo correto.
- `admin.html`: editor visual exclusivamente local.
- `scripts/local_admin_server.py`: servidor que salva, versiona e publica o catálogo.
- `config.js`: número do WhatsApp e contatos da marca.

## Abrir o gerenciador

Dê dois cliques no atalho **Gerenciador Maximos Signature** da Área de Trabalho. Ele inicia o servidor e abre a página automaticamente.

Também é possível iniciar manualmente no WSL:

```bash
cd /home/jarangel/workspace/maximos-signature
python3 scripts/local_admin_server.py
```

O endereço local é `http://127.0.0.1:8080/admin.html`. Mantenha o terminal aberto durante o uso e pressione `Ctrl+C` para encerrar.

## Fluxo de atualização

1. Abra o gerenciador pelo endereço local acima.
2. Edite, adicione, duplique ou remova produtos.
3. Clique em **Salvar e publicar**.
4. O servidor valida o catálogo e cria um backup em `.local-backups`.
5. O arquivo `data/products.json` é atualizado.
6. O feed `data/meta-commerce.csv` é regenerado a partir do JSON.
7. Um commit contendo o JSON e o CSV é criado.
8. O commit é enviado para a branch atual no remote `origin`.
9. O workflow valida os arquivos e o GitHub Pages publica a nova versão automaticamente.

O topo do gerenciador mostra a branch conectada e o resultado da sincronização.

## Segurança

- O servidor escuta somente em `127.0.0.1`; outros computadores não conseguem acessá-lo.
- Cada execução gera um token temporário usado nas gravações.
- O token nunca é incluído no site público ou salvo no repositório.
- A autenticação com o GitHub é feita pelo próprio Git/SSH configurado na máquina.
- `admin.html`, `admin.js`, `admin.css` e `scripts` são excluídos do pacote do GitHub Pages; o CSV em `data` permanece publico.
- Alterações em outros arquivos do projeto não são incluídas no commit automático do catálogo.

Se o push falhar, o JSON, o backup e o commit permanecem locais. A mensagem do gerenciador indicará o motivo para que o envio possa ser repetido depois.

## Exportação manual

Os botões **Exportar JSON** e **Importar JSON** continuam disponíveis como contingência. Quando o editor for aberto sem o servidor local, ele entra em modo rascunho e não tentará publicar.

## Versões, estoque e imagens

Cada produto representa uma linha de bolsas. Dentro dela, cada modelo ou acabamento é uma **versão** com dados próprios:

- SKU único;
- modelo ou acabamento;
- quantidade em estoque;
- preço e preço anterior;
- peso e medidas;
- conjunto de fotografias.

Use **Marcar vendida** para zerar o estoque e marcar somente aquele modelo como esgotado. A bolsa continua disponível enquanto outro modelo possuir estoque. Quando todos chegarem a zero, a linha passa automaticamente a esgotada.

Organize as fotografias por modelo e SKU:

```text
assets/products/maximos-aura/mx-bag-007/01.webp
assets/products/maximos-aura/mx-bag-007/02.webp
assets/products/maximos-aura/mx-bag-008/01.webp
```

No cartão de cada versão, informe uma imagem por linha. A primeira representa a versão no catálogo. O campo **Imagem editorial da vitrine** é separado e controla a apresentação no carrossel da página inicial.

Marque **Imagem ilustrativa ou gerada** apenas quando as fotografias não representarem fielmente a peça real. O site exibirá esse aviso ao cliente.

## Meta Commerce e WhatsApp Business

Depois da publicacao no GitHub Pages, use esta URL como fonte de dados programada:

```text
https://maximossignature.com.br/data/meta-commerce.csv
```

O feed envia cada SKU como um item independente, sem `item_group_id`, para impedir que o Meta recombine cores ou modelos como variantes. Para cada SKU, ele inclui:

- identificador unico;
- titulo, descricao, modelo/cor e marca; quando o modelo for `Consultar disponibilidade`, o titulo usa o SKU como sufixo;
- estoque e disponibilidade independentes;
- preco normal e, quando aplicavel, preco promocional;
- imagem principal e imagens adicionais com URL absoluta;
- link direto com `id` e `sku` para abrir o modelo correto.
- tipo profissional (`Tote`, `Tiracolo` ou `Porta-celular`) em `product_type`;
- porte, linha e acabamento em `custom_label_0`, `custom_label_1` e `custom_label_2`;
- categoria padronizada de bolsas em `google_product_category`.

No gerenciador, classifique cada produto por tipo, subtipo, linha e porte. Porte e linha sao atributos secundarios: nao use `Grandes` ou `Pequenas` como categoria principal. Para novos modelos importados do WooCommerce, inclua primeiro o mapeamento em `scripts/import_woocommerce.py`; o importador interrompe a operacao quando encontra um modelo ainda nao classificado.

No Commerce Manager:

1. Crie ou abra o catalogo comercial.
2. Em **Fontes de dados**, escolha a opcao de feed/arquivo por URL programada.
3. Cole a URL acima e agende uma leitura diaria.
4. Defina Brasil e BRL quando solicitado e conclua a importacao.
5. Confira **Diagnosticos** e corrija qualquer item rejeitado antes de divulgar.
6. No Business Manager/WhatsApp Manager, associe o catalogo a conta e ao numero do WhatsApp Business.

Depois disso, cada uso de **Salvar e publicar** atualiza o JSON e o feed. O Meta busca a versao nova no proximo horario programado; para urgencias, solicite uma atualizacao manual da fonte no Commerce Manager.

## Meta Pixel

O conjunto de dados **Maximos Signature** usa o Pixel ID `1011169471576704`. O script `analytics.js` so carrega o Pixel depois do consentimento e registra `PageView`, `ViewContent` e `Contact`. A opcao fica disponivel novamente no rodape em **Preferencias de privacidade**.

Para validar uma publicacao, abra **Gerenciador de Eventos > Maximos Signature > Testar eventos**, informe a URL publicada, aceite a medicao no aviso do site e confirme o recebimento de `PageView`. Em uma pagina de produto, confirme tambem `ViewContent`; o evento `Contact` ocorre somente ao clicar em um botao do WhatsApp.

Nao configure `Purchase` enquanto a venda for concluida fora do site. Se o Pixel mudar, atualize apenas `metaPixelId` em `config.js`.

Se o dominio ou caminho publico mudar, altere `DEFAULT_BASE_URL` em `scripts/generate_meta_feed.py`, execute `python3 scripts/generate_meta_feed.py` e publique o CSV regenerado. Valide com `python3 scripts/test_meta_feed.py` e `python3 scripts/generate_meta_feed.py --check`.

## WhatsApp

Preencha `whatsapp` em `config.js` somente com números, incluindo código do país e DDD.

```js
whatsapp: '5511999999999'
```
