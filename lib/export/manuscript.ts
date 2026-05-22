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

export function buildFilename(label: string, format: 'txt' | 'docx' | 'json') {
  const safeLabel = sanitizeFilenamePart(label) || 'pendola-export'
  return `${safeLabel}.${format}`
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
