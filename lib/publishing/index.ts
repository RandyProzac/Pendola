import type { Book, Project, PublicationTargetProfile, PublicationTrimSize } from '@/lib/types'

export interface PublicationProfileOption {
  id: PublicationTargetProfile
  label: string
  description: string
  recommendedFor: string
}

export interface TrimSizeOption {
  id: PublicationTrimSize
  label: string
  wordsPerPage: number
}

export interface PageRangeEstimate {
  basePages: number
  minPages: number
  maxPages: number
  wordsPerPage: number
}

export interface CoverRequirement {
  minWidth: number
  minHeight: number
  idealRatio: number
  formats: string[]
}

export interface CoverValidationResult {
  profile: PublicationTargetProfile
  width?: number
  height?: number
  passes: boolean
  warnings: string[]
}

export interface PreflightItem {
  id: string
  label: string
  status: 'complete' | 'warning' | 'blocked'
  detail: string
}

export const PUBLICATION_PROFILE_OPTIONS: PublicationProfileOption[] = [
  {
    id: 'editorial_docx',
    label: 'Editorial DOCX',
    description: 'Documento limpio para revisión profesional, agentes o editor externo.',
    recommendedFor: 'Tradicional y revisión editorial',
  },
  {
    id: 'kdp_ebook_docx',
    label: 'KDP eBook DOCX',
    description: 'Entrega estructurada para preparar una subida limpia a Amazon KDP.',
    recommendedFor: 'Self-publishing digital',
  },
  {
    id: 'beta_reader_docx',
    label: 'Beta Reader DOCX',
    description: 'Versión de lectura con aviso de borrador y contexto para lectores beta.',
    recommendedFor: 'Lectores de prueba y ARC inicial',
  },
]

export const TRIM_SIZE_OPTIONS: TrimSizeOption[] = [
  { id: '5x8', label: '5 × 8"', wordsPerPage: 250 },
  { id: '5.25x8', label: '5.25 × 8"', wordsPerPage: 270 },
  { id: '5.5x8.5', label: '5.5 × 8.5"', wordsPerPage: 290 },
  { id: '6x9', label: '6 × 9"', wordsPerPage: 330 },
]

export const COVER_REQUIREMENTS: Record<PublicationTargetProfile, CoverRequirement> = {
  editorial_docx: {
    minWidth: 1200,
    minHeight: 1800,
    idealRatio: 1 / 1.5,
    formats: ['jpg', 'jpeg', 'png'],
  },
  kdp_ebook_docx: {
    minWidth: 1000,
    minHeight: 1600,
    idealRatio: 1 / 1.6,
    formats: ['jpg', 'jpeg', 'tif', 'tiff', 'png'],
  },
  beta_reader_docx: {
    minWidth: 1000,
    minHeight: 1600,
    idealRatio: 1 / 1.6,
    formats: ['jpg', 'jpeg', 'png'],
  },
}

export function getTrimSizeOption(trimSize: PublicationTrimSize) {
  return TRIM_SIZE_OPTIONS.find((option) => option.id === trimSize) || TRIM_SIZE_OPTIONS[2]
}

export function estimatePageCount(wordCount: number, trimSize: PublicationTrimSize) {
  const wordsPerPage = getTrimSizeOption(trimSize).wordsPerPage
  if (wordCount <= 0) return 0
  return Math.max(1, Math.ceil(wordCount / wordsPerPage))
}

export function estimatePageRange(
  wordCount: number,
  trimSize: PublicationTrimSize
): PageRangeEstimate {
  const wordsPerPage = getTrimSizeOption(trimSize).wordsPerPage

  if (wordCount <= 0) {
    return {
      basePages: 0,
      minPages: 0,
      maxPages: 0,
      wordsPerPage,
    }
  }

  const basePages = estimatePageCount(wordCount, trimSize)
  const minPages = Math.max(1, Math.ceil(wordCount / (wordsPerPage * 1.08)))
  const maxPages = Math.max(basePages, Math.ceil(wordCount / (wordsPerPage * 0.92)))

  return {
    basePages,
    minPages,
    maxPages,
    wordsPerPage,
  }
}

export function estimateSpineWidthInches(pageCount: number) {
  if (pageCount <= 0) return 0
  return Number((pageCount * 0.0025).toFixed(3))
}

export function estimatePrintingCostUsd(pageCount: number) {
  if (pageCount <= 0) return 0
  return Number((0.85 + pageCount * 0.012).toFixed(2))
}

export function estimateKdpPrintRoyalty(priceUsd: number, pageCount: number) {
  const printingCost = estimatePrintingCostUsd(pageCount)
  const grossRoyalty = priceUsd * 0.6
  return {
    printingCost,
    grossRoyalty: Number(grossRoyalty.toFixed(2)),
    netRoyalty: Number((grossRoyalty - printingCost).toFixed(2)),
  }
}

export function estimateAudiobookDuration(wordCount: number) {
  const totalHours = wordCount / 9300
  const hours = Math.floor(totalHours)
  const minutes = Math.round((totalHours - hours) * 60)
  return { hours, minutes }
}

export function formatAudiobookDuration(wordCount: number) {
  const { hours, minutes } = estimateAudiobookDuration(wordCount)
  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${minutes.toString().padStart(2, '0')} min`
}

export function normalizeCommaSeparatedList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function validateIsbn13(value: string) {
  const digits = value.replace(/[^0-9]/g, '')
  if (digits.length !== 13) return false
  const checksum = digits
    .slice(0, 12)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0)
  const checkDigit = (10 - (checksum % 10)) % 10
  return checkDigit === Number(digits[12])
}

export function validateCoverForProfile(input: {
  profile: PublicationTargetProfile
  coverPath?: string
  width?: number
  height?: number
}) {
  const requirement = COVER_REQUIREMENTS[input.profile]
  const warnings: string[] = []

  if (!input.coverPath) {
    warnings.push('No hay portada cargada.')
    return { profile: input.profile, passes: false, warnings } satisfies CoverValidationResult
  }

  if (!input.width || !input.height) {
    warnings.push('No se pudieron leer las dimensiones de la portada todavía.')
    return {
      profile: input.profile,
      width: input.width,
      height: input.height,
      passes: false,
      warnings,
    } satisfies CoverValidationResult
  }

  if (input.width < requirement.minWidth || input.height < requirement.minHeight) {
    warnings.push(
      `La imagen está en ${input.width}×${input.height}px y el mínimo recomendado es ${requirement.minWidth}×${requirement.minHeight}px.`
    )
  }

  const extension = input.coverPath.split('.').pop()?.toLowerCase()
  if (extension && !requirement.formats.includes(extension)) {
    warnings.push(`El formato .${extension} no es el recomendado para este perfil.`)
  }

  const ratio = Number((input.width / input.height).toFixed(3))
  const ratioDelta = Math.abs(ratio - requirement.idealRatio)
  if (ratioDelta > 0.08) {
    warnings.push('La proporción de la portada se aleja bastante de la recomendada para este destino.')
  }

  return {
    profile: input.profile,
    width: input.width,
    height: input.height,
    passes: warnings.length === 0,
    warnings,
  } satisfies CoverValidationResult
}

export function buildPublicationPreflight(input: {
  project: Project
  book: Book
  wordCount: number
  chapterCount: number
  coverValidation: CoverValidationResult
}) {
  const projectSettings = input.project.publicationSettings
  const bookSettings = input.book.publicationSettings
  const isbnFilled = bookSettings.isbn.trim().length > 0
  const isbnValid = !isbnFilled || validateIsbn13(bookSettings.isbn)

  const items: PreflightItem[] = [
    {
      id: 'author',
      label: 'Autor o seudónimo',
      status:
        projectSettings.authorName.trim() || projectSettings.penName.trim() ? 'complete' : 'blocked',
      detail:
        projectSettings.authorName.trim() || projectSettings.penName.trim()
          ? 'Identidad editorial definida.'
          : 'Falta definir el nombre de autor o seudónimo.',
    },
    {
      id: 'language',
      label: 'Idioma y estilo editorial',
      status: projectSettings.language ? 'complete' : 'blocked',
      detail: `Idioma: ${projectSettings.language === 'es' ? 'Español' : 'English'}.`,
    },
    {
      id: 'synopsis-short',
      label: 'Sinopsis corta',
      status: bookSettings.shortSynopsis.trim() ? 'complete' : 'blocked',
      detail: bookSettings.shortSynopsis.trim()
        ? `${bookSettings.shortSynopsis.trim().length} caracteres listos para venta.`
        : 'Falta una sinopsis corta para tiendas y materiales de promoción.',
    },
    {
      id: 'synopsis-long',
      label: 'Sinopsis larga',
      status: bookSettings.longSynopsis.trim() ? 'complete' : 'warning',
      detail: bookSettings.longSynopsis.trim()
        ? 'Hay una sinopsis editorial extendida.'
        : 'Todavía no hay sinopsis larga o briefing editorial.',
    },
    {
      id: 'bisac',
      label: 'Categorías BISAC',
      status:
        projectSettings.bisacCategories.length >= 2
          ? 'complete'
          : projectSettings.bisacCategories.length === 1
            ? 'warning'
            : 'blocked',
      detail: `${projectSettings.bisacCategories.length} categoría(s) cargadas.`,
    },
    {
      id: 'keywords',
      label: 'Keywords',
      status:
        projectSettings.keywords.length >= 5
          ? 'complete'
          : projectSettings.keywords.length >= 3
            ? 'warning'
            : 'blocked',
      detail: `${projectSettings.keywords.length} keyword(s) registradas.`,
    },
    {
      id: 'cover',
      label: 'Portada',
      status: input.coverValidation.passes ? 'complete' : 'blocked',
      detail: input.coverValidation.passes
        ? 'La portada cumple con el perfil de exportación seleccionado.'
        : input.coverValidation.warnings[0] || 'La portada todavía necesita revisión.',
    },
    {
      id: 'isbn',
      label: 'ISBN',
      status: !isbnFilled ? 'warning' : isbnValid ? 'complete' : 'blocked',
      detail: !isbnFilled
        ? 'No es obligatorio para todos los flujos, pero conviene dejarlo listo.'
        : isbnValid
          ? 'ISBN-13 válido.'
          : 'El ISBN no pasó la validación básica de checksum.',
    },
    {
      id: 'manuscript',
      label: 'Manuscrito base',
      status: input.wordCount > 0 && input.chapterCount > 0 ? 'complete' : 'blocked',
      detail:
        input.wordCount > 0 && input.chapterCount > 0
          ? `${input.chapterCount} capítulo(s) y ${input.wordCount.toLocaleString('es-ES')} palabras.`
          : 'Todavía no hay suficiente manuscrito para exportar un libro.',
    },
  ]

  return items
}

export function normalizeEditorialText(
  text: string,
  options: { language: Project['publicationSettings']['language']; quotationStyle: Project['publicationSettings']['quotationStyle'] }
) {
  let next = text.replace(/\.\.\./g, '…').replace(/(^|\n)\s*--?\s/g, '$1— ')

  if (options.language === 'es' && options.quotationStyle === 'latinas') {
    next = next.replace(/"([^"]+)"/g, '«$1»')
  }

  return next
}
