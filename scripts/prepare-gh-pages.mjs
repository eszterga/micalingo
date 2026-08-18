import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PUBLIC_SPA_ROUTES,
  SITEMAP_ENTRIES,
  absoluteUrl,
  languageUrl,
  HREFLANG_TAGS,
  SEO_LANGS,
  PAGE_META,
} from './seo-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html missing. Run vite build first.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

function applyPageMeta(html, route) {
  const canonical = absoluteUrl(route);
  const meta = PAGE_META[route] || PAGE_META['/'];
  const hreflang = HREFLANG_TAGS(route)
    .map((alt) => `<link rel="alternate" hreflang="${alt.lang}" href="${alt.href}" />`)
    .join('\n    ');

  let next = html
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`
    )
    .replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]+"\s*\/?>\s*/gi, '')
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${canonical}" />\n    ${hreflang}`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${canonical}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
    );

  return next;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  for (const { path: route, changefreq, priority } of SITEMAP_ENTRIES) {
    for (const lang of SEO_LANGS) {
      const loc = languageUrl(route, lang);
      const alts = HREFLANG_TAGS(route)
        .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}" />`)
        .join('\n');
      urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alts}
  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

// Prevent Jekyll from rewriting or hiding files on GitHub Pages.
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

// GitHub Pages SPA fallback for unknown deep links (still HTTP 404 status).
fs.writeFileSync(path.join(distDir, '404.html'), applyPageMeta(indexHtml, '/'), 'utf8');

// Materialize public routes as real files so Google gets HTTP 200 + correct path.
for (const route of PUBLIC_SPA_ROUTES) {
  const html = applyPageMeta(indexHtml, route);
  if (route === '/') {
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    continue;
  }
  const segments = route.replace(/^\//, '').split('/');
  const dir = path.join(distDir, ...segments);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}

const sitemap = buildSitemap();
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.resolve(__dirname, '..', 'public', 'sitemap.xml'), sitemap, 'utf8');

console.log(
  `Prepared GitHub Pages SEO: 404.html + ${PUBLIC_SPA_ROUTES.length} route shells + sitemap (${SITEMAP_ENTRIES.length * SEO_LANGS.length} URLs).`
);
