# Maximos Signature

Site estatico e responsivo da Maximos Signature, com vitrine editorial, catalogo baseado em JSON, paginas individuais de produtos e editor local do catalogo.

## Paginas

- `index.html`: apresentacao da marca e vitrine de destaques.
- `catalogo.html`: catalogo completo com filtros.
- `produto.html?id=maximos-aura`: pagina individual alimentada pelo JSON.
- `admin.html`: editor para uso local; ele nao e incluido no site publico.

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

## Gerenciar o catálogo localmente

O editor administrativo não é publicado no GitHub Pages. Para abri-lo com capacidade de salvar e enviar alterações ao GitHub, execute:

```bash
python3 scripts/local_admin_server.py
```

Acesse `http://127.0.0.1:8080/admin.html`. O servidor grava `data/products.json`, cria um backup local, faz commit somente desse arquivo e executa o push usando a autenticação Git/SSH já configurada. Consulte `GUIA-CATALOGO.md` para o fluxo completo.

## Imagens dos produtos

As fotografias originais são tratadas como arquivos-mestre e permanecem fora do repositório. O site usa três derivados WebP para equilibrar nitidez e desempenho:

- `01-thumb.webp` (360 px): seletores de modelo e miniaturas;
- `01-card.webp` (900 px): catálogo e vitrines;
- `01.webp` (até 1800 px): página do produto e zoom.

O navegador escolhe automaticamente a resolução adequada por meio de `srcset`. Para recriar os derivados a partir das pastas locais de originais, use `scripts/optimize_product_images.py`; o script compara visualmente cada imagem publicada com os originais e só substitui o detalhe quando a correspondência é segura.
## Antes da publicacao

1. Preencha o numero comercial em `config.js`.
2. Revise precos, estoque, modelos e medidas em `data/products.json`.
3. Confirme que as fotografias finais estao na pasta `assets`.
4. Preencha o numero comercial em `config.js` antes da versao definitiva.
5. Teste `index.html`, `catalogo.html` e ao menos uma pagina de produto.

## Publicar no GitHub Pages

O projeto nao precisa de build, banco de dados ou servidor de aplicacao. O workflow `.github/workflows/deploy-pages.yml` publica automaticamente o site a cada envio para a branch `main`.

### Primeira publicacao

1. Crie um repositorio vazio no GitHub, sem adicionar README ou `.gitignore`.
2. No terminal, dentro desta pasta, conecte e envie o repositorio:

```bash
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
git push -u origin main
```

3. No GitHub, abra **Settings > Pages**.
4. Em **Build and deployment > Source**, escolha **GitHub Actions**.
5. Abra a aba **Actions** e acompanhe o workflow **Publicar no GitHub Pages**.

Ao concluir, o endereco sera semelhante a:

```text
https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
```

Todos os caminhos do site sao relativos, portanto o catalogo, as imagens e as paginas de produto funcionam nesse subdiretorio.

### Dominio proprio

Quando desejar usar `maximossignature.com.br`, primeiro adicione o dominio em **Settings > Pages > Custom domain**. Somente depois altere o DNS no provedor do dominio.

Para o dominio principal, configure os registros `A` de `@`:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Para `www`, crie um `CNAME` apontando para `SEU-USUARIO.github.io`. Depois da propagacao, ative **Enforce HTTPS** no GitHub Pages.

### Atualizacoes futuras

Depois da configuracao inicial, qualquer novo commit enviado para `main` inicia uma publicacao automaticamente:

```bash
git add .
git commit -m "Atualiza o catalogo"
git push
```
