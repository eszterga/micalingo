/**
 * Unique HTML for the first response of public pages.
 * AdSense reviews the raw HTML as well as the rendered app. These bodies
 * repeat the same English lessons the React pages show.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_META, routeCanonicalPath } from './seo-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const learnSource = [
  fs.readFileSync(path.join(root, 'src/lib/publicPrivateGuide.ts'), 'utf8'),
  fs.readFileSync(path.join(root, 'src/lib/learnContent.ts'), 'utf8'),
].join('\n');
const enSource = fs.readFileSync(path.join(root, 'src/en.ts'), 'utf8');
const dataSource = fs.readFileSync(path.join(root, 'src/lib/public-data.ts'), 'utf8');

function readTemplate(source, backtickIndex) {
  let i = backtickIndex + 1;
  let out = '';
  while (i < source.length) {
    if (source[i] === '\\') {
      const n = source[i + 1];
      if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === '`' || n === '\\' || n === '$') out += n;
      else out += n ?? '';
      i += 2;
      continue;
    }
    if (source[i] === '`') return { text: out, end: i + 1 };
    out += source[i];
    i += 1;
  }
  throw new Error('Unterminated template literal');
}

function readQuoted(source, quoteIndex) {
  const quote = source[quoteIndex];
  let i = quoteIndex + 1;
  let out = '';
  while (i < source.length) {
    if (source[i] === '\\') {
      const n = source[i + 1];
      out += n === 'n' ? '\n' : (n ?? '');
      i += 2;
      continue;
    }
    if (source[i] === quote) return out;
    out += source[i];
    i += 1;
  }
  return out;
}

function englishValue(block) {
  const templateAt = block.indexOf('en: `');
  const singleAt = block.indexOf("en: '");
  const doubleAt = block.indexOf('en: "');
  const options = [
    templateAt >= 0 ? { at: templateAt, kind: 'template' } : null,
    singleAt >= 0 ? { at: singleAt, kind: 'quote' } : null,
    doubleAt >= 0 ? { at: doubleAt, kind: 'quote' } : null,
  ].filter(Boolean);
  options.sort((a, b) => a.at - b.at);
  const first = options[0];
  if (!first) return '';
  if (first.kind === 'template') return readTemplate(block, first.at + 4).text;
  return readQuoted(block, first.at + 4);
}

function fieldBlock(block, name) {
  const start = block.indexOf(`${name}:`);
  if (start < 0) return '';
  let end = block.length;
  for (const other of ['title:', 'description:', 'body:']) {
    if (other === `${name}:`) continue;
    const at = block.indexOf(other, start + name.length + 1);
    if (at > start && at < end) end = at;
  }
  return block.slice(start, end);
}

function extractGuides(source) {
  const guides = [];
  const re = /slug:\s*'([^']+)'/g;
  const matches = [...source.matchAll(re)];
  for (let n = 0; n < matches.length; n += 1) {
    const start = matches[n].index ?? 0;
    const end = n + 1 < matches.length ? (matches[n + 1].index ?? source.length) : source.length;
    const block = source.slice(start, end);
    const title = englishValue(fieldBlock(block, 'title'));
    const description = englishValue(fieldBlock(block, 'description'));
    const body = englishValue(fieldBlock(block, 'body'));
    if (!title || !body) continue;
    guides.push({ slug: matches[n][1], title, description, body });
  }
  return guides;
}

function extractNamedArticle(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`);
  if (start < 0) return '';
  const idx = source.indexOf('en: `', start);
  if (idx < 0) return '';
  return readTemplate(source, idx + 4).text;
}

function extractPrimers(source) {
  const start = source.indexOf('const GRAMMAR_PRIMERS');
  const end = source.indexOf('export const HOME_ARTICLE');
  const block = source.slice(start, end);
  const primers = {};
  const re = /(?:^|\n) {2}('sentence-structure'|cases|tenses|articles|adjectives|prepositions): \{/g;
  const matches = [...block.matchAll(re)];
  for (let n = 0; n < matches.length; n += 1) {
    const from = matches[n].index ?? 0;
    const to = n + 1 < matches.length ? (matches[n + 1].index ?? block.length) : block.length;
    const text = englishValue(block.slice(from, to));
    if (text) primers[matches[n][1].replace(/'/g, '')] = text;
  }
  return primers;
}

function extractQuoted(source, key) {
  const marker = `${key}: "`;
  const start = source.indexOf(marker);
  if (start < 0) return '';
  let i = start + marker.length;
  let out = '';
  while (i < source.length) {
    if (source[i] === '\\') {
      const n = source[i + 1];
      if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === '"' || n === '\\') out += n;
      else out += n ?? '';
      i += 2;
      continue;
    }
    if (source[i] === '"') return out;
    out += source[i];
    i += 1;
  }
  return '';
}

function extractWords(exportName, limit) {
  const start = dataSource.indexOf(`export const ${exportName}`);
  if (start < 0) return [];
  const bracket = dataSource.indexOf('= [', start);
  if (bracket < 0) return [];
  let depth = 0;
  let end = bracket;
  for (let i = bracket; i < dataSource.length; i += 1) {
    if (dataSource[i] === '[') depth += 1;
    else if (dataSource[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = dataSource.slice(bracket, end);
  const words = [];
  const re = /german:\s*"((?:\\.|[^"\\])*)"\s*,\s*hungarian:\s*"((?:\\.|[^"\\])*)"/g;
  let match = re.exec(body);
  while (match && words.length < limit) {
    words.push({
      german: match[1].replace(/\\"/g, '"'),
      hungarian: match[2].replace(/\\"/g, '"'),
    });
    match = re.exec(body);
  }
  return words;
}

const guides = extractGuides(learnSource);
const guidesBySlug = Object.fromEntries(guides.map((guide) => [guide.slug, guide]));
const primers = extractPrimers(learnSource);
const quizIndex = extractNamedArticle(learnSource, 'QUIZ_INDEX_ARTICLE');

const TOPIC_EXPORT = {
  vocabulary: 'publicVocabulary',
  phrases: 'publicPhrases',
  articles: 'publicArticles',
  prepositions: 'publicPrepositions',
  adjectives: 'publicAdjectives',
};

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineHtml(text) {
  const escaped = esc(text);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_all, label, href) => {
      const safeHref = esc(href);
      return `<a href="${safeHref}">${label}</a>`;
    })
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      html.push(`<h2>${inlineHtml(line.slice(3).trim())}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith('### ')) {
      html.push(`<h3>${inlineHtml(line.slice(4).trim())}</h3>`);
      i += 1;
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(
          lines[i]
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim())
        );
        i += 1;
      }
      const header = rows[0] || [];
      const body = rows.slice(1).filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
      html.push(
        `<table><thead><tr>${header.map((cell) => `<th>${inlineHtml(cell)}</th>`).join('')}</tr></thead><tbody>${body
          .map((cells) => `<tr>${cells.map((cell) => `<td>${inlineHtml(cell)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`
      );
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(`<li>${inlineHtml(lines[i].replace(/^[-*] /, ''))}</li>`);
        i += 1;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li>${inlineHtml(lines[i].replace(/^\d+\. /, ''))}</li>`);
        i += 1;
      }
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    const para = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^(## |### |[-*] |\d+\. )/.test(lines[i]) && !lines[i].trim().startsWith('|')) {
      para.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${inlineHtml(para.join(' '))}</p>`);
  }
  return html.join('\n');
}

function wordTable(words, germanLabel, meaningLabel) {
  if (!words.length) return '';
  const rows = words
    .map((word) => `<tr><td>${esc(word.german)}</td><td>${esc(word.hungarian)}</td></tr>`)
    .join('');
  return `<table><thead><tr><th>${esc(germanLabel)}</th><th>${esc(meaningLabel)}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function guideList() {
  return `<ul>${guides
    .map(
      (guide) =>
        `<li><a href="/learn/${guide.slug}"><strong>${esc(guide.title)}</strong></a> — ${esc(guide.description)}</li>`
    )
    .join('')}</ul>`;
}

function legalSections(prefix, count) {
  const parts = [];
  const title = extractQuoted(enSource, `${prefix}_title`);
  const intro = extractQuoted(enSource, `${prefix}_intro`);
  if (title) parts.push(`<h1>${esc(title)}</h1>`);
  if (intro) parts.push(`<p>${esc(intro)}</p>`);
  for (let n = 1; n <= count; n += 1) {
    const heading = extractQuoted(enSource, `${prefix}_s${n}_title`);
    const body = extractQuoted(enSource, `${prefix}_s${n}_body`);
    if (heading) parts.push(`<h2>${esc(heading)}</h2>`);
    if (body) {
      for (const paragraph of body.split(/\n\n+/)) {
        if (paragraph.trim()) parts.push(`<p>${esc(paragraph.trim())}</p>`);
      }
    }
  }
  return parts.join('\n');
}

function aboutHtml() {
  const blocks = [
    ['about_title', 'h1'],
    ['about_heading', 'h2'],
    ['about_body', 'p'],
    ['about_mission', 'p'],
    ['about_who_heading', 'h2'],
    ['about_who_body', 'p'],
    ['about_how_heading', 'h2'],
    ['about_how_body', 'p'],
    ['about_for_heading', 'h2'],
    ['about_for_body', 'p'],
    ['contact_heading', 'h2'],
    ['contact_body', 'p'],
  ];
  return blocks
    .map(([key, tag]) => {
      const text = extractQuoted(enSource, key).replaceAll('{support_link}', 'Support MicaLingo');
      if (!text) return '';
      return `<${tag}>${esc(text)}</${tag}>`;
    })
    .filter(Boolean)
    .join('\n');
}

export function staticBodyForRoute(route) {
  const pathName = routeCanonicalPath(route);
  if (pathName === '/') {
    const about = extractQuoted(enSource, 'home_about').replaceAll('{support_link}', 'Support MicaLingo');
    const contact = extractQuoted(enSource, 'home_disclaimer').replaceAll('{email}', 'support.micalingo@gmail.com');
    return `<h1>Learn German with MicaLingo</h1>
<p>${esc(about)}</p>
<p>${esc(contact)}</p>
<h2>Study guides</h2>
${guideList()}
<p>Public quizzes and grammar explanations are open without an account. <a href="/quizzes">Start with the quizzes</a> or <a href="/grammar">read the grammar primers</a>.</p>`;
  }
  if (pathName === '/learn') {
    return `<h1>German study guides</h1>
<p>Original explanations for Hungarian and English speakers learning German. Each guide stays on the page — it is not a link list to another site.</p>
${guideList()}`;
  }
  if (pathName.startsWith('/learn/')) {
    const guide = guidesBySlug[pathName.slice('/learn/'.length)];
    if (!guide) return '';
    return `<h1>${esc(guide.title)}</h1><p>${esc(guide.description)}</p>${markdownToHtml(guide.body)}`;
  }
  if (pathName === '/grammar') {
    const links = Object.keys(primers)
      .map((id) => `<li><a href="/grammar/${id}">${esc(id.replace(/-/g, ' '))}</a></li>`)
      .join('');
    return `<h1>German grammar</h1><ul>${links}</ul>${Object.entries(primers)
      .map(([id, text]) => `<h2>${esc(id.replace(/-/g, ' '))}</h2>${markdownToHtml(text)}`)
      .join('\n')}`;
  }
  if (pathName.startsWith('/grammar/')) {
    const id = pathName.slice('/grammar/'.length);
    const primer = primers[id];
    if (!primer) return '';
    const meta = PAGE_META[pathName];
    return `<h1>${esc(meta?.title || id)}</h1>${markdownToHtml(primer)}<p><a href="/grammar">All grammar topics</a></p>`;
  }
  if (pathName === '/quizzes') {
    return `<h1>German quizzes</h1>${markdownToHtml(quizIndex)}`;
  }
  if (pathName.startsWith('/quizzes/')) {
    const topic = pathName.slice('/quizzes/'.length);
    const meta = PAGE_META[pathName];
    const primerId = topic === 'verbs' ? 'tenses' : topic;
    const primer = primers[primerId] || '';
    const words = TOPIC_EXPORT[topic] ? extractWords(TOPIC_EXPORT[topic], 12) : [];
    return `<h1>${esc(meta?.title || topic)}</h1>
<p>${esc(meta?.description || '')}</p>
${primer ? markdownToHtml(primer) : ''}
${wordTable(words, 'German', 'Hungarian')}
<p><a href="/quizzes">All quizzes</a></p>`;
  }
  if (pathName === '/about') return aboutHtml();
  if (pathName === '/privacy') return legalSections('privacy', 13);
  if (pathName === '/terms') return legalSections('terms', 12);
  if (pathName === '/cookies') return legalSections('cookies', 8);
  if (pathName === '/impressum') return legalSections('impressum', 6);
  if (pathName === '/vocabulary') {
    return `<h1>German vocabulary</h1>
<p>${esc(PAGE_META['/vocabulary']?.description || '')}</p>
${wordTable(extractWords('publicVocabulary', 15), 'German', 'Hungarian')}
<p>Practise the same words in the <a href="/quizzes/vocabulary">vocabulary quiz</a>.</p>`;
  }
  if (pathName === '/learning-materials/reading/false-friends') {
    return `<h1>German false friends for Hungarian speakers</h1>
<p>These words look familiar and mean something else. The note is the usual mistake.</p>
${wordTable(extractWords('publicFalseFriends', 12), 'German', 'Hungarian')}
<p><a href="/learning-materials/reading">More reading</a></p>`;
  }
  if (pathName === '/library' || pathName === '/learning-materials' || pathName === '/learning-materials/reading' || pathName === '/learning-materials/listening') {
    const meta = PAGE_META[pathName];
    return `<h1>${esc(meta?.title || 'MicaLingo')}</h1><p>${esc(meta?.description || '')}</p>${guideList()}`;
  }
  return '';
}

export const STATIC_CONTENT_STYLE = `<style>
      #static-content{max-width:48rem;margin:1.5rem auto 2.5rem;padding:0 1.25rem;font-family:Georgia,"Iowan Old Style","Palatino Linotype",serif;color:#0f172a;line-height:1.65}
      #static-content h1,#static-content h2,#static-content h3{font-family:system-ui,sans-serif;line-height:1.25;color:#172554}
      #static-content h1{font-size:1.85rem;margin:0 0 .75rem}
      #static-content h2{font-size:1.25rem;margin:1.6rem 0 .45rem}
      #static-content h3{font-size:1.05rem;margin:1.2rem 0 .35rem}
      #static-content p,#static-content ul,#static-content ol{margin:.7rem 0}
      #static-content a{color:#1d4ed8}
      #static-content table{border-collapse:collapse;width:100%;margin:1rem 0;font-family:system-ui,sans-serif;font-size:.95rem}
      #static-content th,#static-content td{border:1px solid #cbd5e1;padding:.4rem .6rem;text-align:left;vertical-align:top}
      #static-content th{background:#eff6ff}
      body:has(#root > *) #static-content{display:none}
    </style>`;
