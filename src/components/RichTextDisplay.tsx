import {
  parseRichText,
  richToPlainText,
  isRichText,
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
    return <div className={`text-gray-500 italic ${className}`}>No answer provided</div>;
  }

  // Check if content is rich-text
  if (isRichText(content)) {
    const parsed = parseRichText(content);
    if (parsed) {
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
        const textClasses = [
          block.marks.includes("bold") ? "font-bold" : "",
          block.marks.includes("italic") ? "italic" : "",
          block.marks.includes("underline") ? "underline" : "",
          block.align === "center" ? "text-center" : "",
          block.align === "right" ? "text-right" : "",
          block.align === "left" ? "text-left" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const baseClasses = "text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words";
        // Fixed line-height matching ruled notebook (1.75rem = 28px)
        const fixedLineHeight = "leading-[1.75rem] min-h-[1.75rem]";

        const fullClasses = textClasses ? `${textClasses} ${baseClasses} ${fixedLineHeight}` : `${baseClasses} ${fixedLineHeight}`;

        if (block.type === "bullet-list") {
          return (
            <div key={index} className={`flex gap-3 ${fullClasses}`}>
              <span className="flex-shrink-0">•</span>
              <span>{block.text}</span>
            </div>
          );
        }

        if (block.type === "numbered-list") {
          return (
            <div key={index} className={`flex gap-3 ${fullClasses}`}>
              <span className="flex-shrink-0">{index + 1}.</span>
              <span>{block.text}</span>
            </div>
          );
        }

        // Paragraph
        return (
          <div key={index} className={fullClasses}>
            {block.text}
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
      {lines.map((line, index) => (
        <div
          key={index}
          className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words"
          style={{ lineHeight: "1.75rem", minHeight: "1.75rem" }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
