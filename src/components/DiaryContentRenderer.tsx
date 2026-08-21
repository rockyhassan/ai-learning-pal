import React, { type ReactNode } from "react";
import {
  parseRichText,
  isRichText,
  hasRichTextContent,
  parseInlineSegments,
  type FormattedSegment,
  type TextBlock,
} from "@/lib/rich-text";

export interface DiaryContentRendererProps {
  content: unknown;
  className?: string;
  blockClassName?: string;
  fallback?: ReactNode;
}

/**
 * Renders formatted segments safely without dangerouslySetInnerHTML
 */
function RenderSegments({
  segments,
  keyPrefix = "seg",
}: {
  segments: FormattedSegment[];
  keyPrefix?: string;
}) {
  return (
    <>
      {segments.map((seg, idx) => {
        const classNames: string[] = [];
        if (seg.bold) classNames.push("font-bold text-slate-900 dark:text-white");
        if (seg.italic) classNames.push("italic");
        if (seg.underline) classNames.push("underline");

        if (classNames.length > 0) {
          return (
            <span key={`${keyPrefix}-${idx}`} className={classNames.join(" ")}>
              {seg.text}
            </span>
          );
        }
        return <React.Fragment key={`${keyPrefix}-${idx}`}>{seg.text}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Renders a single TextBlock from RichTextContent
 */
function BlockItem({
  block,
  index,
  blockClassName = "",
}: {
  block: TextBlock;
  index: number;
  blockClassName?: string;
}) {
  const isBold = block.marks?.includes("bold");
  const isItalic = block.marks?.includes("italic");
  const isUnderline = block.marks?.includes("underline");

  const alignClass =
    block.align === "center"
      ? "text-center"
      : block.align === "right"
        ? "text-right"
        : "text-left";

  const blockClasses = [
    alignClass,
    isBold ? "font-bold text-slate-900 dark:text-white" : "",
    isItalic ? "italic" : "",
    isUnderline ? "underline" : "",
    blockClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const segments = parseInlineSegments(block.text || "", {
    bold: isBold,
    italic: isItalic,
    underline: isUnderline,
  });

  if (block.type === "bullet-list") {
    return (
      <div className={`flex items-start gap-2 ${blockClasses}`}>
        <span className="shrink-0 select-none text-muted-foreground">•</span>
        <div className="flex-1 min-w-0">
          <RenderSegments segments={segments} keyPrefix={`b-${index}`} />
        </div>
      </div>
    );
  }

  if (block.type === "numbered-list") {
    return (
      <div className={`flex items-start gap-2 ${blockClasses}`}>
        <span className="shrink-0 select-none font-semibold text-muted-foreground">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <RenderSegments segments={segments} keyPrefix={`n-${index}`} />
        </div>
      </div>
    );
  }

  return (
    <div className={blockClasses}>
      <RenderSegments segments={segments} keyPrefix={`p-${index}`} />
    </div>
  );
}

/**
 * DiaryContentRenderer
 * 
 * Lightweight, secure viewer for Diary fields (CW, HW, Remarks, Answer, etc.).
 * - Parses and renders RichTextContent blocks with full support for marks (bold, italic, underline),
 *   text alignment (left, center, right), and lists (bullet, numbered).
 * - Supports safe inline Markdown/HTML formatting (**bold**, <b>bold</b>, *italic*, <u>underline</u>).
 * - Falls back cleanly to plain text with line-break preservation.
 * - Uses 100% safe React elements without dangerouslySetInnerHTML.
 */
export function DiaryContentRenderer({
  content,
  className = "",
  blockClassName = "",
  fallback = null,
}: DiaryContentRendererProps) {
  if (!hasRichTextContent(content)) {
    if (fallback !== null && fallback !== undefined) {
      return <div className={className}>{fallback}</div>;
    }
    return null;
  }

  // Handle rich-text JSON format
  if (isRichText(content)) {
    const parsed = parseRichText(content);
    if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      return (
        <div className={`space-y-1 ${className}`}>
          {parsed.blocks.map((block, idx) => (
            <BlockItem
              key={idx}
              block={block}
              index={idx}
              blockClassName={blockClassName}
            />
          ))}
        </div>
      );
    }
  }

  // Fallback for plain text: split by newlines and parse inline formatting safely
  const rawString = typeof content === "string" ? content : String(content ?? "");
  const lines = rawString.split("\n");

  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, idx) => {
        const segments = parseInlineSegments(line);
        return (
          <div key={idx} className={blockClassName}>
            <RenderSegments segments={segments} keyPrefix={`plain-${idx}`} />
          </div>
        );
      })}
    </div>
  );
}
