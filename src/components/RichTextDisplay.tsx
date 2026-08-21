import React from "react";
import {
  parseRichText,
  isRichText,
  parseInlineSegments,
  type RichTextContent,
} from "@/lib/rich-text";

interface RichTextDisplayProps {
  content: string | null | undefined;
  className?: string;
}

/**
 * Display rich-text or plain-text content.
 * Automatically detects format and renders accordingly.
 * Preserves formatting (bold, italic, underline, alignment, lists).
 */
export function RichTextDisplay({
  content,
  className = "",
}: RichTextDisplayProps) {
  if (!content) {
    return <div className={`text-muted-foreground italic ${className}`}>No answer provided</div>;
  }

  // Check if content is rich-text
  if (isRichText(content)) {
    const parsed = parseRichText(content);
    if (parsed && parsed.blocks && parsed.blocks.length > 0) {
      return <RichTextRenderer content={parsed} className={className} />;
    }
  }

  // Fall back to plain text
  return <PlainTextRenderer content={content} className={className} />;
}

interface RichTextRendererProps {
  content: RichTextContent;
  className?: string;
}

function RichTextRenderer({ content, className = "" }: RichTextRendererProps) {
  return (
    <div className={className}>
      {content.blocks.map((block, index) => {
        const isBold = block.marks?.includes("bold");
        const isItalic = block.marks?.includes("italic");
        const isUnderline = block.marks?.includes("underline");

        const textClasses = [
          isBold ? "font-bold text-slate-900 dark:text-white" : "",
          isItalic ? "italic" : "",
          isUnderline ? "underline" : "",
          block.align === "center" ? "text-center" : "",
          block.align === "right" ? "text-right" : "",
          block.align === "left" ? "text-left" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const baseClasses = "text-foreground whitespace-pre-wrap break-words";
        // Fixed line-height matching ruled notebook (1.75rem = 28px)
        const fixedLineHeight = "leading-[1.75rem] min-h-[1.75rem]";
        const fullClasses = textClasses ? `${textClasses} ${baseClasses} ${fixedLineHeight}` : `${baseClasses} ${fixedLineHeight}`;

        const segments = parseInlineSegments(block.text || "", {
          bold: isBold,
          italic: isItalic,
          underline: isUnderline,
        });

        const renderedText = segments.map((seg, idx) => {
          const segClasses: string[] = [];
          if (seg.bold) segClasses.push("font-bold text-slate-900 dark:text-white");
          if (seg.italic) segClasses.push("italic");
          if (seg.underline) segClasses.push("underline");

          if (segClasses.length > 0) {
            return (
              <span key={idx} className={segClasses.join(" ")}>
                {seg.text}
              </span>
            );
          }
          return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
        });

        if (block.type === "bullet-list") {
          return (
            <div key={index} className={`flex items-start gap-3 ${fullClasses}`}>
              <span className="flex-shrink-0 select-none">•</span>
              <div className="flex-1 min-w-0">{renderedText}</div>
            </div>
          );
        }

        if (block.type === "numbered-list") {
          return (
            <div key={index} className={`flex items-start gap-3 ${fullClasses}`}>
              <span className="flex-shrink-0 select-none font-semibold">{index + 1}.</span>
              <div className="flex-1 min-w-0">{renderedText}</div>
            </div>
          );
        }

        // Paragraph
        return (
          <div key={index} className={fullClasses}>
            {renderedText}
          </div>
        );
      })}
    </div>
  );
}

interface PlainTextRendererProps {
  content: string;
  className?: string;
}

function PlainTextRenderer({ content, className = "" }: PlainTextRendererProps) {
  // Split by lines and preserve structure
  const lines = content.split("\n");

  return (
    <div className={className}>
      {lines.map((line, index) => {
        const segments = parseInlineSegments(line);
        return (
          <div
            key={index}
            className="text-foreground whitespace-pre-wrap break-words"
            style={{ lineHeight: "1.75rem", minHeight: "1.75rem" }}
          >
            {segments.map((seg, idx) => {
              const segClasses: string[] = [];
              if (seg.bold) segClasses.push("font-bold text-slate-900 dark:text-white");
              if (seg.italic) segClasses.push("italic");
              if (seg.underline) segClasses.push("underline");

              if (segClasses.length > 0) {
                return (
                  <span key={idx} className={segClasses.join(" ")}>
                    {seg.text}
                  </span>
                );
              }
              return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
            })}
          </div>
        );
      })}
    </div>
  );
}
