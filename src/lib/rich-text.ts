/**
 * Rich-text formatting utilities for School Answer field.
 * Supports both plain-text (legacy) and rich-text formats.
 * 
 * Data format: JSON with blocks containing text and inline formatting
 * Example:
 * {
 *   "blocks": [
 *     { "type": "paragraph", "text": "Unite 3", "align": "center", "marks": ["bold"] },
 *     { "type": "paragraph", "text": "Useful animals", "align": "center", "marks": ["bold"] },
 *     { "type": "paragraph", "text": "Fill in the blanks", "align": "center", "marks": ["bold"] },
 *     { "type": "paragraph", "text": "1. Cows...", "align": "left", "marks": [] }
 *   ]
 * }
 */

export type TextMark = "bold" | "italic" | "underline";
export type TextAlign = "left" | "center" | "right";
export type BlockType = "paragraph" | "bullet-list" | "numbered-list";

export interface TextBlock {
  type: BlockType;
  text: string;
  align: TextAlign;
  marks: TextMark[];
}

export interface RichTextContent {
  blocks: TextBlock[];
}

/**
 * Parse multi-line pasted text into rich-text blocks.
 * Each non-empty line becomes a separate paragraph block.
 * Used for "Parse Text" feature in answer editor.
 */
export function parseAnswerText(text: string): RichTextContent {
  const lines = text
    .split("\n")
    .map((line) => line.trimEnd()) // Preserve leading spaces, trim trailing
    .filter((line) => line !== ""); // Filter out completely empty lines

  if (lines.length === 0) {
    return createEmptyRichText();
  }

  const blocks: TextBlock[] = lines.map((text) => ({
    type: "paragraph",
    text,
    align: "left",
    marks: [],
  }));

  return { blocks };
}

/**
 * Check if content is in rich-text format (JSON)
 */
export function isRichText(content: unknown): boolean {
  if (!content) return false;
  if (typeof content === "object" && content !== null && "blocks" in content && Array.isArray((content as { blocks: unknown[] }).blocks)) {
    return (content as { blocks: unknown[] }).blocks.length > 0;
  }
  if (typeof content !== "string") return false;
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray(parsed.blocks) &&
      parsed.blocks.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Parse content as rich-text. Returns parsed object if valid, null otherwise.
 */
export function parseRichText(content: unknown): RichTextContent | null {
  if (!content) return null;
  if (typeof content === "object" && content !== null && "blocks" in content && Array.isArray((content as { blocks: unknown[] }).blocks)) {
    return content as RichTextContent;
  }
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray(parsed.blocks)
    ) {
      return parsed as RichTextContent;
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Convert plain text to rich-text format.
 * Each line becomes a paragraph with default formatting (left-aligned, no marks).
 */
export function plainToRichText(plainText: string): RichTextContent {
  const lines = plainText.split("\n").filter((line) => line || line === "");
  const blocks: TextBlock[] = lines.map((text) => ({
    type: "paragraph",
    text: text.trim(),
    align: "left",
    marks: [],
  }));
  return { blocks };
}

/**
 * Check if a diary or content field contains any meaningful non-whitespace text.
 */
export function hasRichTextContent(content: unknown): boolean {
  if (!content) return false;
  return extractPlainTextFromRichJson(content).trim().length > 0;
}

/**
 * Safely extracts plain text from a diary or content string.
 * Handles both plain text (legacy) and stringified Rich-Text JSON blocks.
 * 
 * - If Rich-Text JSON (e.g. `{"blocks": [{"text": "Line 1"}, {"text": "Line 2"}]}`),
 *   extracts the `text` from each block and joins them with newlines (`\n`).
 * - If plain text, returns the string as-is.
 * - If null, undefined, whitespace-only, or empty JSON blocks, returns an empty string `""`.
 */
export function extractPlainTextFromRichJson(content: unknown): string {
  if (!content) return "";
  
  if (typeof content === "object" && content !== null && "blocks" in content && Array.isArray((content as { blocks: unknown[] }).blocks)) {
    return (content as { blocks: { text?: string }[] }).blocks
      .map((b) => (typeof b?.text === "string" ? b.text : ""))
      .join("\n");
  }

  if (typeof content !== "string") return "";
  const trimmed = content.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.blocks)) {
        return parsed.blocks
          .map((b: { text?: string }) => (typeof b?.text === "string" ? b.text : ""))
          .join("\n");
      }
    } catch {
      // Fall back to returning original content
    }
  }

  return content;
}

export interface FormattedSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/**
 * Safely parse inline formatting tags (Markdown and HTML: bold, italic, underline)
 * into structured text segments without needing dangerouslySetInnerHTML.
 */
export function parseInlineSegments(
  text: string,
  inheritedMarks?: { bold?: boolean; italic?: boolean; underline?: boolean }
): FormattedSegment[] {
  if (!text) return [];

  const baseMarks = {
    bold: inheritedMarks?.bold ?? false,
    italic: inheritedMarks?.italic ?? false,
    underline: inheritedMarks?.underline ?? false,
  };

  // If no markup characters found, return single segment
  if (!/[<*]/.test(text)) {
    return [{ text, ...baseMarks }];
  }

  // Regex matching supported inline formatting:
  // 1. <b>...</b> or <strong>...</strong>
  // 2. <i>...</i> or <em>...</em>
  // 3. <u>...</u> or <ins>...
  // 4. **...**
  // 5. *...*
  const pattern = /(<b>[\s\S]*?<\/b>|<strong>[\s\S]*?<\/strong>|\*\*[\s\S]*?\*\*|<i>[\s\S]*?<\/i>|<em>[\s\S]*?<\/em>|\*[\s\S]*?\*|<u>[\s\S]*?<\/u>|<ins>[\s\S]*?<\/ins>)/gi;

  const parts = text.split(pattern);
  const segments: FormattedSegment[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("<b>") && part.endsWith("</b>")) {
      const inner = part.slice(3, -4);
      segments.push(...parseInlineSegments(inner, { ...baseMarks, bold: true }));
    } else if (part.startsWith("<strong>") && part.endsWith("</strong>")) {
      const inner = part.slice(8, -9);
      segments.push(...parseInlineSegments(inner, { ...baseMarks, bold: true }));
    } else if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const inner = part.slice(2, -2);
      segments.push(...parseInlineSegments(inner, { ...baseMarks, bold: true }));
    } else if (part.startsWith("<i>") && part.endsWith("</i>")) {
      const inner = part.slice(3, -4);
      segments.push(...parseInlineSegments(inner, { ...baseMarks, italic: true }));
    } else if (part.startsWith("<em>") && part.endsWith("</em>")) {
      const inner = part.slice(4, -5);
      segments.push(...parseInlineSegments(inner, { ...baseMarks, italic: true }));
    } else if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      const inner = part.slice(1, -1);
      segments.push(...parseInlineSegments(inner, { ...baseMarks, italic: true }));
    } else if (part.startsWith("<u>") && part.endsWith("</u>")) {
      const inner = part.slice(3, -4);
      segments.push(...parseInlineSegments(inner, { ...baseMarks, underline: true }));
    } else if (part.startsWith("<ins>") && part.endsWith("</ins>")) {
      const inner = part.slice(5, -6);
      segments.push(...parseInlineSegments(inner, { ...baseMarks, underline: true }));
    } else {
      segments.push({ text: part, ...baseMarks });
    }
  }

  return segments;
}

/**
 * Convert rich-text to plain text (loses formatting info).
 */
export function richToPlainText(content: RichTextContent | string | null | undefined): string {
  if (!content) return "";
  if (typeof content === "string") {
    return extractPlainTextFromRichJson(content);
  }
  return content.blocks.map((block) => block.text ?? "").join("\n");
}

/**
 * Create an empty rich-text content structure
 */
export function createEmptyRichText(): RichTextContent {
  return { blocks: [{ type: "paragraph", text: "", align: "left", marks: [] }] };
}

/**
 * Add a new block to rich-text content
 */
export function addBlock(
  content: RichTextContent,
  block: TextBlock,
  index?: number
): RichTextContent {
  const newBlocks = [...content.blocks];
  if (index !== undefined) {
    newBlocks.splice(index, 0, block);
  } else {
    newBlocks.push(block);
  }
  return { blocks: newBlocks };
}

/**
 * Update a specific block
 */
export function updateBlock(
  content: RichTextContent,
  index: number,
  updates: Partial<TextBlock>
): RichTextContent {
  const newBlocks = [...content.blocks];
  newBlocks[index] = { ...newBlocks[index], ...updates };
  return { blocks: newBlocks };
}

/**
 * Remove a block
 */
export function removeBlock(content: RichTextContent, index: number): RichTextContent {
  const newBlocks = content.blocks.filter((_, i) => i !== index);
  return { blocks: newBlocks.length > 0 ? newBlocks : [{ type: "paragraph", text: "", align: "left", marks: [] }] };
}

/**
 * Serialize rich-text content to JSON string.
 * Returns empty string if content has no meaningful text.
 */
export function serializeRichText(content: RichTextContent): string {
  if (!hasRichTextContent(content)) return "";
  return JSON.stringify(content);
}

/**
 * Toggle a mark on a block (add if not present, remove if present)
 */
export function toggleMark(block: TextBlock, mark: TextMark): TextBlock {
  const marks = block.marks.includes(mark)
    ? block.marks.filter((m) => m !== mark)
    : [...block.marks, mark];
  return { ...block, marks };
}

/**
 * Set alignment on a block
 */
export function setAlignment(block: TextBlock, align: TextAlign): TextBlock {
  return { ...block, align };
}

/**
 * Check if a mark is active on a block
 */
export function hasMarkOnBlock(block: TextBlock, mark: TextMark): boolean {
  return block.marks.includes(mark);
}
