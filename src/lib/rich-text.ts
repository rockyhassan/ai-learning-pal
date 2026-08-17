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
export function isRichText(content: string | null | undefined): boolean {
  if (!content || typeof content !== "string") return false;
  if (!content.trim().startsWith("{")) return false;
  try {
    const parsed = JSON.parse(content);
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
export function parseRichText(content: string | null | undefined): RichTextContent | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
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
 * Convert rich-text to plain text (loses formatting info).
 */
export function richToPlainText(content: RichTextContent | string): string {
  if (typeof content === "string") {
    const parsed = parseRichText(content);
    if (!parsed) return content; // Return as-is if not valid rich-text
    content = parsed;
  }
  return content.blocks.map((block) => block.text).join("\n");
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
 * Serialize rich-text content to JSON string
 */
export function serializeRichText(content: RichTextContent): string {
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
