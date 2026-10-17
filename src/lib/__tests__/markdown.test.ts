import assert from 'node:assert/strict';
import { renderInlineMarkdown, renderMarkdownBlocks } from '@/lib/markdown';

assert.equal(
  renderInlineMarkdown('**Bold** *Italic* ~~Gone~~ `a*b`'),
  '<strong>Bold</strong> <em>Italic</em> <del>Gone</del> <code>a*b</code>',
);

assert.equal(
  renderInlineMarkdown('[Docs](https://example.com/a?b=1&c=2)'),
  '<a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">Docs</a>',
);

assert.equal(
  renderInlineMarkdown('<script>alert(1)</script>'),
  '&lt;script&gt;alert(1)&lt;/script&gt;',
);

assert.equal(
  renderMarkdownBlocks('- **First**\n- Second'),
  '<ul style="margin:2px 0;padding-left:16px;list-style-type:disc"><li><strong>First</strong></li><li>Second</li></ul>',
);

assert.equal(renderMarkdownBlocks('Line one\nLine two'), 'Line one<br>Line two');
