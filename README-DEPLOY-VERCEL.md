# AI STUDIO OWL v0.3.0 — Deploy pelo PowerShell

Este pacote reune o codigo atualizado, a identidade Desert Marble e os assets completos incluidos no projeto. O deploy configurado aqui e o **site principal Vite/TypeScript**. O arquivo `.vercelignore` reduz o upload excluindo fontes auxiliares que nao fazem parte do build estatico; esses arquivos continuam preservados no ZIP.

## Requisitos

- Windows 10/11 com PowerShell 5.1 ou PowerShell 7.
- Node.js 18 ou superior (recomendado Node 20+).
- Conexao com a internet para `npm ci` e para o Vercel CLI.
- Conta Vercel com acesso ao projeto correto.

## Primeiro deploy ou primeiro uso nesta maquina

1. Extraia `AI_STUDIO_OWL_VERCEL_v0.3.0.zip` para uma pasta local, por exemplo `C:\Sites\AI_STUDIO_OWL`.
2. Abra o PowerShell nessa pasta.
3. Se o Windows bloquear scripts nesta sessao, execute:

   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```

4. Gere primeiro uma URL de Preview:

   ```powershell
   .\DEPLOY-VERCEL.ps1 -Target Preview
   ```

5. Na primeira execucao, o Vercel CLI vai pedir para vincular a pasta a um projeto. **Selecione o projeto Vercel existente que deve atender `aistudiosowl.vercel.app`**. Nao crie um projeto novo por engano.
6. Teste a URL de Preview em desktop e celular.
7. Somente depois da aprovacao, publique em producao:

   ```powershell
   .\DEPLOY-VERCEL.ps1 -Target Production
   ```

   O script exige que voce digite `DEPLOY` antes de enviar para producao.

## O que o script faz

1. Verifica Node.js, npm e npx.
2. Executa `npm ci` para instalar exatamente as dependencias do `package-lock.json`.
3. Executa `npm run build` (TypeScript + Vite).
4. Confere se `dist/index.html` foi gerado.
5. Executa `vercel link` na primeira utilizacao, se necessario.
6. Envia um Preview por padrao, ou Production quando solicitado explicitamente.

O `vercel.json` configura `npm ci`, `npm run build` e `dist` como diretorio de saida.

## Dominio

Confirme no painel da Vercel que `aistudiosowl.vercel.app` esta associado ao projeto escolhido durante `vercel link`. O CLI publica no projeto vinculado; ele nao cria nem altera DNS de dominios automaticamente neste pacote.

## Limites importantes

- A pasta `public/` ocupa aproximadamente 96,5 MB. A documentacao atual da Vercel informa limite de upload de arquivos estaticos de 100 MB no plano Hobby e 1 GB no Pro. O pacote fica proximo do limite Hobby; se o Vercel recusar o deploy por tamanho, sera necessario hospedar parte da midia em storage/CDN externo ou usar um plano com limite maior.
- Este deploy publica o **site estatico principal** construido a partir de `src/main.ts` pelo Vite.
- O servidor Express dentro de `server/` nao e implantado automaticamente como backend por este build estatico. Se funcionalidades dependerem dele, hospede-o separadamente e configure a URL correspondente.
- O Worker do Slither.Idle em Cloudflare tambem e um servico separado; este script nao executa `wrangler deploy` nem altera o endpoint do Worker.
- Nao ha chaves privadas nem arquivos `.env` incluidos neste ZIP. Nunca inclua secrets no repositorio.

## Estado desta entrega

Versao do site: **0.3.0**. Identidade visual: **Desert Marble**.

O ambiente de preparacao nao conseguiu completar `npm ci` por timeout; por isso, o build de producao nao foi certificado aqui. O script faz uma instalacao limpa e interrompe o deploy se `npm ci` ou `npm run build` falhar. Nao foi realizado deploy por esta preparacao.
