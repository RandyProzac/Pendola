// ============================================
// Péndola — Core Types
// ============================================

export type PublicationGoal = 'self_publish' | 'traditional'
export type PublicationLanguage = 'es' | 'en'
export type PublicationTargetProfile =
  | 'editorial_docx'
  | 'kdp_ebook_docx'
  | 'beta_reader_docx'
export type PublicationTrimSize = '5x8' | '5.25x8' | '5.5x8.5' | '6x9'
export type PublicationQuotationStyle = 'latinas' | 'inglesas'

export interface ProjectPublicationSettings {
  authorName: string
  penName: string
  language: PublicationLanguage
  publicationGoal: PublicationGoal
  targetProfile: PublicationTargetProfile
  trimSize: PublicationTrimSize
  copyrightYear: string
  bisacCategories: string[]
  keywords: string[]
  quotationStyle: PublicationQuotationStyle
}

export interface BookPublicationSettings {
  subtitle: string
  tagline: string
  shortSynopsis: string
  longSynopsis: string
  aboutAuthor: string
  isbn: string
  priceUsd: number
}

// --- Project ---
export type ProjectType = 'novela' | 'saga' | 'coleccion' | 'guion'
export type ProjectStatus = 'planificando' | 'escribiendo' | 'revisando' | 'completado'

export interface Project {
  id: string
  userId: string
  title: string
  type: ProjectType
  genre: string
  premise: string
  theme: string
  antiTheme: string
  creativeProfile: string
  aiInstructions: string
  editorialInstructions: string
  coverColor: string // Hex color for the card
  coverImagePath?: string
  publicationSettings: ProjectPublicationSettings
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

// --- Book ---
export type BookStatus = 'borrador' | 'revision' | 'completado'

export interface Book {
  id: string
  projectId: string
  title: string
  order: number
  synopsis: string
  publicationSettings: BookPublicationSettings
  status: BookStatus
  createdAt: string
  updatedAt: string
}

// --- Chapter ---
export type ChapterStatus = 'borrador' | 'generando' | 'revision' | 'aprobado' | 'completo'

export interface Chapter {
  id: string
  bookId: string
  projectId: string
  title: string
  order: number
  synopsis: string
  coverImagePath?: string
  content: string // TipTap JSON stringified
  beatNumber?: number
  wordCount: number
  trackedWritingSeconds?: number
  lastWritingAt?: string
  status: ChapterStatus
  createdAt: string
  updatedAt: string
}

export type SaveStatus = 'saved' | 'saving' | 'pending' | 'error'

export type ExportFormat = 'txt' | 'docx' | 'json'

export type ChapterSnapshotWorkspace = 'writing' | 'editorial'
export type ChapterSnapshotReason =
  | 'manual'
  | 'auto_interval'
  | 'chapter_switch'
  | 'before_unload'
  | 'restore_safety'
  | 'apply_editorial'
  | 'refresh_editorial'

export interface ChapterSnapshot {
  id: string
  projectId: string
  bookId: string
  chapterId: string
  editorialDraftId?: string
  workspace: ChapterSnapshotWorkspace
  chapterTitle: string
  content: string
  wordCount: number
  reason: ChapterSnapshotReason
  createdAt: string
}

export interface EditorialDraft {
  id: string
  projectId: string
  bookId: string
  chapterId: string
  content: string
  wordCount: number
  sourceChapterUpdatedAt: string
  sourceSnapshotContent?: string
  createdAt: string
  updatedAt: string
}

// --- Character ---
export interface CharacterAttributes {
  physical: { might: number; dexterity: number; stamina: number }
  mental: { intellect: number; cunning: number; resolve: number }
  social: { presence: number; manipulation: number; composure: number }
}

export interface CharacterTraits {
  direction: { knavish_honest: number; haughty_modest: number; harsh_gentle: number }
  energy: { apathetic_inquisitive: number; sloppy_meticulous: number; impulsive_prudent: number }
  process: { stubborn_cooperative: number; shy_bold: number; aloof_spirited: number }
  boundary: { detached_sentimental: number; conventional_eccentric: number; stoic_anxious: number }
}

export type ArchetypeDirection = 'Amenaza' | 'Santo'
export type ArchetypeEnergy = 'Despreocupado' | 'Estratega'
export type ArchetypeProcess = 'Ermitaño' | 'Pionero'
export type ArchetypeBoundary = 'Formalista' | 'Bohemio'

export interface CharacterArchetypes {
  direction: ArchetypeDirection
  energy: ArchetypeEnergy
  process: ArchetypeProcess
  boundary: ArchetypeBoundary
}

export interface CharacterRelationship {
  characterId: string
  label: string // e.g., "Mentor de", "Enemigo de"
}

export interface Character {
  id: string
  projectId: string
  name: string
  age?: number
  imageUrl?: string
  physicalDescription?: string

  // Motivations
  drive: string
  wish: string
  void: string
  vice: string
  origin: string
  persona: string
  expedition: string

  // Attributes (1-5)
  attributes: CharacterAttributes

  // Traits (0-100)
  traits: CharacterTraits

  // Values
  valueSector: string
  dominantValue: string

  // Archetypes (computed)
  archetypes: CharacterArchetypes

  // Relationships
  relationships: CharacterRelationship[]

  notes: string
  createdAt: string
  updatedAt: string
}

// --- Scenario (Location/Setting) ---
export type ScenarioType = 'interior' | 'exterior' | 'fantastico' | 'urbano' | 'natural' | 'otro'

export interface Scenario {
  id: string
  projectId: string
  name: string
  type: ScenarioType
  description: string
  atmosphere: string
  narrativeImportance: string
  associatedCharacterIds: string[]
  imageUrl?: string
  notes: string
  createdAt: string
  updatedAt: string
}

// --- Lorebook ---
export type LorebookCategory = 'personaje' | 'lugar' | 'objeto' | 'regla' | 'evento' | 'otro'

export interface LorebookEntry {
  id: string
  projectId: string
  name: string
  keywords: string[]
  content: string
  category: LorebookCategory
  enabled: boolean
  priority: number
  createdAt: string
}

// --- Narrative Graph ---
export type GraphNodeType = 'personaje' | 'lugar' | 'evento' | 'objeto'
export type GraphNodeLevel = 'principal' | 'secundario'

export interface GraphNode {
  id: string
  label: string
  subtitle: string
  type: GraphNodeType
  level: GraphNodeLevel
  description: string
  chapters: number[]
  x?: number
  y?: number
}

export interface GraphEdge {
  source: string
  target: string
  label: string
}

export interface NarrativeGraph {
  id: string
  projectId: string
  bookId?: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  updatedAt: string
}

// --- Resource (uploaded files) ---
export type ResourceFileType = 'pdf' | 'image' | 'text' | 'other'
export type ResourceExtractionMethod = 'text' | 'ocr'

export interface Resource {
  id: string
  projectId: string
  name: string
  fileType: ResourceFileType
  fileData?: string // base64 for local storage
  mediaPath?: string
  extractedContent?: string // AI-extracted text from the file
  extractionMethod?: ResourceExtractionMethod
  description: string
  createdAt: string
}

export type IdeaNoteColor = 'paper' | 'sun' | 'blush' | 'mint'

export interface IdeaNote {
  id: string
  projectId: string
  chapterId?: string
  title: string
  content: string
  color: IdeaNoteColor
  x: number
  y: number
  createdAt: string
  updatedAt: string
}

export type EntityMentionType = 'character' | 'scenario'

export interface EntityMention {
  id: string
  projectId: string
  bookId?: string
  chapterId: string
  entityType: EntityMentionType
  entityId: string
  text: string
  from?: number
  to?: number
  createdAt: string
}

// --- Hurricane Model (beats) ---
export type AIMode = 'piloto' | 'copiloto' | 'ideas' | 'revision' | 'editorial'
export type AIConversationWorkspace = 'writing' | 'editorial'

export type AIProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini'

export interface AISettings {
  provider: AIProvider
  openaiKey?: string
  anthropicKey?: string
  geminiKey?: string
  ollamaBaseUrl?: string
  ollamaKey?: string
  ollamaModel?: string
  monthlyBudgetUsd?: number
  budgetCycleStartedAt?: string
}

export type WriterFontOption = 'editorial' | 'clasica' | 'moderna' | 'sans'
export type WriterColumnWidth = 'compacta' | 'equilibrada' | 'amplia'

export interface WriterPreferences {
  editorFont: WriterFontOption
  fontSize: number
  lineHeight: number
  columnWidth: WriterColumnWidth
}

export interface AIRequestConfig {
  provider?: AIProvider
  apiKey?: string
  baseURL?: string
  model?: string
}

export interface AIVisualResourcePayload {
  id: string
  name: string
  description?: string
  imageUrl: string
  mediaType?: string
}

export interface AIUsageSnapshot {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
  estimatedCostUsd?: number
  provider?: AIProvider
  model?: string
  source?: 'provider' | 'cache'
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  mode?: AIMode
  responseType?: 'narrative_text' | 'rewrite' | 'ideas_list' | 'analysis' | 'qa'
  insertable?: boolean
  usage?: AIUsageSnapshot
}

export interface AIConversation {
  id: string
  projectId: string
  chapterId?: string
  workspace?: AIConversationWorkspace
  title: string
  mode: AIMode
  messages: AIChatMessage[]
  archivedAt?: string
  isGenerating?: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectBackup {
  version: 1
  exportedAt: string
  project: Project
  books: Book[]
  chapters: Chapter[]
  chapterSnapshots: ChapterSnapshot[]
  editorialDrafts: EditorialDraft[]
  characters: Character[]
  scenarios: Scenario[]
  resources: Resource[]
  ideaNotes: IdeaNote[]
  entityMentions: EntityMention[]
  aiConversations: AIConversation[]
}
