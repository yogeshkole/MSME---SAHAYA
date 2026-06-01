// Post-build: ensure custom _routes.json (only /api/* hits the worker; everything
// else is served as a static asset by Cloudflare Pages, including index.html at /).
import { writeFileSync, copyFileSync, existsSync } from 'node:fs'

writeFileSync('dist/_routes.json', JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }))

// Ensure index.html is at dist root so Pages serves it at "/"
if (existsSync('public/index.html')) {
  copyFileSync('public/index.html', 'dist/index.html')
}
console.log('postbuild: _routes.json + index.html ready')
