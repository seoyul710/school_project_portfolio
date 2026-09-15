import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'

function socialMetadata(): Plugin {
  return {
    name: 'portfolio-social-metadata',
    transformIndexHtml() {
      const siteUrl = process.env.VITE_SITE_URL?.replace(/\/$/, '')
      if (!siteUrl) return []
      return [
        { tag: 'meta', attrs: { property: 'og:url', content: siteUrl }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image', content: `${siteUrl}/og.png` }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:image', content: `${siteUrl}/og.png` }, injectTo: 'head' },
      ]
    },
  }
}

export default defineConfig(async ({ command, isPreview }) => ({
  base: './',
  server: {
    host: '127.0.0.1',
    cors: false,
    watch: { ignored: ['**/.project-registration*', '**/.projects-*.tmp'] },
  },
  plugins: [react(), sites(), socialMetadata(),
    command === 'serve' && !isPreview
      // A literal import lets Vite track and reload the API and its dependencies.
      ? (await import('./scripts/local-project-api.mjs')).localProjectsPlugin()
      : null,
  ],
}))
