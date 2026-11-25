declare const describe: any;
declare const it: any;
declare const expect: any;

import { parseReply, parseStreaming, sanitizeForSpeech } from './parseReply';

describe('Reply Parsing Utilities', () => {
  describe('sanitizeForSpeech', () => {
    it('removes markdown formatting, backticks, emojis, URLs, and table pipes', () => {
      const input = `
# Header
Here is a **bold** and *italic* text with \`inline code\`.
[Google](https://google.com) and raw https://example.com/api.
\`\`\`ts
const x = 10;
\`\`\`
| Col 1 | Col 2 |
|---|---|
| Val 1 | Val 2 |
😊 Great work! 🎉
      `;
      const sanitized = sanitizeForSpeech(input);
      expect(sanitized).not.toContain('Header #');
      expect(sanitized).not.toContain('**');
      expect(sanitized).not.toContain('*italic*');
      expect(sanitized).not.toContain('`');
      expect(sanitized).not.toContain('https://');
      expect(sanitized).not.toContain('const x = 10');
      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('😊');
      expect(sanitized).not.toContain('🎉');
      expect(sanitized).toContain('bold and italic text with inline code');
      expect(sanitized).toContain('Google and raw');
      expect(sanitized).toContain('Great work!');
    });
  });

  describe('parseReply', () => {
    it('handles normal reply with <display> and <speech>', () => {
      const raw = `
<display>
**About 70 C (158 F)** at the summit of Mount Everest (8,849 m).
</display>
<speech>
Water boils at about seventy degrees Celsius on top of Mount Everest.
</speech>
      `;
      const result = parseReply(raw);
      expect(result.display).toBe('**About 70 C (158 F)** at the summit of Mount Everest (8,849 m).');
      expect(result.speech).toBe('Water boils at about seventy degrees Celsius on top of Mount Everest.');
    });

    it('handles uppercase tags <DISPLAY> and <SPEECH>', () => {
      const raw = `
<DISPLAY>
Uppercase display content
</DISPLAY>
<SPEECH>
Uppercase speech content
</SPEECH>
      `;
      const result = parseReply(raw);
      expect(result.display).toBe('Uppercase display content');
      expect(result.speech).toBe('Uppercase speech content');
    });

    it('handles missing tags gracefully by falling back to raw text', () => {
      const raw = 'Just plain raw text without any tags.';
      const result = parseReply(raw);
      expect(result.display).toBe('Just plain raw text without any tags.');
      expect(result.speech).toBe('Just plain raw text without any tags.');
    });

    it('handles extra text outside tags cleanly', () => {
      const raw = `
Preamble text here
<display>Display body</display>
Intermediary text
<speech>Speech body</speech>
Footer text here
      `;
      const result = parseReply(raw);
      expect(result.display).toBe('Display body');
      expect(result.speech).toBe('Speech body');
    });
  });

  describe('parseStreaming', () => {
    it('masks partial opening <display> tags', () => {
      expect(parseStreaming('<').display).toBe('');
      expect(parseStreaming('<d').display).toBe('');
      expect(parseStreaming('<disp').display).toBe('');
      expect(parseStreaming('<display').display).toBe('');
      expect(parseStreaming('<display>').display).toBe('');
    });

    it('shows text inside <display> progressively while streaming', () => {
      expect(parseStreaming('<display>Hello').display).toBe('Hello');
      expect(parseStreaming('<display>Hello world').display).toBe('Hello world');
    });

    it('masks partial closing tags at the end of chunks', () => {
      expect(parseStreaming('<display>Hello world</').display).toBe('Hello world');
      expect(parseStreaming('<display>Hello world</d').display).toBe('Hello world');
      expect(parseStreaming('<display>Hello world</disp').display).toBe('Hello world');
      expect(parseStreaming('<display>Hello world</display').display).toBe('Hello world');
    });

    it('masks partial speech tags if closing display is omitted or immediate', () => {
      expect(parseStreaming('<display>Hello world<s').display).toBe('Hello world');
      expect(parseStreaming('<display>Hello world<sp').display).toBe('Hello world');
      expect(parseStreaming('<display>Hello world<speech').display).toBe('Hello world');
    });

    it('stops updating visible text once </display> or <speech> has arrived', () => {
      const chunkWithClose = '<display>Hello world</display><speech>Spoken words</speech>';
      const parsed = parseStreaming(chunkWithClose);
      expect(parsed.display).toBe('Hello world');
      expect(parsed.speechReady).toBe(true);
    });

    it('handles text without <display> tag streaming without errors', () => {
      const plainChunk = 'Direct answer streaming without tags';
      const parsed = parseStreaming(plainChunk);
      expect(parsed.display).toBe('Direct answer streaming without tags');
    });
  });
});
