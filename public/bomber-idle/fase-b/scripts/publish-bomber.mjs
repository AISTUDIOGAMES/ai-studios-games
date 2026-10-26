#!/usr/bin/env node
// Gera a build do BomberIdle (client/) e a publica em public/bomber-idle/ — o caminho que o Vercel serve em /bomber-idle/.
// Uso (na raiz do repositório):
//   npm run publish:bomber              -> build + verificações + cópia
//   npm run publish:bomber -- --skip-build   -> só verifica e copia o client/dist já existente
// Nunca apaga a versão antiga: ela vai para .publish-backup/ (adicione essa pasta ao .gitignore).
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.env.REPO_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const CLIENT = join(ROOT, "client");
const DIST = join(CLIENT, "dist");
const TARGET = join(ROOT, "public", "bomber-idle");
const BASE = "/bomber-idle/";
const skipBuild = process.argv.includes("--skip-build");

const fail = (msg) => { console.error(`\n✖ ${msg}`); process.exit(1); };
const ok = (msg) => console.log(`✔ ${msg}`);

// 1) Build
if (!skipBuild) {
  if (!existsSync(join(CLIENT, "node_modules"))) { console.log("Instalando dependências do client…"); execSync("npm install", { cwd: CLIENT, stdio: "inherit" }); }
  console.log("Compilando (tsc --noEmit + vite build)…");
  try { execSync("npm run build", { cwd: CLIENT, stdio: "inherit", env: { ...process.env, VITE_BASE: BASE } }); }
  catch { fail("A build falhou. Nada foi publicado e public/bomber-idle/ continua intacto."); }
}
if (!existsSync(join(DIST, "index.html"))) fail("client/dist/index.html não existe. Rode sem --skip-build.");

// 2) Verificações da build
const html = readFileSync(join(DIST, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)].map((m) => m[1]).filter((p) => p.startsWith("/") || p.startsWith("./"));
const wrongBase = refs.filter((p) => p.startsWith("/") && !p.startsWith(BASE));
if (wrongBase.length) fail(`index.html aponta para fora de ${BASE}: ${wrongBase.join(", ")}. Defina VITE_BASE=${BASE} na build.`);
for (const p of refs) {
  const file = join(DIST, p.replace(BASE, "").replace(/^\.\//, ""));
  if (!existsSync(file)) fail(`index.html referencia ${p}, mas o arquivo não está em client/dist.`);
}
ok(`index.html: ${refs.length} referências, todas existem e usam ${BASE}`);

const jsFiles = existsSync(join(DIST, "assets")) ? readdirSync(join(DIST, "assets")).filter((f) => f.endsWith(".js")) : [];
if (!jsFiles.length) fail("client/dist/assets não tem nenhum .js.");
const bundle = jsFiles.map((f) => readFileSync(join(DIST, "assets", f), "utf8")).join("\n");
// Marcadores do código atual (Overhaul 2.0). Se faltarem, a build é de uma versão antiga.
const missing = ["Aeon", "Kai", "Techno-Stalker", "Grid Architect", "Ancestral"].filter((k) => !bundle.includes(k));
if (missing.length) fail(`A build não contém: ${missing.join(", ")}. Parece uma versão antiga; publique a partir do código atual de client/src.`);
ok("a build contém os 8 BOMBERS (Aeon, Kai…) e as classes do Overhaul 2.0");

for (const f of ["nft/aeon.jpg", "nft/kai.jpg", "nft/lyra.jpg", "nft/titan.jpg", "nft/vex.jpg", "nft/kira.jpg", "nft/jax.jpg", "nft/orion.jpg"])
  if (!existsSync(join(DIST, f))) fail(`retrato ausente na build: ${f}`);
ok("os 8 retratos estão em client/dist/nft/");

// 3) Publicar: versão antiga vai para .publish-backup/, nunca é apagada
if (existsSync(TARGET)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bk = join(ROOT, ".publish-backup");
  mkdirSync(bk, { recursive: true });
  renameSync(TARGET, join(bk, `bomber-idle-${stamp}`));
  ok(`versão anterior guardada em .publish-backup/bomber-idle-${stamp}`);
}
mkdirSync(dirname(TARGET), { recursive: true });
cpSync(DIST, TARGET, { recursive: true });
const count = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
ok(`publicado em public/bomber-idle/ (${count(TARGET)} arquivos)`);

if (existsSync(join(ROOT, "assets")) && readdirSync(join(ROOT, "assets")).some((f) => f.startsWith("index-")))
  console.log("\nℹ A pasta assets/ na raiz é uma cópia solta de uma build antiga e não é usada pelo site. Pode removê-la com segurança depois de conferir.");
console.log("\nPróximo passo: git add public/bomber-idle && git commit && git push (o Vercel publica sozinho).");
