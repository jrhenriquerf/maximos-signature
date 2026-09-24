# Guia do catálogo Maximos Signature

## Arquivos principais

- `data/products.json`: fonte única dos dados dos produtos.
- `catalogo.html`: coleção completa, filtros e acesso às peças.
- `produto.html?id=maximos-aura`: página individual de cada produto.
- `admin.html`: editor visual exclusivamente local.
- `scripts/local_admin_server.py`: servidor que salva, versiona e publica o catálogo.
- `config.js`: número do WhatsApp e contatos da marca.

## Abrir o gerenciador

No WSL, entre na pasta do projeto e execute:

```bash
cd /home/jarangel/workspace/maximos-signature
python3 scripts/local_admin_server.py
```

Depois abra:

```text
http://127.0.0.1:8080/admin.html
```

Mantenha o terminal aberto enquanto estiver usando o gerenciador. Para encerrar, pressione `Ctrl+C`.

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

## Imagens

Organize as fotografias reais assim:

```text
assets/products/maximos-aura/frente.webp
assets/products/maximos-aura/costas.webp
assets/products/maximos-aura/interior.webp
assets/products/maximos-aura/detalhe.webp
```

No editor, informe um caminho por linha. A primeira imagem será usada como capa.

## WhatsApp

Preencha `whatsapp` em `config.js` somente com números, incluindo código do país e DDD.

```js
whatsapp: '5511999999999'
```
