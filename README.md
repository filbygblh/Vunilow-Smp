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

`vunilowsmp.net` stays the Minecraft address: `A` → `143.20.135.5` plus an `_minecraft._tcp` SRV record. The website is served from `www.` only, because Cloudflare's proxy cannot carry Minecraft's game traffic and both editions (Java and Bedrock, port 25565) answer on the apex.

`play.vunilowsmp.net` also resolves to the same server as an alias. It is not advertised on the site; Java players should keep using `vunilowsmp.net`.

## Editing

- Copy, rules and links live in `index.html`.
- Server/voice-chat logos: `logo.png`. The voice-chat card draws its icon as inline SVG, so it needs no image file.
- Social links: YouTube (`@vunilow`) and Twitch (`vunilowttv`) — edit the `.yt` / `.tw` anchors in `index.html`.
