"use client";

import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { NodeSelection } from "@tiptap/pm/state";
import {
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
    AlignRight,
    Highlighter,
    Undo2,
    Redo2,
    Minus,
    ImagePlus,
    Images,
    Loader2,
  } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImageLibraryDialog } from "@/components/media/image-library-dialog";
import { EntityMentionMark } from "@/lib/editor/entity-mention";
import {
  EditorialImage,
  type EditorialImageAlign,
  type EditorialImageSize,
} from "@/lib/editor/editorial-image";
import { getPublicMediaUrl, uploadInlineEditorImage } from "@/lib/supabase/storage";
import type { EntityMention, ProjectPublicationSettings, WriterPreferences } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NarrativeEditorProps {
  content: string;
  onUpdate: (content: string, wordCount: number) => void;
  placeholder?: string;
  editable?: boolean;
  showToolbar?: boolean;
  focusMode?: boolean;
  className?: string;
  mediaUploadContext?: {
    projectId: string;
    chapterId: string;
  };
  mediaLibraryProjectId?: string;
  writerPreferences?: WriterPreferences;
  editorialSettings?: Pick<ProjectPublicationSettings, "language" | "quotationStyle">;
  entityMentions?: EntityMention[];
  onEditorPointerDown?: () => void;
  onEditorTypingStart?: () => void;
  onSelectionChange?: (selection: {
    text: string;
    from: number;
    to: number;
    rect: { top: number; left: number; width: number; height: number };
    contextBefore: string;
    contextAfter: string;
  } | null) => void;
  onEntityMentionsChange?: (
    mentions: Array<{
      mentionId?: string;
      entityType: "character" | "scenario";
      entityId?: string;
      text: string;
      from: number;
      to: number;
    }>
  ) => void;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeEditorContent(content: string) {
  if (!content.trim()) return "";

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

const DEFAULT_EDITORIAL_SETTINGS: Pick<
  ProjectPublicationSettings,
  "language" | "quotationStyle"
> = {
  language: "es",
  quotationStyle: "latinas",
};

function shouldUseOpeningQuote(previousText: string) {
  const lastChar = previousText.trimEnd().slice(-1);
  if (!lastChar) return true;
  return /[\s(\[{—«“]/.test(lastChar);
}

function countOccurrences(text: string, target: string) {
  return [...text].filter((char) => char === target).length;
}

function getQuoteForInput(
  settings: Pick<ProjectPublicationSettings, "language" | "quotationStyle">,
  previousText: string
) {
  const isOpening = shouldUseOpeningQuote(previousText);

  if (settings.quotationStyle === "latinas") {
    const openLatinas = countOccurrences(previousText, "«");
    const closeLatinas = countOccurrences(previousText, "»");
    const openInner = countOccurrences(previousText, "“");
    const closeInner = countOccurrences(previousText, "”");
    const hasOpenLatina = openLatinas > closeLatinas;
    const hasOpenInner = openInner > closeInner;

    if (isOpening) {
      return hasOpenLatina && !hasOpenInner ? "“" : "«";
    }

    if (hasOpenInner) return "”";
    return "»";
  }

  const openDouble = countOccurrences(previousText, "“");
  const closeDouble = countOccurrences(previousText, "”");
  const hasOpenDouble = openDouble > closeDouble;

  if (isOpening) {
    return hasOpenDouble ? "‘" : "“";
  }

  const openSingle = countOccurrences(previousText, "‘");
  const closeSingle = countOccurrences(previousText, "’");
  if (openSingle > closeSingle) return "’";
  return "”";
}

function extractEntityMentionsFromEditor(editor: Editor) {
  type EditorMention = {
    mentionId?: string;
    entityType: "character" | "scenario";
    entityId?: string;
    text: string;
    from: number;
    to: number;
  };

  const mentions: EditorMention[] = [];

  let activeMention: EditorMention | null = null;

  editor.state.doc.descendants((node, position) => {
    if (!node.isText) {
      activeMention = null;
      return;
    }

    const text = node.text ?? "";
    if (!text) return;

    const entityMention = node.marks.find((mark) => mark.type.name === "entityMention");
    if (!entityMention) {
      activeMention = null;
      return;
    }

    const nextMention: EditorMention = {
      mentionId:
        typeof entityMention.attrs.mentionId === "string" ? entityMention.attrs.mentionId : undefined,
      entityType:
        entityMention.attrs.entityType === "scenario" ? "scenario" : ("character" as const),
      entityId:
        typeof entityMention.attrs.entityId === "string" ? entityMention.attrs.entityId : undefined,
      text,
      from: position,
      to: position + node.nodeSize,
    };

    if (
      activeMention &&
      activeMention.to === nextMention.from &&
      activeMention.mentionId === nextMention.mentionId &&
      activeMention.entityType === nextMention.entityType &&
      activeMention.entityId === nextMention.entityId
    ) {
      activeMention.text += nextMention.text;
      activeMention.to = nextMention.to;
      return;
    }

    activeMention = nextMention;
    mentions.push(nextMention);
  });

  return mentions;
}

export interface NarrativeEditorHandle {
  insertAtCursor: (text: string) => void;
  appendToEnd: (text: string) => void;
  replaceSelection: (text: string) => void;
  tagSelection: (entityType: "character" | "scenario", entityId?: string, mentionId?: string) => void;
  collapseSelectionToEnd: () => void;
}

const LEGACY_ENTITY_HIGHLIGHT_COLORS = new Set(["#dbeafe", "#dcfce7"]);
const FONT_CLASS_MAP: Record<WriterPreferences["editorFont"], string> = {
  editorial: "editor-font-editorial",
  clasica: "editor-font-classica",
  moderna: "editor-font-moderna",
  sans: "editor-font-sans",
};

const COLUMN_WIDTH_MAP: Record<WriterPreferences["columnWidth"], string> = {
  compacta: "64ch",
  equilibrada: "76ch",
  amplia: "80ch",
};

const IMAGE_SIZE_OPTIONS: Array<{
  label: string;
  value: EditorialImageSize;
  tooltip: string;
}> = [
  { label: "S", value: "sm", tooltip: "Imagen pequena" },
  { label: "M", value: "md", tooltip: "Imagen mediana" },
  { label: "L", value: "lg", tooltip: "Imagen grande" },
  { label: "XL", value: "full", tooltip: "Imagen a todo el ancho" },
];

function getSelectedImageState(editor: Editor): {
  isImageSelected: boolean;
  imageSize: EditorialImageSize;
  imageAlign: EditorialImageAlign;
} {
  const { selection } = editor.state;

  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") {
    return {
      isImageSelected: false,
      imageSize: "lg",
      imageAlign: "center",
    };
  }

  return {
    isImageSelected: true,
    imageSize: (selection.node.attrs.imageSize as EditorialImageSize) || "lg",
    imageAlign: (selection.node.attrs.imageAlign as EditorialImageAlign) || "center",
  };
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  tooltip,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isActive
            ? "bg-violet-500/15 text-violet-500"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function EditorToolbar({
  editor,
  mediaUploadContext,
  mediaLibraryProjectId,
}: {
  editor: Editor;
  mediaUploadContext?: {
    projectId: string;
    chapterId: string;
  };
  mediaLibraryProjectId?: string;
}) {
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isBold: currentEditor.isActive("bold"),
      isItalic: currentEditor.isActive("italic"),
      isUnderline: currentEditor.isActive("underline"),
      isStrike: currentEditor.isActive("strike"),
      isHighlight: currentEditor.isActive("highlight"),
      isHeading1: currentEditor.isActive("heading", { level: 1 }),
      isHeading2: currentEditor.isActive("heading", { level: 2 }),
      isHeading3: currentEditor.isActive("heading", { level: 3 }),
      isBulletList: currentEditor.isActive("bulletList"),
      isOrderedList: currentEditor.isActive("orderedList"),
      isBlockquote: currentEditor.isActive("blockquote"),
      isAlignLeft: currentEditor.isActive({ textAlign: "left" }),
      isAlignCenter: currentEditor.isActive({ textAlign: "center" }),
      isAlignRight: currentEditor.isActive({ textAlign: "right" }),
      canUndo: currentEditor.can().chain().focus().undo().run(),
      canRedo: currentEditor.can().chain().focus().redo().run(),
      ...getSelectedImageState(currentEditor),
    }),
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const addImage = useCallback(() => {
    if (mediaUploadContext) {
      imageInputRef.current?.click();
      return;
    }

    const url = window.prompt("URL de la imagen:");
    if (url) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src: url, imageSize: "lg", imageAlign: "center" },
        })
        .run();
    }
  }, [editor, mediaUploadContext]);

  const handleInlineImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !mediaUploadContext) return;

      setIsUploadingImage(true);

      try {
        const uploaded = await uploadInlineEditorImage(
          file,
          mediaUploadContext.projectId,
          mediaUploadContext.chapterId
        );

        editor
          .chain()
          .focus()
          .insertContent({
            type: "image",
            attrs: { src: uploaded.publicUrl, imageSize: "lg", imageAlign: "center" },
          })
          .run();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo subir la imagen al editor.";
        window.alert(message);
      } finally {
        setIsUploadingImage(false);
        event.target.value = "";
      }
    },
    [editor, mediaUploadContext]
  );

  const handleSelectLibraryImage = useCallback(
    (mediaPath: string) => {
      const publicUrl = getPublicMediaUrl(mediaPath);
      if (!publicUrl) {
        window.alert("No se pudo resolver la imagen seleccionada.");
        return;
      }

      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src: publicUrl, imageSize: "lg", imageAlign: "center" },
        })
        .run();
    },
    [editor]
  );

  const applyImageSize = useCallback(
    (imageSize: EditorialImageSize) => {
      editor.chain().focus().updateAttributes("image", { imageSize }).run();
    },
    [editor]
  );

  const applyImageAlign = useCallback(
    (imageAlign: EditorialImageAlign) => {
      editor.chain().focus().updateAttributes("image", { imageAlign }).run();
    },
    [editor]
  );

  return (
    <>
      <div className="sticky top-0 z-10 overflow-x-auto border-b border-border/50 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(event) => {
            void handleInlineImageUpload(event);
          }}
        />
        <div className="flex min-w-max items-center justify-start gap-1">
      {/* Text Style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={toolbarState.isBold}
        tooltip="Negrita (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={toolbarState.isItalic}
        tooltip="Cursiva (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={toolbarState.isUnderline}
        tooltip="Subrayado (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={toolbarState.isStrike}
        tooltip="Tachado"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={toolbarState.isHighlight}
        tooltip="Resaltar"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={toolbarState.isHeading1}
        tooltip="Título 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={toolbarState.isHeading2}
        tooltip="Título 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={toolbarState.isHeading3}
        tooltip="Título 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={toolbarState.isBulletList}
        tooltip="Lista con viñetas"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={toolbarState.isOrderedList}
        tooltip="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={toolbarState.isBlockquote}
        tooltip="Cita"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        tooltip="Línea horizontal"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={toolbarState.isAlignLeft}
        tooltip="Alinear izquierda"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={toolbarState.isAlignCenter}
        tooltip="Centrar"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={toolbarState.isAlignRight}
        tooltip="Alinear derecha"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Media */}
      <ToolbarButton
        onClick={addImage}
        tooltip={
          mediaUploadContext ? "Subir imagen JPG/PNG" : "Insertar imagen por URL"
        }
        disabled={isUploadingImage}
      >
        {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </ToolbarButton>
      {mediaLibraryProjectId ? (
        <ToolbarButton
          onClick={() => setIsLibraryOpen(true)}
          tooltip="Insertar desde biblioteca"
        >
          <Images className="h-4 w-4" />
        </ToolbarButton>
      ) : null}

      {toolbarState.isImageSelected ? (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/35 px-1.5 py-1">
            {IMAGE_SIZE_OPTIONS.map((option) => (
              <ToolbarButton
                key={option.value}
                onClick={() => applyImageSize(option.value)}
                isActive={toolbarState.imageSize === option.value}
                tooltip={option.tooltip}
              >
                <span className="text-[10px] font-semibold tracking-[0.08em]">
                  {option.label}
                </span>
              </ToolbarButton>
            ))}
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton
              onClick={() => applyImageAlign("left")}
              isActive={toolbarState.imageAlign === "left"}
              tooltip="Alinear imagen a la izquierda"
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => applyImageAlign("center")}
              isActive={toolbarState.imageAlign === "center"}
              tooltip="Centrar imagen"
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => applyImageAlign("right")}
              isActive={toolbarState.imageAlign === "right"}
              tooltip="Alinear imagen a la derecha"
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </>
      ) : null}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!toolbarState.canUndo}
        tooltip="Deshacer (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!toolbarState.canRedo}
        tooltip="Rehacer (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
        </div>
      </div>
      {mediaLibraryProjectId ? (
        <ImageLibraryDialog
          projectId={mediaLibraryProjectId}
          open={isLibraryOpen}
          onOpenChange={setIsLibraryOpen}
          onSelect={handleSelectLibraryImage}
          title="Insertar imagen en el editor"
          description="Elige una imagen ya subida en Recursos para insertarla sin volver a cargarla."
          confirmLabel="Insertar imagen"
        />
      ) : null}
    </>
  );
}

export const NarrativeEditor = forwardRef<
  NarrativeEditorHandle,
  NarrativeEditorProps
>(function NarrativeEditor(
  {
    content,
    onUpdate,
    placeholder = "Comienza a escribir tu historia...",
    editable = true,
    showToolbar = true,
    focusMode = false,
    className,
    mediaUploadContext,
    mediaLibraryProjectId,
    writerPreferences,
    editorialSettings,
    entityMentions = [],
    onEditorPointerDown,
    onEditorTypingStart,
    onSelectionChange,
    onEntityMentionsChange,
  },
  ref
) {
  const effectiveWriterPreferences: WriterPreferences = writerPreferences ?? {
    editorFont: "editorial",
    fontSize: 18,
    lineHeight: 1.85,
    columnWidth: "equilibrada",
  };
  const lastSelectionRef = useRef<{
    from: number;
    to: number;
    text: string;
  } | null>(null);
  const latestOnSelectionChangeRef = useRef(onSelectionChange);
  const latestOnEntityMentionsChangeRef = useRef(onEntityMentionsChange);
  const lastExternalContentRef = useRef(normalizeEditorContent(content || ""));
  const editorInstanceRef = useRef<Editor | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typewriterFrameRef = useRef<number | null>(null);
  const latestEditorialSettingsRef = useRef(
    editorialSettings ?? DEFAULT_EDITORIAL_SETTINGS
  );

  const centerSelectionInView = useCallback(() => {
    const currentEditor = editorInstanceRef.current;
    if (!focusMode || !currentEditor || typeof window === "undefined") return;

    if (typewriterFrameRef.current !== null) {
      window.cancelAnimationFrame(typewriterFrameRef.current);
    }

    typewriterFrameRef.current = window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container || !currentEditor.isFocused) return;

      const { from, to } = currentEditor.state.selection;
      const anchorPosition = to >= from ? to : from;
      const coords = currentEditor.view.coordsAtPos(anchorPosition);
      const containerRect = container.getBoundingClientRect();
      const currentScrollTop = container.scrollTop;
      const caretOffsetTop = coords.top - containerRect.top + currentScrollTop;
      const targetScrollTop = Math.max(
        0,
        caretOffsetTop - container.clientHeight * 0.42
      );

      if (Math.abs(targetScrollTop - currentScrollTop) < 12) return;

      container.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });
    });
  }, [focusMode]);

  useEffect(() => {
    latestOnSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    latestOnEntityMentionsChangeRef.current = onEntityMentionsChange;
  }, [onEntityMentionsChange]);

  useEffect(() => {
    latestEditorialSettingsRef.current =
      editorialSettings ?? DEFAULT_EDITORIAL_SETTINGS;
  }, [editorialSettings]);

  useEffect(() => {
    return () => {
      if (typewriterFrameRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(typewriterFrameRef.current);
      }
    };
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
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
    content: normalizeEditorContent(content || ""),
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap prose prose-neutral dark:prose-invert mx-auto min-h-[70vh] w-full focus:outline-none",
          FONT_CLASS_MAP[effectiveWriterPreferences.editorFont],
          focusMode
            ? "px-8 py-16 md:px-14 md:py-20"
            : "px-6 py-10 md:px-12 md:py-12"
        ),
        style: [
          `--editor-font-size:${effectiveWriterPreferences.fontSize}px`,
          `--editor-line-height:${effectiveWriterPreferences.lineHeight}`,
          `max-width:${COLUMN_WIDTH_MAP[effectiveWriterPreferences.columnWidth]}`,
        ].join(";"),
      },
      handleDOMEvents: {
        mousedown: () => {
          onEditorPointerDown?.();
          return false;
        },
        keydown: (_view, event) => {
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            onEditorTypingStart?.();
          }
          if (
            focusMode &&
            (event.key === "Enter" ||
              event.key === "Backspace" ||
              event.key === "Delete" ||
              event.key === "ArrowUp" ||
              event.key === "ArrowDown" ||
              event.key === "ArrowLeft" ||
              event.key === "ArrowRight")
          ) {
            centerSelectionInView();
          }
          return false;
        },
      },
      handleTextInput: (view, from, to, text) => {
        const settings = latestEditorialSettingsRef.current;
        const transaction = view.state.tr;
        const previousText = view.state.doc.textBetween(
          Math.max(0, from - 4),
          from,
          "\n",
          "\0"
        );

        if (text === '"') {
          view.dispatch(
            transaction.insertText(getQuoteForInput(settings, previousText), from, to)
          );
          return true;
        }

        if (text === "." && previousText.endsWith("..")) {
          view.dispatch(transaction.insertText("…", from - 2, to));
          return true;
        }

        if (text === "-" && previousText.endsWith("-")) {
          view.dispatch(transaction.insertText("—", from - 1, to));
          return true;
        }

        if (text === " ") {
          const paragraphStart = from - view.state.selection.$from.parentOffset;
          const paragraphBefore = view.state.doc.textBetween(
            paragraphStart,
            from,
            "\n",
            "\0"
          );

          if (paragraphBefore === "-" || paragraphBefore === "--") {
            view.dispatch(transaction.insertText("— ", paragraphStart, to));
            return true;
          }

          if (previousText.endsWith(" -")) {
            view.dispatch(transaction.insertText(" —", from - 2, to));
            return true;
          }

          if (previousText.endsWith(" --")) {
            view.dispatch(transaction.insertText(" —", from - 3, to));
            return true;
          }
        }

        return false;
      },
    },
    onTransaction: ({ editor, transaction }) => {
      if (!transaction.docChanged) {
        return;
      }

      const html = editor.getHTML();
      const words = editor.storage.characterCount.words();
      onUpdate(html, words);
      latestOnEntityMentionsChangeRef.current?.(extractEntityMentionsFromEditor(editor));
      centerSelectionInView();
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, " ").trim();
      const contextBefore = editor.state.doc.textBetween(Math.max(0, from - 60), from, " ");
      const contextAfter = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 60), " ");
      const domSelection = window.getSelection();
      const range =
        domSelection && domSelection.rangeCount > 0
          ? domSelection.getRangeAt(0)
          : null;
      const rect = range?.getBoundingClientRect();
      const nextSelection =
        text && from !== to && rect
          ? {
              text,
              from,
              to,
              rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              },
              contextBefore,
              contextAfter,
            }
          : null;
      lastSelectionRef.current = nextSelection
        ? { from: nextSelection.from, to: nextSelection.to, text: nextSelection.text }
        : null;
      onSelectionChange?.(nextSelection);
      centerSelectionInView();
    },
  });

  useEffect(() => {
    editorInstanceRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const normalizedContent = normalizeEditorContent(content || "");
    if (lastExternalContentRef.current === normalizedContent) return;

    lastExternalContentRef.current = normalizedContent;
    const currentContent = editor.getHTML();

    if (currentContent === normalizedContent) return;

    editor.commands.setContent(normalizedContent, { emitUpdate: false });
    lastSelectionRef.current = null;
    latestOnSelectionChangeRef.current?.(null);
    latestOnEntityMentionsChangeRef.current?.(extractEntityMentionsFromEditor(editor));
  }, [content, editor]);

  useImperativeHandle(
    ref,
    () => ({
      insertAtCursor: (text: string) => {
        if (!editor || !text.trim()) return;
        editor
          .chain()
          .focus()
          .insertContent(normalizeEditorContent(text))
          .run();
      },
      appendToEnd: (text: string) => {
        if (!editor || !text.trim()) return;
        const endPosition = editor.state.doc.content.size;
        editor
          .chain()
          .focus()
          .setTextSelection(endPosition)
          .insertContent(normalizeEditorContent(text))
          .run();
      },
      replaceSelection: (text: string) => {
        if (!editor || !text.trim()) return;
        editor
          .chain()
          .focus()
          .insertContent(normalizeEditorContent(text))
          .run();
      },
      tagSelection: (entityType: "character" | "scenario", entityId?: string, mentionId?: string) => {
        if (!editor || !lastSelectionRef.current) return;
        const entityMentionType = editor.state.schema.marks.entityMention;
        if (!entityMentionType) return;
        const { from, to } = lastSelectionRef.current;
        editor.view.dispatch(
          editor.state.tr
            .addMark(
            from,
            to,
            entityMentionType.create({
              entityType,
              entityId,
              mentionId,
            })
          )
            .setMeta("entity-mention-sync", true)
            .setMeta("addToHistory", false)
        );
      },
      collapseSelectionToEnd: () => {
        if (!editor || !lastSelectionRef.current) return;
        editor.chain().focus().setTextSelection(lastSelectionRef.current.to).run();
      },
    }),
    [editor]
  );

  useEffect(() => {
    if (!editor) return;

    const entityMentionType = editor.state.schema.marks.entityMention;
    const highlightType = editor.state.schema.marks.highlight;
    if (!entityMentionType) return;

    if (highlightType) {
      let cleanupTransaction = editor.state.tr;
      editor.state.doc.descendants((node, position) => {
        if (!node.isText) return;
        const from = position;
        const to = position + node.nodeSize;
        node.marks.forEach((mark) => {
          if (
            mark.type === highlightType &&
            typeof mark.attrs.color === "string" &&
            LEGACY_ENTITY_HIGHLIGHT_COLORS.has(mark.attrs.color)
          ) {
            cleanupTransaction = cleanupTransaction.removeMark(from, to, highlightType);
          }
        });
      });
      if (cleanupTransaction.docChanged) {
        editor.view.dispatch(cleanupTransaction);
      }
    }

    const contentAlreadyHasMentions = content.includes("data-entity-mention=");
    if (contentAlreadyHasMentions) {
      return;
    }

    const validMentions = entityMentions
      .filter(
        (mention) =>
          typeof mention.from === "number" &&
          typeof mention.to === "number" &&
          mention.from < mention.to
      )
      .sort((a, b) => (a.from ?? 0) - (b.from ?? 0));

    if (validMentions.length === 0) {
      return;
    }

    let transaction = editor.state.tr;
    validMentions.forEach((mention) => {
      const from = Math.max(1, mention.from ?? 1);
      const to = Math.min(editor.state.doc.content.size, mention.to ?? from);
      if (from >= to) return;
      transaction = transaction.addMark(
        from,
        to,
        entityMentionType.create({
          entityType: mention.entityType,
          entityId: mention.entityId,
          mentionId: mention.id,
        })
      );
    });

    if (transaction.docChanged) {
      transaction = transaction
        .setMeta("entity-mention-sync", true)
        .setMeta("addToHistory", false);
      editor.view.dispatch(transaction);
    }
  }, [content, editor, entityMentions]);

  useEffect(() => {
    if (!focusMode || !editor) return;
    centerSelectionInView();
  }, [centerSelectionInView, editor, focusMode]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Cargando editor...
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {showToolbar && (
        <EditorToolbar
          editor={editor}
          mediaUploadContext={mediaUploadContext}
          mediaLibraryProjectId={mediaLibraryProjectId}
        />
      )}
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex-1 overflow-auto bg-[linear-gradient(180deg,rgba(15,23,42,0.018),transparent_18%)]",
          focusMode && "bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,250,250,1))] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,1))]"
        )}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center justify-between border-t bg-card/50 px-4 py-2 text-xs text-muted-foreground">
        <span>
          {editor.storage.characterCount.words()} palabras ·{" "}
          {editor.storage.characterCount.characters()} caracteres
        </span>
        <span>
          {focusMode
            ? "Typewriter activo"
            : `${editable ? "Editando" : "Solo lectura"} · ${effectiveWriterPreferences.fontSize}px`}
        </span>
      </div>
    </div>
  );
});
