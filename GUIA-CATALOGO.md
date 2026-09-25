# Guia do catálogo Maximos Signature

## Arquivos principais

- `data/products.json`: fonte única dos dados dos produtos.
- `catalogo.html`: coleção completa, filtros e acesso às peças.
- `produto.html?id=maximos-aura`: página individual de cada produto.
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
6. Um commit contendo somente o JSON é criado.
7. O commit é enviado para a branch atual no remote `origin`.
8. O workflow do GitHub Pages publica a nova versão automaticamente.

O topo do gerenciador mostra a branch conectada e o resultado da sincronização.

## Segurança

- O servidor escuta somente em `127.0.0.1`; outros computadores não conseguem acessá-lo.
- Cada execução gera um token temporário usado nas gravações.
- O token nunca é incluído no site público ou salvo no repositório.
- A autenticação com o GitHub é feita pelo próprio Git/SSH configurado na máquina.
- `admin.html`, `admin.js`, `admin.css` e `scripts` são excluídos do pacote do GitHub Pages.
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

## WhatsApp

Preencha `whatsapp` em `config.js` somente com números, incluindo código do país e DDD.

```js
whatsapp: '5511999999999'
```
