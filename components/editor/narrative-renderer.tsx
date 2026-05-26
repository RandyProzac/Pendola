"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { EntityMentionMark } from "@/lib/editor/entity-mention";
import { EditorialImage } from "@/lib/editor/editorial-image";
import { cn } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeContent(content: string) {
  if (!content.trim()) return "";

  const trimmed = content.trim();
  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");

  if (looksLikeJson) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fallback to HTML/text normalization below.
    }
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  if (looksLikeHtml) return content;

  return content
    .split(/\n{2,}/)
    .map((paragraph) => {
      const safeParagraph = escapeHtml(paragraph).replace(/\n/g, "<br />");
      return `<p>${safeParagraph}</p>`;
    })
    .join("");
}

export function NarrativeRenderer({
  content,
  className,
  plainMentions = false,
  maxWidth = "76ch",
}: {
  content: string;
  className?: string;
  plainMentions?: boolean;
  maxWidth?: string;
}) {
  const normalizedContent = useMemo(() => normalizeContent(content || ""), [content]);
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Highlight.configure({ multicolor: true }),
      EntityMentionMark,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
      EditorialImage.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: normalizedContent,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap prose prose-neutral dark:prose-invert mx-auto w-full max-w-none focus:outline-none",
          plainMentions && "tiptap--plain-mentions",
          className
        ),
        style: ["--editor-font-size:20px", "--editor-line-height:1.9", `max-width:${maxWidth}`].join(";"),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(normalizedContent || "", { emitUpdate: false });
  }, [editor, normalizedContent]);

  if (!editor) {
    return (
      <div
        className={cn("tiptap prose prose-neutral dark:prose-invert max-w-none", className)}
        dangerouslySetInnerHTML={{
          __html: typeof normalizedContent === "string" ? normalizedContent : "",
        }}
      />
    );
  }

  return <EditorContent editor={editor} />;
}
