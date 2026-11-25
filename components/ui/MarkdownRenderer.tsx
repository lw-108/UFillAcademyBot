import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight Markdown renderer supporting:
 * - Tables (| col | col |)
 * - Code blocks (```lang ... ```)
 * - Inline code (`code`)
 * - Bullet & numbered lists (- or 1.)
 * - Bold (**bold**) and italics (*italic*)
 * - Headings (#, ##, ###)
 * - Blockquotes (> )
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  // Split lines into blocks (tables, code blocks, paragraphs/lists)
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 1. Code blocks ```
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre
          key={`code-${i}`}
          className="my-3 p-3 bg-black/40 rounded-lg text-sm font-mono overflow-x-auto border border-white/10 text-gray-200"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // 2. Tables: lines starting and containing |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith('|') &&
        lines[i].trim().endsWith('|')
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      // Parse headers, separator, and rows
      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        // Row 1 is usually separator (|---|---|)
        const rowLines = tableLines.slice(2);

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto w-full">
            <table className="min-w-full text-left border-collapse border border-white/20 text-sm md:text-base">
              <thead>
                <tr className="bg-black/30 border-b border-white/20">
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-semibold text-white border-r border-white/10 last:border-r-0">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowLines.map((r, rIdx) => {
                  const cells = r
                    .split('|')
                    .slice(1, -1)
                    .map((c) => c.trim());
                  return (
                    <tr
                      key={rIdx}
                      className="border-b border-white/10 hover:bg-black/10 transition-colors"
                    >
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-white/90 border-r border-white/10 last:border-r-0">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Headings (#, ##, ###)
    if (line.trim().startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '');
      const headingClass =
        level === 1
          ? 'text-2xl font-bold text-white mt-4 mb-2'
          : level === 2
          ? 'text-xl font-bold text-white mt-3 mb-2'
          : 'text-lg font-semibold text-white mt-2 mb-1';

      elements.push(
        <div key={`heading-${i}`} className={headingClass}>
          {renderInline(text)}
        </div>
      );
      i++;
      continue;
    }

    // 4. Bullet lists (- or *)
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside my-2 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-white/90">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 5. Numbered lists (1. , 2. )
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside my-2 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-white/90">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 6. Regular paragraph line
    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <div className={`markdown-body ${className}`}>{elements}</div>;
};

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and plain text.
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split by inline code, bold, italic
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-black/30 text-amber-300 font-mono text-xs md:text-sm"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-white/90">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
