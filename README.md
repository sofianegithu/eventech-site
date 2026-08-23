# Eventech

Marketing site for **Eventech** — a Silicon Valley AI company building automation, intelligent products, and custom AI solutions.

## Stack

- Static HTML / CSS / vanilla JS
- Inter + JetBrains Mono (Google Fonts)
- Hosted on **Vercel**, custom domain on **Hostinger**, source on **GitHub**
- Contact form: FormSubmit → forwards to Hostinger email

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

## Project structure

```
eventech-site/
├── index.html      # single-page landing
├── styles.css      # design system
├── script.js       # nav, reveal, cursor
└── README.md
```

## Contact

Form submissions go to FormSubmit, which forwards to the configured Hostinger mailbox.
