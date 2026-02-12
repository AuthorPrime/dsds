/**
 * Shared Markdown renderer - converts markdown text to HTML.
 * Handles headings, bold, italic, code blocks, inline code, links,
 * lists, horizontal rules, and blockquotes.
 *
 * Supports light and dark mode via the `theme` parameter.
 */

export type MarkdownTheme = 'light' | 'dark';

const THEME_CLASSES = {
  light: {
    h1: 'text-2xl font-bold mt-6 mb-3',
    h2: 'text-xl font-bold mt-6 mb-2',
    h3: 'text-lg font-bold mt-5 mb-2',
    h4: 'text-base font-bold mt-4 mb-1',
    h5: 'text-sm font-bold mt-4 mb-1',
    h6: 'text-sm font-bold mt-4 mb-1',
    hr: 'my-4 border-gray-300',
    blockquote: 'border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2',
    code: 'bg-gray-100 rounded px-1.5 py-0.5 text-sm font-mono',
    codeBlock: 'bg-gray-100 rounded p-3 overflow-x-auto text-sm my-3',
    link: 'text-blue-600 underline',
    li: 'ml-4',
    p: 'my-1.5 leading-relaxed',
  },
  dark: {
    h1: 'text-2xl font-bold mt-6 mb-3 text-slate-100',
    h2: 'text-xl font-bold mt-6 mb-2 text-slate-200',
    h3: 'text-lg font-bold mt-5 mb-2 text-slate-200',
    h4: 'text-base font-bold mt-4 mb-1 text-slate-300',
    h5: 'text-sm font-bold mt-4 mb-1 text-slate-300',
    h6: 'text-sm font-bold mt-4 mb-1 text-slate-300',
    hr: 'my-4 border-white/10',
    blockquote: 'border-l-4 border-purple-500/30 pl-4 italic text-slate-400 my-2',
    code: 'bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono text-cyan-300',
    codeBlock: 'bg-white/5 rounded p-3 overflow-x-auto text-sm my-3 text-slate-300',
    link: 'text-cyan-400 underline',
    li: 'ml-4',
    p: 'my-1.5 leading-relaxed text-slate-300',
  },
};

export function renderMarkdown(md: string, theme: MarkdownTheme = 'light'): string {
  const t = THEME_CLASSES[theme];

  // Sanitize script tags
  let html = md.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  html = html
    // Fenced code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, `<pre class="${t.codeBlock}"><code>$2</code></pre>`)
    // Headings
    .replace(/^######\s+(.+)$/gm, `<h6 class="${t.h6}">$1</h6>`)
    .replace(/^#####\s+(.+)$/gm, `<h5 class="${t.h5}">$1</h5>`)
    .replace(/^####\s+(.+)$/gm, `<h4 class="${t.h4}">$1</h4>`)
    .replace(/^###\s+(.+)$/gm, `<h3 class="${t.h3}">$1</h3>`)
    .replace(/^##\s+(.+)$/gm, `<h2 class="${t.h2}">$1</h2>`)
    .replace(/^#\s+(.+)$/gm, `<h1 class="${t.h1}">$1</h1>`)
    // Horizontal rules
    .replace(/^---+$/gm, `<hr class="${t.hr}" />`)
    // Blockquotes
    .replace(/^>\s+(.+)$/gm, `<blockquote class="${t.blockquote}">$1</blockquote>`)
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, `<code class="${t.code}">$1</code>`)
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" class="${t.link}" target="_blank" rel="noopener">$1</a>`)
    // Unordered lists
    .replace(/^[-*]\s+(.+)$/gm, `<li class="${t.li} list-disc">$1</li>`)
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, `<li class="${t.li} list-decimal">$1</li>`)
    // Paragraphs (lines that aren't already wrapped)
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, `<p class="${t.p}">$1</p>`);

  // Wrap consecutive <li> items
  html = html.replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ul class="my-2">$1</ul>');

  return html;
}
