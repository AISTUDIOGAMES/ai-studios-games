/**
 * Wallet connection via the Wallet Standard (Phantom, Solflare, Backpack, ...).
 * Replaces the old window.solana code in main.ts.
 *
 *   npm i @wallet-standard/app @wallet-standard/base
 *
 * This module only connects and reads the address. It never asks for a signature
 * or a transaction. Later, stake/vote code can call getConnected() to sign.
 */
import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";

const CONNECT = "standard:connect";
const DISCONNECT = "standard:disconnect";
const EVENTS = "standard:events";
const STORAGE_KEY = "asg:lastWallet";

type ConnectFeature = { connect(input?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }> };
type DisconnectFeature = { disconnect(): Promise<void> };
type EventsFeature = { on(event: "change", listener: (p: { accounts?: readonly WalletAccount[] }) => void): () => void };

const walletsApi = getWallets();
let current: { wallet: Wallet; account: WalletAccount } | null = null;
let unsubscribe: (() => void) | null = null;
let onChange: () => void = () => {};

const shorten = (a: string) => a.slice(0, 4) + "…" + a.slice(-4);

function isSolanaWallet(w: Wallet): boolean {
  return CONNECT in w.features && w.chains.some((c) => c.startsWith("solana:"));
}

export function listWallets(): Wallet[] {
  return walletsApi.get().filter(isSolanaWallet);
}

/** Connected wallet + account, or null. Use this later to sign stake/vote messages. */
export function getConnected() {
  return current;
}

export function getAddress(): string {
  return current?.account.address ?? "";
}

function remember(name: string | null) {
  try {
    if (name) localStorage.setItem(STORAGE_KEY, name);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage may be blocked */ }
}

async function connectTo(wallet: Wallet, silent: boolean) {
  const feature = wallet.features[CONNECT] as ConnectFeature;
  const { accounts } = await feature.connect({ silent });
  const account = accounts[0] ?? wallet.accounts[0];
  if (!account) throw new Error("No account returned");

  unsubscribe?.();
  const events = wallet.features[EVENTS] as EventsFeature | undefined;
  unsubscribe = events?.on("change", ({ accounts: next }) => {
    if (!next) return;
    current = next.length ? { wallet, account: next[0] } : null;
    if (!current) remember(null);
    onChange();
  }) ?? null;

  current = { wallet, account };
  remember(wallet.name);
  onChange();
}

async function disconnect() {
  const wallet = current?.wallet;
  current = null;
  unsubscribe?.();
  unsubscribe = null;
  remember(null);
  onChange();
  const feature = wallet?.features[DISCONNECT] as DisconnectFeature | undefined;
  try { await feature?.disconnect(); } catch { /* wallet may already be disconnected */ }
}

function openPicker(wallets: Wallet[], pick: (w: Wallet) => void) {
  const backdrop = document.createElement("div");
  backdrop.className = "wallet-modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "wallet-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Select a wallet");

  const title = document.createElement("h3");
  title.textContent = "SELECT WALLET";
  modal.appendChild(title);

  const close = () => {
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);

  for (const w of wallets) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "wallet-option";
    // Wallet icons are data URIs supplied by the wallet; accept images only.
    if (w.icon.startsWith("data:image/")) {
      const img = document.createElement("img");
      img.src = w.icon;
      img.alt = "";
      img.width = 22;
      img.height = 22;
      b.appendChild(img);
    }
    const name = document.createElement("span");
    name.textContent = w.name; // textContent: never innerHTML for external strings
    b.appendChild(name);
    b.addEventListener("click", () => { close(); pick(w); });
    modal.appendChild(b);
  }

  const note = document.createElement("p");
  note.textContent = "We only read your public address. No transaction is requested.";
  modal.appendChild(note);

  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  modal.querySelector<HTMLButtonElement>("button")?.focus();
}

export function initWallet(notify: (message: string) => void) {
  const btn = document.querySelector<HTMLButtonElement>("#walletBtn");
  const label = document.querySelector<HTMLSpanElement>("#walletLabel");
  if (!btn || !label) return;

  onChange = () => {
    label.textContent = current ? shorten(current.account.address) : "CONNECT WALLET";
  };

  // Reconnect silently (no popup) to the wallet used last time, if it is still authorized.
  const tryRestore = async () => {
    if (current) return;
    let last: string | null = null;
    try { last = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    const wallet = last ? listWallets().find((w) => w.name === last) : undefined;
    if (!wallet) return;
    try { await connectTo(wallet, true); } catch { remember(null); }
  };
  void tryRestore();
  walletsApi.on("register", () => { void tryRestore(); }); // wallets can register after page load

  btn.addEventListener("click", async () => {
    if (current) {
      await disconnect();
      notify("Wallet disconnected.");
      return;
    }
    const wallets = listWallets();
    if (!wallets.length) {
      notify("No Solana wallet detected. Install Phantom, Solflare or Backpack to connect.");
      window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
      return;
    }
    const connect = async (w: Wallet) => {
      try {
        await connectTo(w, false);
        notify("Wallet connected. No transaction was requested.");
      } catch {
        notify("Wallet connection cancelled or unavailable.");
      }
    };
    if (wallets.length === 1) void connect(wallets[0]);
    else openPicker(wallets, (w) => { void connect(w); });
  });
}
