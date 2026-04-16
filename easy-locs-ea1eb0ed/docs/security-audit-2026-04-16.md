# Audit de sécurité — 2026-04-16

## Synthèse exécutive

Un audit complet a été mené suite à un signalement utilisateur d'éventuels ajouts malveillants ("virus") dans le projet. Les scans automatisés (audit de dépendances OSV, SAST Semgrep, scan secrets) ont été lancés en parallèle à une revue manuelle de l'historique git (30 derniers jours), des scripts lifecycle npm, des workflows GitHub Actions, des fichiers de configuration d'exécution (`.replit`, `.env`, `.npmrc`), et du code source (patterns typiques de malware : `eval`, `new Function`, `child_process`, fetch vers domaines inconnus, obfuscation base64, binaires suspects).

**Conclusion principale : aucune preuve de code malveillant injecté n'a été trouvée.**

Tous les commits des 30 derniers jours proviennent d'auteurs attendus (`jstarbuzz`, `easy-locs`, `Replit Agent`, `gpt-engineer-app[bot]`). Aucun script `preinstall` / `postinstall` / `install` / `prepare` n'est défini dans les `package.json`. Aucune dépendance récemment ajoutée ne correspond à un typosquat connu. Aucun binaire, fichier obfusqué, ou base64 long suspect n'a été détecté dans `src/`. Les seules occurrences de `eval(` et `document.write` dans le code sont des **détections** dans un moteur d'audit interne (`src/lib/ai-audit/engines/simple-engines.ts`), pas des usages. Les seules occurrences de `evil.com` sont dans des fixtures de tests de sécurité (`sanitize-html.test.ts`, `security-hardening.test.ts`).

En revanche, l'audit a identifié **un vrai problème d'exposition de secret** (token d'administration Supabase committé dans `.replit`), **28 vulnérabilités hautes/critiques dans les dépendances** (aucune exploitation active, mais à mettre à jour), et **quelques sinks XSS potentiels** (`innerHTML` sur contenu partiellement dynamique).

---

## 1. Findings par gravité

### 🔴 CRITIQUE

#### C-1 — Token d'administration Supabase committé dans `.replit`
- **Fichier** : `.replit:51`
- **Preuve** : ligne de la forme `SUPABASE_ACCESS_TOKEN_NEW = "sbp_***REDACTED***"` (token d'admin Supabase, préfixe `sbp_`, 40+ caractères — valeur complète volontairement non reproduite dans ce rapport pour limiter la propagation du secret)
- **Impact** : Ce token au préfixe `sbp_` est une **clé d'accès à l'API de management Supabase** (pas la clé anon publique). Quelqu'un avec cette clé peut lister/modifier des projets, fonctions edge, secrets, et schémas DB selon le scope du token. `.replit` est versionné dans git et potentiellement dans un repo public GitHub (vu le workflow `deploy-now.yml`).
- **Action immédiate** : Révoquer + régénérer ce token dans le dashboard Supabase (Account → Access Tokens), le retirer de `.replit` et le stocker via les Secrets Replit.

#### C-2 — jspdf 4.2.0 : HTML Injection sur `New Window` paths
- **Package** : `jspdf@4.2.0`
- **Fix** : `jspdf@4.2.1` (patch, non-breaking)
- **Impact** : XSS/Injection HTML si du contenu utilisateur est passé via les chemins "New Window" du générateur PDF.

---

### 🟠 HAUTE

#### H-1 — 27 autres vulnérabilités "high" dans les dépendances

| Package | Version | Fix | Type |
| --- | --- | --- | --- |
| `@xmldom/xmldom` | 0.8.11 | 0.8.12 | XML injection via CDATA |
| `flatted` | 3.3.1 | 3.4.2 | Prototype Pollution + DoS |
| `glob` | 10.4.5 | 10.5.0 | CLI command injection (CLI-only, pas runtime) |
| `jspdf` | 4.2.0 | 4.2.1 | PDF Object Injection |
| `lodash` | 4.17.21 | 4.18.0 | Code injection via `_.template` (seulement si `_.template` utilisé sur input user) |
| `minimatch` (3, 9, 10) | divers | patch | ReDoS (3 CVE distincts) |
| `path-to-regexp` | 6.1.0 | 6.3.0 | Backtracking ReDoS |
| `picomatch` | 2.3.1 | 2.3.2 | ReDoS |
| `serialize-javascript` | 6.0.2 | 7.0.3 | RCE via `RegExp.flags` |
| `tar` | 7.5.10 | 7.5.11 | Symlink path traversal |
| `undici` | 5.28.4 | 6.24.0 | WebSocket DoS (x2) |

**Aucune n'est une backdoor** — ce sont des CVE publiques sur des packages légitimes. La plupart sont des dépendances transitives (build/dev tooling) et présentent un impact runtime limité.

#### H-2 — Sinks `innerHTML` avec contenu partiellement dynamique
Semgrep a signalé 6 emplacements où `.innerHTML` / `.outerHTML` est assigné avec du contenu incluant des valeurs de source interne (icônes, counts, SVG). Aucun n'injecte d'input utilisateur brut, mais à durcir :

- `src/components/mobility/MobilityLiveMap.tsx:401` — `el.innerHTML = SVG_CAR(r.heading)`
- `src/engines/core/repair-actions.ts:87` — `el.outerHTML = snapshot`
- `src/lib/map/easy-locs-markers.ts:109` — `dot.innerHTML = iconFor(entityType)`
- `src/lib/map/presence-styles.ts:112` — `el.innerHTML = style.icon`
- `src/lib/radar/radar-snap-elite.ts:368` — `state.sidePanel.innerHTML = \`...${sorted.map(buildStationCard).join('')}\``
- `src/pages/real-estate/DubaiAnalyticsPage.tsx:430` — `el.innerHTML = \`<span>${s.transactionCount}</span>\``

---

### 🟡 MOYENNE

#### M-1 — Faux positifs SAST "Secret" (locale codes)
Plusieurs findings Semgrep "gitleaks openai-api-key" sont des **faux positifs** dus au regex qui matche `sk-XX` (codes de locales slovaques et pattern `\"sk-\"`) :
- `src/lib/global-country-registry.ts:54`, `src/lib/i18n-canonical.ts:127`, `src/lib/navigation/locale-voice-map.ts:24`, `src/lib/pdf-generator.ts:28`, `src/components/marketplace/InvoicePdfGenerator.ts:25`, `src/lib/templates/sk/lease-residential.ts:4,42`

Aucune clé réelle exposée. **Pas d'action requise**, sinon filtrer la règle.

#### M-2 — Clé privée hypothétique dans un Edge Function
- `supabase/functions/send-push-notification/index.ts:51-52` — Semgrep détecte les marqueurs `-----BEGIN PRIVATE KEY-----`, mais **c'est uniquement du code de parsing** (`.replace("-----BEGIN PRIVATE KEY-----", "")`) sur la clé FCM service-account lue depuis `Deno.env.get(...)`. Pas de fuite.

#### M-3 — Fallback WebSocket `ws://` non-sécurisé (dev-only)
- `src/hooks/useLiveKitRoom.ts:168`, `src/lib/webrtc/peer.ts:75`, `supabase/functions/_shared/livekit-client.ts:175`, `scripts/setup-integrations.sh:113`
- Les sites convertissent `https→wss` et **fallback `http→ws` pour le dev local** — comportement normal. Ajouter un gate prod.

#### M-4 — 26 vulnérabilités "moderate" dans les dépendances
Principalement transitives (hono SSR, `@tootallnate/once` AbortSignal). Non-critiques. À corriger lors du prochain `npm audit fix`.

---

### 🟢 BASSE

- **5 vulns "low"** sur des packages transitifs (ReDoS négligeables).
- **329 findings "medium" SAST** — principalement des conventions (ex. `console.log` en prod, `localStorage` sans chiffrement, etc.). Aucun code malveillant.

---

## 2. Vérifications effectuées — résultats négatifs (RAS)

| Catégorie | Résultat |
| --- | --- |
| Scripts `preinstall` / `postinstall` / `install` / `prepare` | ❌ Aucun dans `package.json` ni `easy-locs-ea1eb0ed/package.json` |
| Dépendances typosquattées / versions pinnées vers commits git | ❌ Aucune — toutes les deps sont publiées sur npm avec versions sémantiques |
| Appels à `eval()` / `new Function()` dans le source runtime | ❌ Aucun usage, seulement des **détections** dans un moteur d'audit interne |
| Usage de `child_process` / `execSync` dans le source client | ❌ Aucun |
| Binaires (`.exe`, `.dll`, `.so`, `.bin`) dans le repo hors `node_modules` | ❌ Aucun |
| Blobs base64 > 400 caractères dans `src/` | ❌ Aucun (la recherche timeout dans `.indexnow-cache.json`, attendu car cache légitime) |
| Fetch vers des domaines externes inconnus | ❌ Les 177 hosts uniques détectés sont tous légitimes (Supabase, Stripe, Mapbox, OSM, PAYD news-portals, etc.) ; `evil.com` uniquement dans fixtures de tests |
| Obfuscation de code (minification hostile, chaînes éclatées) | ❌ Aucune |
| Auteurs git inhabituels sur 30 jours | ❌ Auteurs attendus uniquement : `jstarbuzz`, `easy-locs`, `Replit Agent`, `gpt-engineer-app[bot]` |
| Workflows GitHub Actions altérés | ✅ Un seul workflow `.github/workflows/deploy-now.yml` (IONOS). Utilise `actions/checkout@v4`, `actions/setup-node@v4` et `ionos-deploy-now/deploy-to-ionos@v1` — officiels ou semi-officiels. Pas de code inline suspect. |
| Fichiers hors arborescence normale | ❌ Aucun (quelques scripts d'analyse d'imports à la racine créés pendant des tâches précédentes — code interne non-malveillant) |
| Modifications récentes à `.env` / `.replit` / `.agents/` | ⚠️ `.replit` contient le token Supabase (voir C-1). Pas d'injection, mais exposition réelle. |
| Package.json lifecycle hooks (`predev`, `prebuild`) | ✅ Uniquement `npx tsx scripts/generate-locales.ts` (codegen i18n légitime) |

---

## 3. Plan de remédiation

### Immédiat (critique)
1. **Rotation du token Supabase** `SUPABASE_ACCESS_TOKEN_NEW` (préfixe `sbp_`, valeur complète dans `.replit:51` — à considérer comme compromis) :
   - Révoquer sur https://supabase.com/dashboard/account/tokens
   - Générer un nouveau token
   - Le stocker via Replit Secrets (pas dans `.replit`)
   - Retirer la ligne 51 de `.replit` et la remplacer par une lecture depuis `process.env.SUPABASE_ACCESS_TOKEN_NEW`
2. `npm audit fix` dans `easy-locs-ea1eb0ed` pour adresser jspdf, lodash, flatted, tar, undici, serialize-javascript, etc. (tous des patchs non-breaking).

### Court terme (haute)
3. Wrapper toutes les affectations `innerHTML` dans `src/` via un utilitaire `safeSetHtml()` (déjà présent : `src/lib/utils/sanitize-html.ts`) — au minimum pour les emplacements listés en H-2.
4. Épingler le 3rd-party action `ionos-deploy-now/deploy-to-ionos@v1` par SHA de commit au lieu d'un tag mutable.

### Moyen terme
5. Régler la règle Semgrep "gitleaks openai-api-key" pour exclure les codes de locale `sk-XX`.
6. Gater les fallbacks WebSocket `ws://` derrière `import.meta.env.DEV`.

### Aucune action (pas de menace détectée)
- Pas de suppression de fichiers ou de revert de commits requise.
- Pas de dépendance à retirer pour cause de compromission.
- Pas d'Edge Function malveillante détectée dans cet audit (scope consolidation couvert par tâches #225/#226).

---

## 4. Secrets à faire tourner côté utilisateur

| Secret | Emplacement | Action |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN_NEW` (sbp_…) | `.replit:51` | **Révoquer + régénérer immédiatement** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (anon) | `.replit`, `.env` | ❌ Pas une fuite — c'est la clé publique anon Supabase, exposée par design au navigateur |
| `VITE_SENTRY_DSN` | `.replit:52` | ❌ Pas une fuite — le DSN Sentry est public par design |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` | `.replit`, `.env` | ❌ Pas des secrets |

**Un seul secret à rotate : `SUPABASE_ACCESS_TOKEN_NEW`**.

---

## 5. Méthodologie

1. Scans automatisés exécutés en parallèle via la skill `security_scan` :
   - `runDependencyAudit` (OSV) → 59 vulns (1 critique / 27 high / 26 mod / 5 low)
   - `runSastScan` (Semgrep) → 558 findings (28 HIGH / 329 MEDIUM / 201 LOW)
   - `runHoundDogScan` → échec `HOUNDDOG_CLI_ABNORMAL_EXIT` (tool-level, retry infructueux)
2. `git log --since='30 days ago'` : 80+ commits revus, tous auteurs attendus.
3. `package.json` et `easy-locs-ea1eb0ed/package.json` inspectés pour lifecycle hooks : aucun hook risqué.
4. `.github/workflows/` audité : 1 workflow, pas d'inline script suspect.
5. `.replit`, `.env`, `.npmrc` inspectés : seule `.replit` expose un secret réel.
6. Grep de patterns de malware (`eval`, `Function(`, `child_process`, `atob`, fetch externe, base64 long) : aucun vrai positif.
7. Hosts externes extraits et revus manuellement : 177 domaines uniques, tous légitimes.

---

## 6. Conclusion

**Le projet n'est pas infecté.** Les commits des 30 derniers jours et le code actuel ne contiennent aucun code malveillant, backdoor, exfiltration ou dépendance compromise. La crainte utilisateur est compréhensible mais infondée au regard des preuves.

Les vraies actions prioritaires sont :
1. **Rotation du token Supabase** exposé dans `.replit`.
2. `npm audit fix` pour les 28 CVE hautes/critiques connues.
3. Durcissement léger XSS sur 6 `innerHTML`.

Aucune suppression/nettoyage de code n'est nécessaire.
