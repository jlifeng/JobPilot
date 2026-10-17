export type MarkdownToolbarAction = 'bold' | 'italic' | 'strike' | 'code' | 'link' | 'list';

export interface MarkdownEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const INLINE_ACTIONS: Partial<
  Record<
    MarkdownToolbarAction,
    { prefix: string; suffix: string; fallback: string }
  >
> = {
  bold: { prefix: '**', suffix: '**', fallback: 'bold text' },
  italic: { prefix: '*', suffix: '*', fallback: 'italic text' },
  strike: { prefix: '~~', suffix: '~~', fallback: 'struck text' },
  code: { prefix: '`', suffix: '`', fallback: 'code' },
  link: { prefix: '[', suffix: '](https://)', fallback: 'link text' },
};

export function applyInlineMarkdown(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: Exclude<MarkdownToolbarAction, 'list'>,
  fallback?: string,
): MarkdownEditResult {
  const token = INLINE_ACTIONS[action];
  if (!token) {
    return { value, selectionStart, selectionEnd };
  }

  const selected = value.slice(selectionStart, selectionEnd) || fallback || '';
  const next =
    value.slice(0, selectionStart) +
    token.prefix +
    selected +
    token.suffix +
    value.slice(selectionEnd);
  const start = selectionStart + token.prefix.length;

  return {
    value: next,
    selectionStart: start,
    selectionEnd: start + selected.length,
  };
}

export function toggleMarkdownList(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): MarkdownEditResult {
  const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const nextLineBreak = value.indexOf('\n', selectionEnd);
  const blockEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const lines = value.slice(lineStart, blockEnd).split('\n');
  const prefixed = lines.every((line) => line.startsWith('- '));
  const updated = lines
    .map((line) => (prefixed ? line.slice(2) : `- ${line}`))
    .join('\n');
  const next = value.slice(0, lineStart) + updated + value.slice(blockEnd);

  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + updated.length,
  };
}
