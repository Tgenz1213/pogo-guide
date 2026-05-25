# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Cloudflare Worker Deployment

This app is configured to build for Cloudflare Workers using Nitro's `cloudflare-module` preset.

1. Build the Cloudflare output:

   pnpm build:cloudflare

2. Preview the Cloudflare build locally:

   pnpm preview:cloudflare

3. Deploy to Cloudflare Workers:

   pnpm deploy:cloudflare

Notes:

- The Cloudflare output is generated into `.cloudflare/`.
- Deploy and preview run with `wrangler --cwd .cloudflare ...` to use Nitro-generated worker config.
- You must be authenticated with Cloudflare (`wrangler login`) before deploy.
