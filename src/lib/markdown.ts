const PLACEHOLDER_BASE = '\uE000';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function placeholder(index: number): string {
  return `${PLACEHOLDER_BASE}${index}${PLACEHOLDER_BASE}`;
}

/**
 * Render the inline Markdown subset used by resume fields.
 *
 * User content is escaped before formatting, and HTML is never accepted from
 * the source. Inline code is extracted first so formatting characters inside
 * code spans remain literal.
 */
export function renderInlineMarkdown(text: unknown): string {
  if (text == null) return '';

  const protectedSegments: string[] = [];
  let html = String(text);

  html = html.replace(
    /(`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g,
    (match, _token, codeText) => {
      const rendered = codeText !== undefined
        ? `<code>${escapeHtml(codeText)}</code>`
        : (() => {
            const linkMatch = match.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
            if (!linkMatch) return escapeHtml(match);
            return `<a href="${escapeHtml(linkMatch[2])}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkMatch[1])}</a>`;
          })();
      protectedSegments.push(rendered);
      return placeholder(protectedSegments.length - 1);
    },
  );

  html = escapeHtml(html)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>');

  return html.replace(new RegExp(`${PLACEHOLDER_BASE}(\\d+)${PLACEHOLDER_BASE}`, 'g'), (_, index) => {
    return protectedSegments[Number(index)] ?? '';
  });
}

export interface MarkdownBlockOptions {
  listStyle?: string;
  lineBreak?: boolean;
}

export interface MarkdownTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  link?: string;
}

/**
 * Parse the same inline Markdown subset into plain runs for formats such as
 * DOCX that need styling metadata instead of HTML tags.
 */
export function parseInlineMarkdownRuns(text: unknown): MarkdownTextRun[] {
  if (text == null) return [];
  const html = renderInlineMarkdown(text);
  const runs: MarkdownTextRun[] = [];
  const tokenPattern =
    /<strong>([\s\S]*?)<\/strong>|<em>([\s\S]*?)<\/em>|<del>([\s\S]*?)<\/del>|<code>([\s\S]*?)<\/code>|<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|([^<]+)/g;

  for (const match of html.matchAll(tokenPattern)) {
    if (match[7] !== undefined) {
      runs.push({ text: match[7] });
      continue;
    }
    if (match[1] !== undefined) runs.push({ text: match[1], bold: true });
    if (match[2] !== undefined) runs.push({ text: match[2], italic: true });
    if (match[3] !== undefined) runs.push({ text: match[3], strike: true });
    if (match[4] !== undefined) runs.push({ text: match[4], code: true });
    if (match[6] !== undefined) runs.push({ text: match[6], link: match[5] });
  }

  return runs.length > 0 ? runs : [{ text: String(text) }];
}

export function renderMarkdownBlocks(
  text: unknown,
  options: MarkdownBlockOptions = {},
): string {
  if (text == null) return '';

  const source = String(text);
  if (!source.includes('\n')) return renderInlineMarkdown(source);

  const listStyle = options.listStyle ?? 'margin:2px 0;padding-left:16px;list-style-type:disc';
  const lineBreak = options.lineBreak ?? true;
  const lines = source.split('\n');
  let html = '';
  let inList = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    const listMatch = line.match(/^[-\u2013\u2022]\s+(.*)/);
    if (listMatch) {
      if (!inList) {
        html += `<ul style="${listStyle}">`;
        inList = true;
      }
      html += `<li>${renderInlineMarkdown(listMatch[1])}</li>`;
      continue;
    }

    if (inList) {
      html += '</ul>';
      inList = false;
    }
    html += (html && !html.endsWith('>') && lineBreak ? '<br>' : '') + renderInlineMarkdown(line);
  }

  if (inList) html += '</ul>';
  return html;
}
