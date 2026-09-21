# Maximos Signature

Site estatico e responsivo da Maximos Signature, com vitrine editorial, catalogo baseado em JSON, paginas individuais de produtos e editor local do catalogo.

## Paginas

- `index.html`: apresentacao da marca e vitrine de destaques.
- `catalogo.html`: catalogo completo com filtros.
- `produto.html?id=maximos-aura`: pagina individual alimentada pelo JSON.
- `admin.html`: editor local para cadastrar e atualizar os produtos.

## Dados e configuracao

- `data/products.json`: fonte unica dos produtos.
- `config.js`: numero do WhatsApp e contatos da marca.
- `GUIA-CATALOGO.md`: instrucoes detalhadas para administrar o catalogo.

## Executar localmente

Como o catalogo e carregado por `fetch`, abra o projeto atraves de um servidor local:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Antes da publicacao

1. Preencha o numero comercial em `config.js`.
2. Substitua as imagens conceituais por fotografias reais.
3. Revise precos, estoque, cores e medidas em `data/products.json`.
4. Conecte o repositorio ao Cloudflare Pages para publicacao automatica.

## Hospedagem

O projeto nao precisa de build, banco de dados ou servidor de aplicacao. A raiz do repositorio pode ser publicada diretamente como site estatico no Cloudflare Pages.

As imagens atuais sao conceituais e nao representam produtos reais da Maximos Signature.
