import { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  RichTextContent,
  TextBlock,
  TextAlign,
  TextMark,
  createEmptyRichText,
  updateBlock,
  addBlock,
  removeBlock,
  toggleMark,
  setAlignment,
  hasMarkOnBlock,
  parseRichText,
  plainToRichText,
  serializeRichText,
  parseAnswerText,
  hasRichTextContent,
} from "@/lib/rich-text";

/**
 * DiaryContentEditor
 * 
 * A reusable rich-text editor for diary fields.
 * Supports multi-line text editing with Parse Text feature,
 * formatting controls (bold, italic, underline),
 * alignment (left, center, right), lists, and undo/redo.
 * 
 * Features:
 * - Parse Text: Paste multi-line content and split by newlines
 * - Formatting: Bold, Italic, Underline per line
 * - Alignment: Left, Center, Right per line
 * - Lists: Bullet and numbered lists
 * - History: Undo/Redo support
 * - Line Management: Add/Remove individual lines
 * - Backward Compat: Auto-converts plain text to rich format
 * 
 * Data Format:
 * Stores as JSON with blocks containing text, formatting, and alignment.
 * Automatically handles both plain-text (legacy) and rich-text formats.
 * 
 * Props:
 * @param value - Current content (string, JSON or plain-text)
 * @param onChange - Callback when content changes (emits JSON string or empty string)
 * @param placeholder - Placeholder text for first line
 * @param rows - Initial visible rows (optional)
 */
function parseContentFromValue(val: string | null | undefined): RichTextContent {
  if (!val || !hasRichTextContent(val)) return createEmptyRichText();
  const parsed = parseRichText(val);
  if (parsed) return parsed;
  if (typeof val === "string") {
    return plainToRichText(val);
  }
  return createEmptyRichText();
}

interface DiaryContentEditorProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function DiaryContentEditor({
  value,
  onChange,
  placeholder = "Enter your content here...",
  rows = 5,
}: DiaryContentEditorProps) {
  const [content, setContent] = useState<RichTextContent>(() => parseContentFromValue(value));
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [history, setHistory] = useState<RichTextContent[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showParseText, setShowParseText] = useState(false);
  const [parseInput, setParseInput] = useState("");
  const textInputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Track the latest serialized string we emitted or synced from value prop
  const lastSerializedRef = useRef<string>(value ?? "");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emitChange = (newContent: RichTextContent) => {
    const serialized = serializeRichText(newContent);
    lastSerializedRef.current = serialized;
    onChangeRef.current(serialized);
  };

  // Sync incoming value from parent (e.g. form reset or changing entry) without triggering feedback loop
  useEffect(() => {
    const incomingVal = value ?? "";
    if (incomingVal !== lastSerializedRef.current) {
      const parsed = parseContentFromValue(value);
      setContent(parsed);
      setHistory([parsed]);
      setHistoryIndex(0);
      setSelectedBlockIndex(0);
      lastSerializedRef.current = incomingVal;
    }
  }, [value]);

  const selectedBlock = content.blocks[selectedBlockIndex];

  const updateHistory = (newContent: RichTextContent) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setContent(newContent);
    emitChange(newContent);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newContent = history[newIndex];
      setContent(newContent);
      emitChange(newContent);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newContent = history[newIndex];
      setContent(newContent);
      emitChange(newContent);
    }
  };

  const handleParseText = () => {
    if (!parseInput.trim()) return;
    
    // Parse the input text into blocks
    const parsedContent = parseAnswerText(parseInput);
    
    // Update the editor with parsed content
    updateHistory(parsedContent);
    
    // Clear the parse input and close the panel
    setParseInput("");
    setShowParseText(false);
  };

  const handleBlockTextChange = (index: number, newText: string) => {
    const updated = updateBlock(content, index, { text: newText });
    updateHistory(updated);
  };

  const handleToggleMark = (mark: TextMark) => {
    if (!selectedBlock) return;
    const newBlock = toggleMark(selectedBlock, mark);
    const updated = updateBlock(content, selectedBlockIndex, newBlock);
    updateHistory(updated);
  };

  const handleSetAlignment = (align: TextAlign) => {
    if (!selectedBlock) return;
    const newBlock = setAlignment(selectedBlock, align);
    const updated = updateBlock(content, selectedBlockIndex, newBlock);
    updateHistory(updated);
  };

  const handleBlockTypeChange = (newType: TextBlock["type"]) => {
    if (!selectedBlock) return;
    const updated = updateBlock(content, selectedBlockIndex, { type: newType });
    updateHistory(updated);
  };

  const handleAddBlock = () => {
    const newBlock: TextBlock = {
      type: "paragraph",
      text: "",
      align: "left",
      marks: [],
    };
    const updated = addBlock(content, newBlock, selectedBlockIndex + 1);
    updateHistory(updated);
    setSelectedBlockIndex(selectedBlockIndex + 1);
  };

  const handleRemoveBlock = () => {
    if (content.blocks.length <= 1) return;
    const updated = removeBlock(content, selectedBlockIndex);
    updateHistory(updated);
    setSelectedBlockIndex(Math.max(0, selectedBlockIndex - 1));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    index: number
  ) => {
    // Enter creates a new block
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setSelectedBlockIndex(index);
      handleAddBlock();
    }

    // Backspace on empty line removes it
    if (e.key === "Backspace" && content.blocks[index].text === "") {
      if (index > 0) {
        e.preventDefault();
        handleRemoveBlock();
      }
    }
  };

  const getBlockClasses = (block: TextBlock, index: number): string => {
    const baseClasses =
      "w-full border border-border rounded resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
    const alignClasses =
      block.align === "center"
        ? "text-center"
        : block.align === "right"
          ? "text-right"
          : "text-left";
    const fontClasses =
      (block.marks.includes("bold") ? "font-bold " : "") +
      (block.marks.includes("italic") ? "italic " : "") +
      (block.marks.includes("underline") ? "underline " : "");
    const selectedClasses = index === selectedBlockIndex ? "ring-2 ring-blue-500" : "";
    // Fixed height and line-height for uniform notebook-style rows
    const fixedRowHeight = "min-h-[1.75rem] leading-[1.75rem] py-0 px-2";

    return `${baseClasses} ${alignClasses} ${fontClasses} ${selectedClasses} ${fixedRowHeight}`;
  };

  const buttonBaseClasses =
    "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors";
  const buttonActiveClasses = (active: boolean) =>
    active ? "bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100" : "";

  return (
    <div className="w-full border border-border rounded-lg p-4 bg-background">
      {/* Parse Text Section */}
      <div className="mb-4 pb-4 border-b border-border">
        <button
          onClick={() => setShowParseText((v) => !v)}
          className="tap flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm font-bold text-foreground hover:bg-muted/80"
          type="button"
        >
          <span>{showParseText ? "Hide Parse Text" : "Parse Text"}</span>
          {showParseText ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        
        {showParseText && (
          <div className="mt-3 space-y-2">
            <textarea
              value={parseInput}
              onChange={(e) => setParseInput(e.target.value)}
              placeholder="Paste your complete content here. Each line will become a separate editable line."
              rows={5}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleParseText}
              disabled={!parseInput.trim()}
              className="tap w-full rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              Parse Text
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-border">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Text Formatting */}
          <div className="flex gap-1 border-r border-gray-300 dark:border-gray-700 pr-3">
            <button
              onClick={() => handleToggleMark("bold")}
              className={`${buttonBaseClasses} ${buttonActiveClasses(selectedBlock?.marks.includes("bold") || false)}`}
              title="Bold"
              type="button"
            >
              <Bold size={18} />
            </button>
            <button
              onClick={() => handleToggleMark("italic")}
              className={`${buttonBaseClasses} ${buttonActiveClasses(selectedBlock?.marks.includes("italic") || false)}`}
              title="Italic"
              type="button"
            >
              <Italic size={18} />
            </button>
            <button
              onClick={() => handleToggleMark("underline")}
              className={`${buttonBaseClasses} ${buttonActiveClasses(selectedBlock?.marks.includes("underline") || false)}`}
              title="Underline"
              type="button"
            >
              <Underline size={18} />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex gap-1 border-r border-gray-300 dark:border-gray-700 pr-3">
            <button
              onClick={() => handleSetAlignment("left")}
              className={`${buttonBaseClasses} ${buttonActiveClasses(selectedBlock?.align === "left")}`}
              title="Align Left"
              type="button"
            >
              <AlignLeft size={18} />
            </button>
            <button
              onClick={() => handleSetAlignment("center")}
              className={`${buttonBaseClasses} ${buttonActiveClasses(selectedBlock?.align === "center")}`}
              title="Align Center"
              type="button"
            >
              <AlignCenter size={18} />
            </button>
            <button
              onClick={() => handleSetAlignment("right")}
              className={`${buttonBaseClasses} ${buttonActiveClasses(selectedBlock?.align === "right")}`}
              title="Align Right"
              type="button"
            >
              <AlignRight size={18} />
            </button>
          </div>

          {/* Lists */}
          <div className="flex gap-1 border-r border-gray-300 dark:border-gray-700 pr-3">
            <button
              onClick={() => handleBlockTypeChange("bullet-list")}
              className={`${buttonBaseClasses} ${buttonActiveClasses(selectedBlock?.type === "bullet-list")}`}
              title="Bullet List"
              type="button"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => handleBlockTypeChange("numbered-list")}
              className={`${buttonBaseClasses} ${buttonActiveClasses(selectedBlock?.type === "numbered-list")}`}
              title="Numbered List"
              type="button"
            >
              <ListOrdered size={18} />
            </button>
          </div>

          {/* Undo/Redo */}
          <div className="flex gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className={`${buttonBaseClasses} ${historyIndex === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Undo"
              type="button"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              className={`${buttonBaseClasses} ${historyIndex === history.length - 1 ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Redo"
              type="button"
            >
              <Redo2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Blocks Editor */}
      <div className="space-y-0">
        {content.blocks.map((block, index) => (
          <div key={index} className="flex gap-2 items-start">
            <textarea
              ref={(el) => {
                if (el) textInputRefs.current[index] = el;
              }}
              value={block.text}
              onChange={(e) => handleBlockTextChange(index, e.target.value)}
              onFocus={() => setSelectedBlockIndex(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder={index === 0 ? placeholder : ""}
              rows={1}
              className={getBlockClasses(block, index)}
            />
            {/* List prefix */}
            {block.type === "bullet-list" && (
              <span className="text-gray-400" style={{ lineHeight: "1.75rem", minHeight: "1.75rem" }}>•</span>
            )}
            {block.type === "numbered-list" && (
              <span className="text-gray-400" style={{ lineHeight: "1.75rem", minHeight: "1.75rem" }}>{index + 1}.</span>
            )}
          </div>
        ))}
      </div>

      {/* Block controls */}
      <div className="mt-3 flex gap-2 text-xs">
        <button
          onClick={handleAddBlock}
          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
          type="button"
        >
          + Add Line
        </button>
        {content.blocks.length > 1 && (
          <button
            onClick={handleRemoveBlock}
            className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded hover:bg-red-200 dark:hover:bg-red-800"
            type="button"
          >
            Remove Line
          </button>
        )}
      </div>
    </div>
  );
}
