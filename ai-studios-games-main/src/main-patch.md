# Como aplicar em src/main.ts

1. Instale: `npm i @wallet-standard/app @wallet-standard/base`
2. Copie `wallet.ts` para `src/wallet.ts` e cole o conteúdo de `wallet-modal.css` no fim de `src/style.css`.
3. Em `src/main.ts`, no topo do arquivo, adicione:
   `import { initWallet } from "./wallet";`
4. Em `src/main.ts`, apague tudo da linha `type SolanaProvider = ...` até o fim do arquivo
   (o bloco `declare global`, `let connectedAddress` e o listener de `#walletBtn`) e troque por:
   `initWallet(notify);`
5. `npm run dev`, teste com Phantom e Solflare, depois `npm run build`.
