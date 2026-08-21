# Deploy on Netlify

## Option A — drag & drop (fastest)

1. In this folder run:
   ```bash
   npm install
   npm run build
   ```
2. Open [Netlify Drop](https://app.netlify.com/drop)
3. Upload the **`dist`** folder (not the whole project)

## Option B — Git / Netlify site settings

- Base directory: `food contracts/poc-dashboard` (or this folder if it’s the repo root)
- Build command: `npm run build`
- Publish directory: `dist`

`netlify.toml` is already configured for Option B.
