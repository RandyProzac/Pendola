import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import { htmlToPlainText } from '@/lib/ai/context'
import { normalizeEditorialText } from '@/lib/publishing'
import { serializeProjectBackup } from '@/lib/persistence/project-backup'
import type { Book, Chapter, EditorialDraft, Project, ProjectBackup, PublicationTargetProfile } from '@/lib/types'

interface ExportChapterLike {
  title: string
  content: string
  wordCount: number
}

interface ExportBookOptions {
  project: Project
  book?: Book
  bookTitle: string
  chapters: ExportChapterLike[]
  workspaceLabel: string
  publicationProfile?: PublicationTargetProfile
}

function sanitizeFilenamePart(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export function buildFilename(label: string, format: 'txt' | 'docx' | 'json' | 'html') {
  const safeLabel = sanitizeFilenamePart(label) || 'pendola-export'
  return `${safeLabel}.${format}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildHtmlShell(input: {
  title: string
  eyebrow: string
  subtitle?: string
  project: Project
  body: string
}) {
  const authorName = resolveAuthorName(input.project)
  const premise = input.project.premise?.trim()

  return `<!doctype html>
<html lang="${escapeHtml(input.project.publicationSettings.language || 'es')}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)} — ${escapeHtml(input.project.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --page-bg: #f8f7f3;
        --card-bg: #fffdfa;
        --ink: #18181b;
        --muted: #6b7280;
        --border: rgba(24, 24, 27, 0.12);
        --accent: ${input.project.coverColor || '#6d28d9'};
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background:
          radial-gradient(circle at top, color-mix(in srgb, var(--accent) 18%, white), transparent 26%),
          var(--page-bg);
        color: var(--ink);
        font-family: Georgia, "Times New Roman", serif;
      }

      main {
        width: min(100%, 1100px);
        margin: 0 auto;
        padding: 32px 18px 80px;
      }

      .hero,
      .manuscript {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 28px;
        box-shadow: 0 16px 50px rgba(15, 23, 42, 0.06);
      }

      .hero {
        padding: 28px 24px;
        margin-bottom: 22px;
      }

      .eyebrow {
        margin: 0 0 14px;
        color: var(--muted);
        font: 600 11px/1.2 ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3.6rem);
        line-height: 1.02;
      }

      .subtitle {
        margin: 14px 0 0;
        color: var(--muted);
        font: 500 0.96rem/1.7 ui-sans-serif, system-ui, sans-serif;
      }

      .premise {
        margin: 18px 0 0;
        max-width: 70ch;
        color: color-mix(in srgb, var(--ink) 80%, white);
        font-size: 1.02rem;
        line-height: 1.9;
      }

      .manuscript {
        padding: 28px 24px 36px;
      }

      .chapter-break {
        margin: 42px 0;
        border: 0;
        border-top: 1px solid var(--border);
      }

      .chapter-label {
        margin: 0 0 12px;
        color: var(--muted);
        font: 600 11px/1.2 ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .chapter-title {
        margin: 0 0 24px;
        font-size: clamp(1.65rem, 2.6vw, 2.35rem);
        line-height: 1.12;
      }

      .tiptap {
        max-width: 86ch;
        margin: 0 auto;
        font-size: 20px;
        line-height: 1.9;
        text-wrap: pretty;
        text-rendering: optimizeLegibility;
      }

      .tiptap p { margin: 0 0 1.15em; }
      .tiptap h1 { margin: 1.6em 0 0.7em; font-size: 1.8em; line-height: 1.12; }
      .tiptap h2 { margin: 1.45em 0 0.65em; font-size: 1.45em; line-height: 1.16; }
      .tiptap h3 { margin: 1.3em 0 0.6em; font-size: 1.2em; line-height: 1.18; }
      .tiptap ul, .tiptap ol { margin: 0 0 1.15em 1.4em; }
      .tiptap li { margin: 0.3em 0; }
      .tiptap blockquote {
        margin: 1.6em 0;
        padding-left: 1rem;
        border-left: 3px solid var(--accent);
        opacity: 0.88;
        font-style: italic;
      }
      .tiptap hr {
        margin: 2em 0;
        border: 0;
        border-top: 1px solid var(--border);
      }
      .tiptap mark {
        padding: 0.05em 0.22em;
        border-radius: 0.25rem;
        background: rgba(250, 204, 21, 0.25);
      }
      .tiptap img {
        display: block;
        width: 80%;
        max-width: 100%;
        height: auto;
        margin: 1.1rem auto;
        border-radius: 12px;
      }
      .tiptap img[data-image-size="sm"] { width: 40%; }
      .tiptap img[data-image-size="md"] { width: 60%; }
      .tiptap img[data-image-size="lg"] { width: 80%; }
      .tiptap img[data-image-size="full"] { width: 100%; }
      .tiptap img[data-image-align="left"] { margin-left: 0; margin-right: auto; }
      .tiptap img[data-image-align="center"] { margin-left: auto; margin-right: auto; }
      .tiptap img[data-image-align="right"] { margin-left: auto; margin-right: 0; }
      .tiptap .entity-mention,
      .tiptap[data-plain-mentions="true"] .entity-mention {
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent !important;
        color: inherit !important;
        box-shadow: none !important;
      }

      @media print {
        body { background: white; }
        main { width: 100%; max-width: none; padding: 0; }
        .hero, .manuscript { border: 0; box-shadow: none; border-radius: 0; }
        .hero { padding: 0 0 24px; }
        .manuscript { padding: 0; }
      }

      @media (max-width: 768px) {
        main { padding: 18px 12px 48px; }
        .hero, .manuscript { border-radius: 22px; }
        .hero, .manuscript { padding-left: 16px; padding-right: 16px; }
        .tiptap { font-size: 18px; }
        .tiptap img[data-image-size="sm"] { width: 75%; }
        .tiptap img[data-image-size="md"] { width: 85%; }
        .tiptap img[data-image-size="lg"],
        .tiptap img[data-image-size="full"] { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow">${escapeHtml(input.eyebrow)}</p>
        <h1>${escapeHtml(input.title)}</h1>
        ${input.subtitle ? `<p class="subtitle">${escapeHtml(input.subtitle)}</p>` : ''}
        ${premise ? `<p class="premise">${escapeHtml(premise)}</p>` : ''}
        <p class="subtitle">${escapeHtml(authorName)}</p>
      </section>
      <section class="manuscript">${input.body}</section>
    </main>
  </body>
</html>`
}

function renderHtmlChapter(project: Project, chapter: ExportChapterLike, index?: number) {
  return `
    ${typeof index === 'number' && index > 0 ? '<hr class="chapter-break" />' : ''}
    <article>
      <p class="chapter-label">Capítulo</p>
      <h2 class="chapter-title">${escapeHtml(chapter.title.trim() || 'Capítulo sin título')}</h2>
      <div class="tiptap" data-plain-mentions="true">${chapter.content?.trim() || '<p><em>(Sin contenido todavía)</em></p>'}</div>
    </article>
  `
}

function resolveAuthorName(project: Project) {
  return (
    project.publicationSettings.penName.trim() ||
    project.publicationSettings.authorName.trim() ||
    'Autor sin definir'
  )
}

function normalizeForPublication(project: Project, text: string) {
  return normalizeEditorialText(text, {
    language: project.publicationSettings.language,
    quotationStyle: project.publicationSettings.quotationStyle,
  })
}

function chapterToPlainText(project: Project, chapter: ExportChapterLike) {
  const content = normalizeForPublication(project, htmlToPlainText(chapter.content))

  return [
    chapter.title.trim() || 'Capítulo sin título',
    '',
    content || '(Sin contenido todavía)',
  ].join('\n')
}

export function buildChapterTextExport(options: {
  project: Project
  bookTitle: string
  chapter: Chapter | EditorialDraft
  chapterTitle?: string
  workspaceLabel: string
}) {
  const title = options.chapterTitle || ('title' in options.chapter ? options.chapter.title : 'Capítulo')

  return [
    options.project.title,
    options.bookTitle,
    options.workspaceLabel,
    '',
    chapterToPlainText(options.project, {
      title,
      content: options.chapter.content,
      wordCount: options.chapter.wordCount,
    }),
  ].join('\n')
}

export function buildBookTextExport({
  project,
  bookTitle,
  chapters,
  workspaceLabel,
}: ExportBookOptions) {
  return [
    project.title,
    bookTitle,
    workspaceLabel,
    '',
    ...chapters.map((chapter, index) => {
      const separator = index > 0 ? '\n\n---\n\n' : ''
      return `${separator}${chapterToPlainText(project, chapter)}`
    }),
  ].join('\n')
}

export function buildChapterHtmlExport(options: {
  project: Project
  bookTitle: string
  chapter: Chapter | EditorialDraft
  chapterTitle?: string
  workspaceLabel: string
}) {
  const title = options.chapterTitle || ('title' in options.chapter ? options.chapter.title : 'Capítulo')

  return buildHtmlShell({
    title,
    eyebrow: `${options.project.title} · ${options.workspaceLabel}`,
    subtitle: options.bookTitle,
    project: options.project,
    body: renderHtmlChapter(options.project, {
      title,
      content: options.chapter.content,
      wordCount: options.chapter.wordCount,
    }),
  })
}

export function buildBookHtmlExport({
  project,
  bookTitle,
  chapters,
  workspaceLabel,
}: ExportBookOptions) {
  return buildHtmlShell({
    title: bookTitle,
    eyebrow: `${project.title} · ${workspaceLabel}`,
    subtitle: `${chapters.length} ${chapters.length === 1 ? 'capítulo' : 'capítulos'}`,
    project,
    body: chapters.map((chapter, index) => renderHtmlChapter(project, chapter, index)).join('\n'),
  })
}

function chapterToParagraphs(project: Project, chapter: ExportChapterLike) {
  const lines = normalizeForPublication(project, htmlToPlainText(chapter.content))
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const paragraphs = [
    new Paragraph({
      spacing: {
        after: 240,
      },
      children: [
        new TextRun({
          text: chapter.title.trim() || 'Capítulo sin título',
          bold: true,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
    }),
  ]

  if (lines.length === 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 240, line: 480 },
        children: [
          new TextRun({
            text: '(Sin contenido todavía)',
            italics: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      })
    )

    return paragraphs
  }

  return [
    ...paragraphs,
    ...lines.map(
      (line) =>
        new Paragraph({
          spacing: { after: 240, line: 480 },
          children: [
            new TextRun({
              text: line,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
        })
    ),
  ]
}

async function buildDocxBlob({
  project,
  book,
  bookTitle,
  chapters,
  workspaceLabel,
  publicationProfile = 'editorial_docx',
}: ExportBookOptions) {
  const authorName = resolveAuthorName(project)
  const subtitle = book?.publicationSettings.subtitle?.trim()
  const tagline = book?.publicationSettings.tagline?.trim()
  const profileTitle =
    publicationProfile === 'kdp_ebook_docx'
      ? 'Perfil KDP eBook'
      : publicationProfile === 'beta_reader_docx'
        ? 'Copia para beta readers'
        : 'Formato editorial'

  const titlePageChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: project.title,
          bold: true,
          size: 28,
          font: 'Times New Roman',
        }),
      ],
    }),
    ...(subtitle
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: subtitle,
                italics: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: bookTitle,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: authorName,
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
    ...(tagline
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: tagline,
                italics: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: `${workspaceLabel} · ${profileTitle}`,
          italics: true,
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
    ...(publicationProfile === 'beta_reader_docx'
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
            children: [
              new TextRun({
                text: 'BORRADOR PARA LECTURA BETA — No distribuir',
                bold: true,
                size: 20,
                font: 'Times New Roman',
              }),
            ],
          }),
        ]
      : []),
  ]

  const doc = new Document({
    sections: [
      {
        children: [
          ...titlePageChildren,
          ...chapters.flatMap((chapter, index) => {
            const separator =
              index === 0
                ? []
                : [
                    new Paragraph({
                      pageBreakBefore: true,
                    }),
                  ]

            return [...separator, ...chapterToParagraphs(project, chapter)]
          }),
          ...(book?.publicationSettings.aboutAuthor?.trim()
            ? [
                new Paragraph({
                  pageBreakBefore: true,
                  spacing: { after: 240 },
                  children: [
                    new TextRun({
                      text: 'Acerca del autor',
                      bold: true,
                      size: 24,
                      font: 'Times New Roman',
                    }),
                  ],
                }),
                ...normalizeForPublication(project, book.publicationSettings.aboutAuthor)
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map(
                    (paragraph) =>
                      new Paragraph({
                        spacing: { after: 240, line: 480 },
                        children: [
                          new TextRun({
                            text: paragraph,
                            size: 24,
                            font: 'Times New Roman',
                          }),
                        ],
                      })
                  ),
              ]
            : []),
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}

export async function exportBookAsDocx(options: ExportBookOptions) {
  return buildDocxBlob(options)
}

export async function exportChapterAsDocx(options: {
  project: Project
  book?: Book
  bookTitle: string
  chapter: ExportChapterLike
  workspaceLabel: string
  publicationProfile?: PublicationTargetProfile
}) {
  return buildDocxBlob({
    project: options.project,
    book: options.book,
    bookTitle: options.bookTitle,
    chapters: [options.chapter],
    workspaceLabel: options.workspaceLabel,
    publicationProfile: options.publicationProfile,
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadText(content: string, filename: string, mimeType = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([content], { type: mimeType }), filename)
}

export function downloadBackup(backup: ProjectBackup, filename: string) {
  downloadText(serializeProjectBackup(backup), filename, 'application/json;charset=utf-8')
}
