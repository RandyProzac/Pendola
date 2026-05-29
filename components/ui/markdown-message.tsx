"use client";

import { cn } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineFormatting(value: string) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdownToHtml(markdown: string) {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const blocks: string[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let orderedListBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push(`<p>${applyInlineFormatting(paragraphBuffer.join(" "))}</p>`);
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      `<ul>${listBuffer
        .map((item) => `<li>${applyInlineFormatting(item)}</li>`)
        .join("")}</ul>`
    );
    listBuffer = [];
  };

  const flushOrderedList = () => {
    if (orderedListBuffer.length === 0) return;
    blocks.push(
      `<ol>${orderedListBuffer
        .map((item) => `<li>${applyInlineFormatting(item)}</li>`)
        .join("")}</ol>`
    );
    orderedListBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      flushOrderedList();
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushOrderedList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${applyInlineFormatting(headingMatch[2])}</h${level}>`);
      return;
    }

    const colonHeadingMatch = line.match(/^([A-ZÁÉÍÓÚÑ][^:.!?]{3,90}):\s*$/);
    if (colonHeadingMatch) {
      flushParagraph();
      flushList();
      flushOrderedList();
      blocks.push(`<h2>${applyInlineFormatting(colonHeadingMatch[1])}</h2>`);
      return;
    }

    const numberedHeadingMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (
      numberedHeadingMatch &&
      !/[.;]$/.test(numberedHeadingMatch[2]) &&
      numberedHeadingMatch[2].length <= 140
    ) {
      flushParagraph();
      flushList();
      flushOrderedList();
      blocks.push(
        `<h3 class="message-numbered-heading"><span class="message-numbered-index">${numberedHeadingMatch[1]}.</span> ${applyInlineFormatting(
          numberedHeadingMatch[2]
        )}</h3>`
      );
      return;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      flushList();
      flushOrderedList();
      blocks.push("<hr />");
      return;
    }

    const quoteMatch = line.match(/^&gt;\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      flushOrderedList();
      blocks.push(`<blockquote><p>${applyInlineFormatting(quoteMatch[1])}</p></blockquote>`);
      return;
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      flushOrderedList();
      listBuffer.push(listMatch[1]);
      return;
    }

    const orderedListMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedListMatch) {
      flushParagraph();
      flushList();
      orderedListBuffer.push(orderedListMatch[1]);
      return;
    }

    const labelParagraphMatch = line.match(
      /^(?:\*\*([^*:\n]{2,50})\*\*|\*\*([^*\n]{2,50}):\*\*|([A-ZÁÉÍÓÚÑ][^:.\n]{2,50})):\s+(.+)$/
    );
    if (labelParagraphMatch) {
      flushParagraph();
      flushList();
      flushOrderedList();
      const label = labelParagraphMatch[1] || labelParagraphMatch[2] || labelParagraphMatch[3];
      const content = labelParagraphMatch[4];
      const compactMetaLabels = ["Libro", "Capítulo", "Capitulo", "Personajes", "Escenario", "Escenarios"];
      if (compactMetaLabels.includes(label)) {
        blocks.push(
          `<p class="message-meta"><strong>${applyInlineFormatting(label)}:</strong> ${applyInlineFormatting(
            content
          )}</p>`
        );
        return;
      }
      blocks.push(
        `<div class="message-section"><h3>${applyInlineFormatting(
          label
        )}</h3><p>${applyInlineFormatting(content)}</p></div>`
      );
      return;
    }

    paragraphBuffer.push(line);
  });

  flushParagraph();
  flushList();
  flushOrderedList();

  return blocks.join("");
}

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none text-[15px] leading-8",
        "prose-headings:mb-3 prose-headings:mt-8 prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:mt-10 prose-h1:text-3xl prose-h1:leading-tight",
        "prose-h2:border-b prose-h2:border-border/60 prose-h2:pb-2 prose-h2:text-[2rem] prose-h2:leading-tight",
        "prose-h3:text-[1.7rem] prose-h3:leading-snug prose-h3:text-foreground/95",
        "prose-p:my-4 prose-p:text-[1.08rem] prose-p:leading-8 prose-p:text-foreground/95 prose-ul:my-5 prose-ul:pl-7 prose-ol:my-5 prose-ol:pl-7 prose-li:my-2 prose-li:pl-1 prose-li:leading-8",
        "prose-strong:font-semibold prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.9em]",
        "prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-muted-foreground",
        "prose-hr:my-8 prose-hr:border-border/60",
        "[&_.message-section]:my-7 [&_.message-section_h3]:mb-2 [&_.message-section_h3]:text-[1.7rem] [&_.message-section_h3]:font-semibold [&_.message-section_h3]:tracking-tight [&_.message-section_h3]:text-foreground [&_.message-section_p]:my-0 [&_.message-section_p]:text-[1.08rem] [&_.message-section_p]:leading-8 [&_.message-section_p]:text-foreground/95",
        "[&_.message-numbered-heading]:mb-4 [&_.message-numbered-heading]:mt-10 [&_.message-numbered-heading]:text-[2.25rem] [&_.message-numbered-heading]:font-semibold [&_.message-numbered-heading]:leading-tight [&_.message-numbered-heading]:tracking-tight",
        "[&_.message-numbered-index]:mr-2 [&_.message-numbered-index]:text-foreground/95",
        "[&_.message-meta]:my-1 [&_.message-meta]:text-[1rem] [&_.message-meta]:leading-7 [&_.message-meta]:text-foreground/90 [&_.message-meta_strong]:font-semibold",
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }}
    />
  );
}
