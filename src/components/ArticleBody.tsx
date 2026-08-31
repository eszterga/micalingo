import { Link } from 'react-router-dom';

type InlinePart =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'link'; href: string; text: string };

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; parts: InlinePart[] }
  | { type: 'ul'; items: InlinePart[][] }
  | { type: 'ol'; items: InlinePart[][] }
  | { type: 'table'; headers: string[]; rows: string[][] };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      parts.push({ type: 'text', text: text.slice(last, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push({ type: 'bold', text: token.slice(2, -2) });
    } else if (token.startsWith('[')) {
      const m = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) parts.push({ type: 'link', text: m[1], href: m[2] });
    } else if (token.startsWith('*')) {
      parts.push({ type: 'italic', text: token.slice(1, -1) });
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', text }];
}

function renderInline(parts: InlinePart[], keyPrefix: string) {
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.type === 'bold') return <strong key={key}>{part.text}</strong>;
    if (part.type === 'italic') return <em key={key}>{part.text}</em>;
    if (part.type === 'link') {
      if (part.href.startsWith('/')) {
        return (
          <Link key={key} to={part.href} className="text-blue-700 font-bold underline underline-offset-2 hover:text-blue-900">
            {part.text}
          </Link>
        );
      }
      return (
        <a key={key} href={part.href} className="text-blue-700 font-bold underline underline-offset-2 hover:text-blue-900" target="_blank" rel="noopener noreferrer">
          {part.text}
        </a>
      );
    }
    return <span key={key}>{part.text}</span>;
  });
}

function parseTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

export function parseArticleBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      const rows = tableLines.map(parseTableRow).filter((row) => !isSeparatorRow(row));
      if (rows.length >= 2) {
        blocks.push({ type: 'table', headers: rows[0], rows: rows.slice(1) });
      }
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: InlinePart[][] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\s*[-*]\s+/, '')));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: InlinePart[][] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\s*\d+\.\s+/, '')));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].trim().startsWith('|') && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'p', parts: parseInline(para.join(' ').replace(/\s+/g, ' ').trim()) });
  }

  return blocks;
}

export default function ArticleBody({ markdown, className = '' }: { markdown: string; className?: string }) {
  const blocks = parseArticleBlocks(markdown);

  return (
    <div className={`space-y-4 text-gray-700 leading-relaxed ${className}`.trim()}>
      {blocks.map((block, i) => {
        if (block.type === 'h2') {
          return (
            <h2 key={i} className="text-xl md:text-2xl font-extrabold text-blue-950 pt-4">
              {block.text}
            </h2>
          );
        }
        if (block.type === 'h3') {
          return (
            <h3 key={i} className="text-lg font-extrabold text-blue-900 pt-2">
              {block.text}
            </h3>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `ul-${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `ol-${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'table') {
          return (
            <div key={i} className="overflow-x-auto rounded-2xl border border-blue-100 bg-white/80">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-blue-50 text-blue-950">
                    {block.headers.map((h, j) => (
                      <th key={j} className="text-left font-extrabold px-3 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r} className="border-t border-blue-50">
                      {row.map((cell, c) => (
                        <td key={c} className="px-3 py-2 align-top">
                          {renderInline(parseInline(cell), `td-${i}-${r}-${c}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={i} className="font-medium">
            {renderInline(block.parts, `p-${i}`)}
          </p>
        );
      })}
    </div>
  );
}
