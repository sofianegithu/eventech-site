# Eventech

Marketing site for **Eventech** — a Silicon Valley AI & automation studio founded in 2026 by Sofiane Moudjahed.

## Stack

- Static HTML / CSS / vanilla JS — no build step
- Inter + JetBrains Mono (Google Fonts)
- Hosted on **Vercel**, custom domain on **Hostinger**, source on **GitHub**
- Contact form: **FormSubmit** → forwards to Hostinger mailbox (`help@eventech.cloud`)
- AI search: **IndexNow** for instant Bing/Yandex indexing

## Local preview

```bash
python -m http.server 5180 --bind 127.0.0.1
# → http://127.0.0.1:5180
```

## Deploy

Pushes to `main` auto-deploy via Vercel.

```bash
git push origin main
```

## Ping search engines (IndexNow)

After every deploy, ping Bing/Yandex/Naver with the updated URLs:

```bash
node scripts/ping-indexnow.js
# or just one URL:
node scripts/ping-indexnow.js https://eventech.cloud/insights/some-new-article.html
```

This requires `node` on PATH. The script reads all URLs from `sitemap.xml` by default.

The IndexNow key file is hosted at `https://eventech.cloud/indexnow-<KEY>.txt`. If you rotate the key, regenerate the key file and update the `KEY` constant in `scripts/ping-indexnow.js`.

## Project structure

```
eventech-site/
├── index.html                                 # home page
├── about.html                                 # about + founder
├── press.html                                 # press kit / brand assets
├── terms.html                                 # terms & conditions
├── refund.html                                # refund policy
├── services/
│   ├── ai-automation-for-operations.html
│   ├── ai-product-development.html
│   └── custom-ai-systems.html
├── insights/
│   ├── index.html                             # articles hub
│   ├── rag-vs-fine-tuning.html
│   └── why-we-built-eventech.html
├── styles.css                                 # design system
├── script.js                                  # nav, reveal, cursor, three.js hero
├── logo.svg / favicon.svg / og-image.svg      # brand assets
├── robots.txt / sitemap.xml / llms.txt        # SEO / AEO
├── scripts/
│   └── ping-indexnow.js                       # IndexNow notifier
└── indexnow-<KEY>.txt                         # IndexNow key verification
```

## Contact

- General: `help@eventech.cloud`
- Press: `press@eventech.cloud`

Form submissions go to FormSubmit, which forwards to the configured Hostinger mailbox.
