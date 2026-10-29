# Bloxity Requirements (read before touching integration, leaderboards, HUD or touch UI)

Not auto-loaded on purpose (kept out of CLAUDE.md). Open it when working on `src/bloxity.js`, leaderboards, HUD/menus (`hud.js`, `hud.css`), touch (`touch.js`, `touch.css`) or deploy.

Sources: https://docs.bloxity.io/#html5 and https://hosting.bloxity.io/docs (fetched 2026-10-30; the docs page is very long and parts were not read, so re-check the live docs and the working example at `bloxity.io/test-game.html` before shipping).

## Hard rules for every implementation

1. **Bloxity integration must work correctly.** Everything below in "Integration" is mandatory, not optional polish.
2. **Leaderboards must be integrated with Bloxity** (`Legion.SDK.leaderboard`), not only localStorage.
3. **Mobile friendly and responsive.** Scalable, changeable UI elements; works in **portrait and landscape** correctly (including live rotation).

## 1. Integration (HTML5 SDK)

- Load the SDK by script tag, never bundle it: `<script src="https://sdk.bloxity.io/v1/legion-sdk.min.js"></script>`.
- `Legion.SDK.init({ gameSlug: '<slug>' })` once. It returns synchronously; use callbacks, not state read right after init.
- Never hardcode Bloxity hosts (`api./play./static.bloxity.io`). Use `Legion.SDK.environment()` (`env, apiUrl, playUrl, staticUrl`) and `onEnvironmentChanged`.
- Right after `init()` and **before** `game.loadingEnd()`: subscribe `auth.onUserChanged` and `settings.listen(...)`.
- Loading: `Legion.SDK.game.loadingStep('...')`, then `Legion.SDK.game.loadingEnd()` when playable.
- **Auth:** `auth.onUserChanged(user => ...)`, `getUser()`, `getToken()`, `isLoggedIn()`. Inside Bloxity the toolbar owns sign-in/out: do not draw login buttons or call `showAuthPopup()` / `logout()` (standalone builds only).
- **Ads (Bloxity runs them; never load an ad script):**
  - `ads.onBreakStart` => pause simulation + mute audio; `ads.onBreakEnd` => resume + restore audio. **Required**, a break can start any time.
  - Rewarded: show the button only if `ads.isAvailable()`; `await ads.showRewarded('placement-name')` (lowercase letters/digits/hyphens, no underscores, never rejects); grant reward only when `status === 'completed'`. Server games verify `rewardToken` via `POST {apiUrl}/v1/ads/reward/verify` (`{gameSlug, rewardToken}`, grant only on `valid:true`, single use, 5 min).
  - Optional screen ads: `ads.screen('menu'|'lobby'|'results'|'panel'|'gameplay', {skip:[...], sizes:{...}})`, `screen.hide()`. Keep own UI centered; never size/position banners.
- **Settings:** `settings.listen('master_volume' | 'music_volume' | 'graphics_quality' ...)` once per key; registering enables the portal control. `settings.triggerAll()` after systems exist. Fullscreen via `Legion.SDK.portal.requestFullscreen()`. Parse `music_volume` defensively (fallback 80).
- **Player events:** `player.onEvent` handles `respawn_request` (Reset Character), `chat_message_sent`, `pointer_lock_changed`.
- **Death screen** (anywhere the player can die): `deathScreen.show()`, `death.onCountdown(n)`, respawn only when `death.respawn()` returns true (never on a timer), `deathScreen.hide()` if the round ends. Death UI centered.
- **Do not build Bloxity-provided UI:** menu, chat box, emote picker, invite, leaderboard button, sign-in.
- **HUD placement:** keep HUD out of the top-left corner; read `Legion.SDK.ui.onReservedAreasChange(areas => placeHud(areas))` and lay out around the reserved areas.
- **Gems (purchases):** `gems.requestPurchase('<sku>')` with SKU only, never prices; match errors on `code`; one purchase at a time; `gems.getBalance()`. Webhook must 2xx within 10 s.
- **Hosted multiplayer:** `const {endpoint} = await Legion.SDK.net.resolveEndpoint('<gameId>'); new Client(endpoint)` (new Client per resolve, never reuse; never connect to `<id>.host.bloxity.io`). Retry with backoff, give up ~60 s; re-resolve on unexpected room close.

## 2. Leaderboards (mandatory)

- Ask the owner which boards they want before adding any.
- Declare once right after init (even if the server submits scores; it creates the trophy button):
  ```js
  Legion.SDK.leaderboard.define([
    { id: 'wins', label: 'Wins', order: 'desc', mode: 'best', format: 'compact', reset: 'weekly' },
  ]);
  ```
  - `id`: `a-z 0-9 _ -`, max 32 chars, permanent. `order`: `desc|asc`. `mode`: `best|sum|latest`. `format`: `number|compact|time`(ms). `reset`: `none|daily|weekly|monthly`. Max 10 boards. Later code changes to an existing board are ignored (dashboard owns it).
- Submit only when a score is **final**, never per frame: `await Legion.SDK.leaderboard.submit('wins', value)` returns `{board, results:[{period, rank, score, improved}]}` or null. `sum` boards: send the delta; `best`/`latest`: send the score.
- Read/show: `getTop(id,{period,limit})`, `getMine(id)`, `open(id)` (returns false outside Bloxity, so hide any custom button then).
- Server-side (hosted): `POST {apiUrl}/v1/leaderboards/hosted/${BLOXITY_GAME_ID}/report` with `Bearer BLOXITY_REPORT_TOKEN`, `{boards?, scores:[{board,userId:'legion_<id>',score}]}`; max 200 per call, batch 10-30 s and at round end; only `legion_` identities (strip `#m...`); log `dropped` counts.
- Verify: finish a run in the game's Bloxity page and confirm the score appears under the toolbar trophy.
- Keep local save as an offline fallback only; Bloxity is the source for competitive ranking.

## 3. Hosting / deploy

- Frontend: zip the build output and upload via My Games or `POST https://api.bloxity.io/v1/hosting/games/<gameId>/frontend?channel=dev&version=<sha>` (`Authorization: Bearer $LEGION_DEPLOY_TOKEN`, `Content-Type: application/zip`). `version` is required. Served at `https://<gameId>.play.bloxity.io` (dev: `.dev.play.`).
- Backend (if used): Docker, listen on `$PORT`, fast `GET /health` 200, non-root, drain on SIGTERM, `seatCap` = room `maxClients`, GHCR package public after first push.
- Use relative asset paths (Vite `base: './'`) so the zip works under any host path.

## 4. Mobile and responsive UI/UX (mandatory)

Applies to every screen: lobby, HUD, menus, shop, results, death UI, popups.

- **Both orientations work, including live rotation** (`resize` / `orientationchange` / `visualViewport`): no clipped, overlapping or unreachable UI, no forced-orientation lock screen. Test portrait (e.g. 390x844) and landscape (844x390), plus tablet and desktop.
- **Scalable, changeable UI elements:** size and position all UI from central tokens, not magic numbers per widget.
  - Single scale source, e.g. CSS vars on `:root` (`--ui-scale`, `--gap`, `--font-*`, `--btn-size`) driven by viewport (`clamp()`, `vmin`, container sizing), recomputed on resize/orientation change.
  - HUD pieces are anchored (corner/edge/center) with safe-area insets (`env(safe-area-inset-*)`) and honor Bloxity reserved areas (top-left kept free).
  - One place to change a widget's size/anchor per orientation (layout config), so a UI element can be moved/resized without touching logic.
- **Touch:** controls >= 44 px hit targets, no hover-only actions, `touch-action` set to avoid page scroll/zoom, multi-touch (move + action) works, pointer events over mouse-only. Touch controls only shown on touch devices; keyboard/mouse still work on desktop.
- **Rendering:** canvas resizes with `devicePixelRatio` capped (e.g. <= 2) and camera aspect/FOV adjusted per orientation so the playfield stays visible; keep perf budget for mid-range phones (graphics_quality setting should lower shadows/postfx/resolution).
- Text readable at small sizes; modals scroll internally and fit the viewport; no fixed-pixel layouts that break at 320 px wide.
- Pause/mute on tab hidden and on ad break; fullscreen via the portal call.

### Project conventions (moved from CLAUDE.md)
- **Input:** every action needs a touch path. Use Pointer Events (check `e.pointerType`), never mouse-only events. `src/touch.js`: left-thumb joystick -> `inputState.move`, right-side drag -> `inputState.look`, buttons for jump/sprint/mode, pinch -> `inputState.zoom`. All input feeds `inputState` in `src/input.js` so game code stays input-agnostic. No pointer lock on touch; never rely on it.
- **Detection:** `matchMedia('(pointer: coarse)')` / `navigator.maxTouchPoints`, not the user agent. Show touch controls only on coarse pointers; a device can have both.
- **Layout/UI:** relative units (`%`, `vw/vh`, `dvh`, `clamp()`) with flexbox/grid, no fixed-pixel layouts. Tap targets >= 44px. `env(safe-area-inset-*)` (viewport already has `viewport-fit=cover`). Readable at 360px width. No hover-only interactions. `touch-action: none` on the canvas and game controls.
- **Resize/orientation:** camera aspect, renderer and HUD react to `resize` (covers orientation); use `visualViewport` where keyboards/browser bars matter.
- **Performance:** respect `graphics_quality` presets in `src/config.js` (cap DPR, shadow map, draw distance); default lower on coarse pointers. Avoid per-frame allocations; keep draw calls and texture sizes low.
- **Testing:** check every UI/input change at 375x812 and 812x375 with touch emulation, plus desktop, before calling it done.

## 5. Definition of done checklist

- [ ] SDK loaded via script tag; `init` with `gameSlug`; no hardcoded Bloxity URLs
- [ ] `onUserChanged` + `settings.listen` registered before `loadingEnd()`
- [ ] Ad break pause/mute implemented; rewarded ads granted only on `completed`
- [ ] Boards `define`d (owner-approved), scores submitted when final, trophy shows the score
- [ ] HUD avoids reserved areas / top-left; no duplicate Bloxity UI
- [ ] Death screen flow (if players can die)
- [ ] Portrait + landscape verified with live rotation; touch controls work
- [ ] UI sized from central scale tokens; changing a token resizes everything consistently
- [ ] Build zipped and uploaded with `version`
