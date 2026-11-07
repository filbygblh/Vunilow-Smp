# Vunilow Smp — website

Static site for the Vunilow Smp Minecraft server. No build step: `index.html` is the whole site, with inline CSS/JS.

- Live at **https://www.vunilowsmp.net**
- Server address: **vunilowsmp.net** (Java) · **vunilowsmp.net:25565** (Bedrock)

## How it is hosted

**GitHub Pages** (repo `filbygblh/Vunilow-Smp`, branch `main`).
The `CNAME` file pins the custom domain to `www.vunilowsmp.net`, and Cloudflare DNS has a `www` CNAME → `filbygblh.github.io`.

Every push to `main` is live within a minute or two. To publish manually: GitHub repo → **Settings → Pages** → confirm the custom domain and that *Enforce HTTPS* is on.

## Live server status

The hero pill calls `https://api.mcsrvstat.us/3/Vunilowsmp.net` in the browser (CORS is open, no key needed) and refreshes every 60 seconds. It shows the online/offline state, players online / max slots, server software and version. If the API is unreachable the pill says so and the rest of the page is unaffected.

## The bare domain (vunilowsmp.net) and Minecraft

`vunilowsmp.net` currently has an `A` record → `143.20.135.5` (the Minecraft server) plus an `_minecraft._tcp` SRV record. That is why the site only answers on `www.`

Do **not** point the apex at the website without moving Minecraft off it first: the apex is the address players type, and Cloudflare's proxy (orange cloud) cannot carry Minecraft's TCP traffic. The safe cutover, when you want the site on the bare domain:

1. Add `play` → `A` → `143.20.135.5`, **DNS only** (grey cloud).
2. Change the SRV target `_minecraft._tcp.vunilowsmp.net` to `play.vunilowsmp.net` (port 25565).
3. Point the apex `A` records at GitHub Pages (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) and add `vunilowsmp.net` as a custom domain for the Pages site.

Java players are carried across by the SRV record, so `vunilowsmp.net` keeps working in-game. **Bedrock ignores SRV**, so Bedrock players would need `play.vunilowsmp.net:25565`.

## Editing

- Copy, rules and links live in `index.html`.
- Server/voice-chat logos: `logo.png`. The voice-chat card draws its icon as inline SVG, so it needs no image file.
- Social links: YouTube (`@vunilow`) and Twitch (`vunilowttv`) — edit the `.yt` / `.tw` anchors in `index.html`.
