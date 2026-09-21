# Guia do catálogo Maximos Signature

## Arquivos principais

- `data/products.json`: fonte única dos dados dos produtos.
- `catalogo.html`: coleção completa, filtros e acesso às peças.
- `produto.html?id=maximos-aura`: página individual de cada produto.
- `admin.html`: editor visual local do catálogo.
- `config.js`: número do WhatsApp e contatos da marca.

## Fluxo de atualização

1. Abra `admin.html` por um servidor local.
2. Edite, adicione, duplique ou remova produtos.
3. Clique em **Exportar products.json**.
4. Substitua `data/products.json` pelo arquivo baixado.
5. Envie a alteração ao repositório. A hospedagem fará a atualização do site.

O editor mantém um rascunho no armazenamento local do navegador. Ele não publica alterações sozinho e não contém credenciais do GitHub.

## Imagens

Organize as fotografias reais assim:

```text
assets/produtos/maximos-aura/frente.webp
assets/produtos/maximos-aura/costas.webp
assets/produtos/maximos-aura/interior.webp
assets/produtos/maximos-aura/detalhe.webp
```

No editor, informe um caminho por linha. A primeira imagem será usada como capa.

## WhatsApp

Preencha `whatsapp` em `config.js` somente com números, incluindo código do país e DDD.

```js
whatsapp: '5511999999999'
```

## Observação sobre o painel

O `admin.html` foi feito para uso local. Ele não deve ser apresentado na navegação pública. Uma versão que publique diretamente exigiria autenticação e um serviço intermediário seguro; tokens privados nunca devem ser incluídos no JavaScript do site.
