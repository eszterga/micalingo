import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_SPA_ROUTES, SITEMAP_ENTRIES, absoluteUrl } from './seo-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html missing. Run vite build first.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Prevent Jekyll from rewriting or hiding files on GitHub Pages.
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

// GitHub Pages SPA fallback for unknown deep links (still HTTP 404 status).
fs.copyFileSync(indexHtmlPath, path.join(distDir, '404.html'));

// Materialize public routes as real files so Google gets HTTP 200 + correct path.
for (const route of PUBLIC_SPA_ROUTES) {
  if (route === '/') continue;
  const segments = route.replace(/^\//, '').split('/');
  const dir = path.join(distDir, ...segments);
  fs.mkdirSync(dir, { recursive: true });
  const pagePath = path.join(dir, 'index.html');
  const canonical = absoluteUrl(route);
  // Inject the correct canonical into each static HTML shell for first crawl.
  const html = indexHtml
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${canonical}" />`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${canonical}" />`
    );
  fs.writeFileSync(pagePath, html, 'utf8');
}

// Keep sitemap.xml generated from the same route list (no hash URLs).
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_ENTRIES.map(
  ({ path: p, changefreq, priority }) => `  <url>
    <loc>${absoluteUrl(p)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
// Also refresh public/ so repo source stays aligned for the next deploy.
fs.writeFileSync(path.resolve(__dirname, '..', 'public', 'sitemap.xml'), sitemap, 'utf8');

console.log(
  `Prepared GitHub Pages SEO: 404.html + ${PUBLIC_SPA_ROUTES.length - 1} route shells + sitemap (${SITEMAP_ENTRIES.length} URLs).`
);
