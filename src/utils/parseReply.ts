/**
 * Utilities for parsing Gemini responses containing <display> and <speech> blocks,
 * including streaming-safe parsing and speech sanitization.
 */

export interface ParsedReply {
  display: string;
  speech: string;
}

export interface StreamingParsed {
  display: string;
  speechReady: boolean;
}

/**
 * Strips markdown symbols, code blocks, URLs, emojis, table pipes,
 * and collapses whitespace to create clean spoken plain text.
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links [text](url) -> keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove raw URLs
      .replace(/https?:\/\/\S+/gi, '')
      // Remove markdown headings (#, ##, etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove blockquotes (> )
      .replace(/^>\s+/gm, '')
      // Remove list markers (*, -, +, 1.)
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove bold and italic markers (*, **, _, __)
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove strikethrough (~~)
      .replace(/~~(.*?)~~/g, '$1')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove table formatting (e.g. | Header | or |---|)
      .replace(/\|/g, ' ')
      .replace(/[-:]{3,}/g, ' ')
      // Remove emojis (standard unicode ranges)
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Collapse multiple whitespace/newlines into single space
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Extracts <display> and <speech> blocks from a raw response string.
 * Uses case-insensitive regex. If tags are missing, falls back cleanly.
 */
export function parseReply(raw: string): ParsedReply {
  if (!raw || typeof raw !== 'string') {
    return { display: '', speech: '' };
  }

  const displayMatch = raw.match(/<display>([\s\S]*?)<\/display>/i);
  const speechMatch = raw.match(/<speech>([\s\S]*?)<\/speech>/i);

  let display = displayMatch ? displayMatch[1].trim() : '';
  let speech = speechMatch ? speechMatch[1].trim() : '';

  // Fallbacks if tags are missing or incomplete
  if (!display) {
    if (speechMatch) {
      // Tags existed for speech, remove speech tag from raw for display
      display = raw.replace(/<speech>[\s\S]*?<\/speech>/gi, '').trim();
    } else {
      // No tags at all: raw is display
      display = raw.trim();
    }
    // Clean any stray tags from display
    display = display.replace(/<\/?(?:display|speech)[^>]*>/gi, '').trim();
  }

  if (!speech) {
    // If speech was missing, create a sanitized version of display
    speech = sanitizeForSpeech(display);
  } else {
    // Even if speech tag was present, ensure no residual markdown or tags
    speech = sanitizeForSpeech(speech);
  }

  return { display, speech };
}

/**
 * Parses streaming partial response to safely display incoming text in real time.
 * Masks partial or complete <display>, </display>, and <speech> tags so they never flash.
 * Stops updating visible text once </display> or <speech> starts.
 */
export function parseStreaming(partial: string): StreamingParsed {
  if (!partial || typeof partial !== 'string') {
    return { display: '', speechReady: false };
  }

  let text = partial;

  // 1. If the stream starts with a partial or full <display> tag, strip it
  // Check if it starts with an incomplete <display> (e.g. "<", "<d", "<disp", "<display")
  if (/^<d(i(s(p(l(a(y)?)?)?)?)?)?$/i.test(text.trim())) {
    return { display: '', speechReady: false };
  }

  const openDisplayMatch = text.match(/^\s*<display>/i);
  if (openDisplayMatch) {
    text = text.slice(openDisplayMatch[0].length);
  }

  // 2. Check if a closing </display> or opening <speech> has arrived
  const closeDisplayIndex = text.search(/<\/display>/i);
  const openSpeechIndex = text.search(/<speech>/i);

  let cutoff = -1;
  if (closeDisplayIndex !== -1 && openSpeechIndex !== -1) {
    cutoff = Math.min(closeDisplayIndex, openSpeechIndex);
  } else if (closeDisplayIndex !== -1) {
    cutoff = closeDisplayIndex;
  } else if (openSpeechIndex !== -1) {
    cutoff = openSpeechIndex;
  }

  if (cutoff !== -1) {
    text = text.substring(0, cutoff);
  } else {
    // 3. Mask any partially arrived trailing tag at the end of the text
    // Handles: </, </d, </di, </disp, </displ, </display
    // and <, <s, <sp, <spe, <spee, <speec, <speech
    text = text.replace(/<\/?(?:d(?:i(?:s(?:p(?:l(?:a(?:y)?)?)?)?)?)?|s(?:p(?:e(?:e(?:c(?:h)?)?)?)?)?)?$/i, '');
  }

  // Check if speech is completely ready
  const speechReady = /<speech>[\s\S]*?<\/speech>/i.test(partial);

  return {
    display: text.trimStart(),
    speechReady,
  };
}
