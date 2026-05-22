// ============================================
// Péndola — Project Store (Zustand + localStorage)
// ============================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { browserLocalAdapter } from '@/lib/persistence/browser-local-adapter'
import { createPersistStorage } from '@/lib/persistence/storage-adapter'
import { PROJECT_BACKUP_VERSION } from '@/lib/persistence/project-backup'
import {
  normalizeCharacterArchetypes,
  normalizeCharacterRecord,
} from '@/lib/characters/archetypes'
import { getCurrentSupabaseUserId } from '@/lib/supabase/runtime'
import {
  syncAIConversationDeletionRemote,
  syncAIConversationRemote,
  syncBookDeletionRemote,
  syncBookRemote,
  syncChapterDeletionRemote,
  syncChapterRemote,
  syncChapterSnapshotRemote,
  syncCharacterDeletionRemote,
  syncCharacterRemote,
  syncEditorialDraftDeletionRemote,
  syncEditorialDraftRemote,
  syncEntityMentionDeletionByEntityRemote,
  syncEntityMentionsForChapterRemote,
  syncIdeaNoteDeletionRemote,
  syncIdeaNoteRemote,
  syncProjectDeletionRemote,
  syncProjectRemote,
  syncResourceDeletionRemote,
  syncResourceRemote,
  syncScenarioDeletionRemote,
  syncScenarioRemote,
} from '@/lib/supabase/store-sync'
import type {
  Project,
  Book,
  Chapter,
  ChapterSnapshot,
  ChapterSnapshotReason,
  ChapterSnapshotWorkspace,
  Character,
  Scenario,
  Resource,
  IdeaNote,
  AISettings,
  WriterPreferences,
  AIConversation,
  AIChatMessage,
  AIMode,
  EntityMention,
  EntityMentionType,
  AIRequestConfig,
  EditorialDraft,
  AIConversationWorkspace,
  ProjectBackup,
} from '@/lib/types'

interface AIResponseCacheEntry {
  key: string
  mode: AIMode
  content: string
  responseType: 'narrative_text' | 'rewrite' | 'ideas_list' | 'analysis' | 'qa'
  insertable: boolean
  createdAt: string
}

interface ProjectStore {
  // --- Projects ---
  projects: Project[]
  currentProjectId: string | null
  createProject: (data: Partial<Project>) => Project
  updateProject: (id: string, data: Partial<Project>) => void
  deleteProject: (id: string) => void
  setCurrentProject: (id: string | null) => void
  getCurrentProject: () => Project | undefined

  // --- Books ---
  books: Book[]
  createBook: (projectId: string, data?: Partial<Book>) => Book
  updateBook: (id: string, data: Partial<Book>) => void
  deleteBook: (id: string) => void
  getBooksByProject: (projectId: string) => Book[]

  // --- Chapters ---
  chapters: Chapter[]
  createChapter: (bookId: string, projectId: string, data?: Partial<Chapter>) => Chapter
  updateChapter: (id: string, data: Partial<Chapter>) => void
  incrementChapterWritingTime: (id: string, seconds: number) => void
  deleteChapter: (id: string) => void
  getChaptersByBook: (bookId: string) => Chapter[]
  reorderChapters: (bookId: string, orderedChapterIds: string[]) => void

  // --- Chapter Snapshots ---
  chapterSnapshots: ChapterSnapshot[]
  createChapterSnapshot: (data: {
    chapterId: string
    workspace?: ChapterSnapshotWorkspace
    content?: string
    wordCount?: number
    chapterTitle?: string
    reason?: ChapterSnapshotReason
  }) => ChapterSnapshot | undefined
  getChapterSnapshotsByChapter: (
    chapterId: string,
    workspace?: ChapterSnapshotWorkspace
  ) => ChapterSnapshot[]
  restoreChapterSnapshot: (snapshotId: string) => void

  // --- Editorial Drafts ---
  editorialDrafts: EditorialDraft[]
  getEditorialDraftByChapter: (chapterId: string) => EditorialDraft | undefined
  createEditorialDraftFromChapter: (chapter: Chapter) => EditorialDraft
  updateEditorialDraft: (id: string, data: Partial<EditorialDraft>) => void
  refreshEditorialDraftFromChapter: (chapter: Chapter) => EditorialDraft
  applyEditorialDraftToChapter: (chapterId: string) => void
  deleteEditorialDraft: (id: string) => void
  isEditorialDraftOutdated: (chapterId: string) => boolean

  // --- Characters ---
  characters: Character[]
  createCharacter: (projectId: string, data?: Partial<Character>) => Character
  updateCharacter: (id: string, data: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  getCharactersByProject: (projectId: string) => Character[]

  // --- Scenarios ---
  scenarios: Scenario[]
  createScenario: (projectId: string, data?: Partial<Scenario>) => Scenario
  updateScenario: (id: string, data: Partial<Scenario>) => void
  deleteScenario: (id: string) => void
  getScenariosByProject: (projectId: string) => Scenario[]

  // --- Resources ---
  // --- Resource ---
  resources: Resource[]
  addResource: (projectId: string, data: Partial<Resource>) => Resource
  updateResource: (id: string, data: Partial<Resource>) => void
  deleteResource: (id: string) => void
  getResourcesByProject: (projectId: string) => Resource[]

  // --- Ideas ---
  ideaNotes: IdeaNote[]
  createIdeaNote: (projectId: string, data?: Partial<IdeaNote>) => IdeaNote
  updateIdeaNote: (id: string, data: Partial<IdeaNote>) => void
  deleteIdeaNote: (id: string) => void
  getIdeaNotesByProject: (projectId: string) => IdeaNote[]

  // --- AI Settings ---
  aiSettings: AISettings
  updateAISettings: (settings: Partial<AISettings>) => void
  writerPreferences: WriterPreferences
  updateWriterPreferences: (preferences: Partial<WriterPreferences>) => void

  // --- Entity Mentions ---
  entityMentions: EntityMention[]
  addEntityMention: (data: {
    projectId: string
    bookId?: string
    chapterId: string
    entityType: EntityMentionType
    entityId: string
    text: string
    from?: number
    to?: number
  }) => EntityMention
  getEntityMentionsByChapter: (chapterId: string) => EntityMention[]
  syncEntityMentionsByChapter: (
    chapterId: string,
    mentions: Array<{
      mentionId?: string
      entityType: EntityMentionType
      entityId?: string
      text: string
      from: number
      to: number
    }>
  ) => void
  deleteEntityMentionsByEntity: (entityType: EntityMentionType, entityId: string) => void

  // --- AI Conversations ---
  aiConversations: AIConversation[]
  aiResponseCache: AIResponseCacheEntry[]
  createAIConversation: (data: {
    projectId: string
    chapterId?: string
    workspace?: AIConversationWorkspace
    title?: string
    mode?: AIMode
  }) => AIConversation
  updateAIConversation: (id: string, data: Partial<AIConversation>) => void
  deleteAIConversation: (id: string) => void
  addAIMessageToConversation: (conversationId: string, message: AIChatMessage) => void
  replaceAIConversationMessages: (conversationId: string, messages: AIChatMessage[]) => void
  requestAIResponse: (data: {
    conversationId: string
    messageContent: string
    mode: AIMode
    projectTitle?: string
    chapterTitle?: string
    contextText?: string
    customConfig?: AIRequestConfig
    preferredLanguage?: string
    systemPrompt?: string
  }) => Promise<void>
  getAIConversationsByProject: (
    projectId: string,
    chapterId?: string,
    workspace?: AIConversationWorkspace
  ) => AIConversation[]
  exportProjectBackup: (projectId: string) => ProjectBackup | null
  importProjectBackup: (backup: ProjectBackup) => Project | null
}

const DEFAULT_CHARACTER_ATTRIBUTES = {
  physical: { might: 1, dexterity: 1, stamina: 1 },
  mental: { intellect: 1, cunning: 1, resolve: 1 },
  social: { presence: 1, manipulation: 1, composure: 1 },
}

const DEFAULT_CHARACTER_TRAITS = {
  direction: { knavish_honest: 50, haughty_modest: 50, harsh_gentle: 50 },
  energy: { apathetic_inquisitive: 50, sloppy_meticulous: 50, impulsive_prudent: 50 },
  process: { stubborn_cooperative: 50, shy_bold: 50, aloof_spirited: 50 },
  boundary: { detached_sentimental: 50, conventional_eccentric: 50, stoic_anxious: 50 },
}

const COVER_COLORS = [
  '#534AB7', '#0F6E56', '#D85A30', '#993C1D', '#3C3489',
  '#BA7517', '#712B13', '#639922', '#3B6D11', '#4A90B8',
]

const MAX_CHAPTER_SNAPSHOTS = 25
const MAX_AI_RESPONSE_CACHE_ENTRIES = 12
const MAX_AI_RESPONSE_CACHE_CONTENT_LENGTH = 20_000
const DEFAULT_WRITER_PREFERENCES: WriterPreferences = {
  editorFont: 'editorial',
  fontSize: 18,
  lineHeight: 1.85,
  columnWidth: 'equilibrada',
}

const DEFAULT_PROJECT_PUBLICATION_SETTINGS: Project['publicationSettings'] = {
  authorName: '',
  penName: '',
  language: 'es',
  publicationGoal: 'self_publish',
  targetProfile: 'editorial_docx',
  trimSize: '5.5x8.5',
  copyrightYear: String(new Date().getFullYear()),
  bisacCategories: [],
  keywords: [],
  quotationStyle: 'latinas',
}

const DEFAULT_BOOK_PUBLICATION_SETTINGS: Book['publicationSettings'] = {
  subtitle: '',
  tagline: '',
  shortSynopsis: '',
  longSynopsis: '',
  aboutAuthor: '',
  isbn: '',
  priceUsd: 14.99,
}

const IDEA_NOTE_COLORS: IdeaNote['color'][] = ['paper', 'sun', 'blush', 'mint']

function isLegacyBrokenResource(resource: Partial<Resource> | undefined) {
  if (!resource?.name) return false

  return (
    resource.fileType === 'image' &&
    resource.createdAt?.startsWith('2026-04-10') === true &&
    resource.name.startsWith('Alcalde, poblacion y teck en inauguracion de tanque de ag')
  )
}

function conversationStillExists(conversations: AIConversation[], conversationId: string) {
  return conversations.some((conversation) => conversation.id === conversationId)
}

function shouldCacheAIResponse(mode: AIMode) {
  return mode === 'revision' || mode === 'editorial'
}

function hashString(input: string) {
  let hash = 2166136261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function buildAIResponseCacheKey(input: {
  mode: AIMode
  contextText?: string
  preferredLanguage?: string
  systemPrompt?: string
  customConfig?: AIRequestConfig
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  return hashString(
    JSON.stringify({
      mode: input.mode,
      provider: input.customConfig?.provider || 'ollama',
      model: input.customConfig?.model || '',
      baseURL: input.customConfig?.baseURL || '',
      preferredLanguage: input.preferredLanguage || '',
      systemPrompt: input.systemPrompt || '',
      contextText: input.contextText || '',
      messages: input.messages,
    })
  )
}

function upsertAIResponseCacheEntry(
  existingEntries: AIResponseCacheEntry[],
  nextEntry: AIResponseCacheEntry
) {
  const withoutCurrent = existingEntries.filter((entry) => entry.key !== nextEntry.key)
  return [nextEntry, ...withoutCurrent].slice(0, MAX_AI_RESPONSE_CACHE_ENTRIES)
}

function keepRecentSnapshots(snapshots: ChapterSnapshot[]) {
  return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_CHAPTER_SNAPSHOTS)
}

function appendSnapshotWithLimit(
  existingSnapshots: ChapterSnapshot[],
  nextSnapshot: ChapterSnapshot
) {
  const scoped = existingSnapshots.filter(
    (snapshot) =>
      snapshot.chapterId === nextSnapshot.chapterId && snapshot.workspace === nextSnapshot.workspace
  )
  const latestSnapshot = [...scoped].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  if (latestSnapshot?.content === nextSnapshot.content) {
    return existingSnapshots
  }

  const withoutScoped = existingSnapshots.filter(
    (snapshot) =>
      snapshot.chapterId !== nextSnapshot.chapterId || snapshot.workspace !== nextSnapshot.workspace
  )

  return [...withoutScoped, ...keepRecentSnapshots([nextSnapshot, ...scoped])]
}

function cloneProjectWithFreshIds(backup: ProjectBackup) {
  const projectId = uuidv4()
  const now = new Date().toISOString()
  const activeUserId = getCurrentSupabaseUserId() || backup.project.userId || 'local-user'
  const bookIds = new Map<string, string>()
  const chapterIds = new Map<string, string>()
  const draftIds = new Map<string, string>()
  const characterIds = new Map<string, string>()
  const scenarioIds = new Map<string, string>()
  const resourceIds = new Map<string, string>()
  const ideaNoteIds = new Map<string, string>()
  const conversationIds = new Map<string, string>()

  backup.books.forEach((book) => bookIds.set(book.id, uuidv4()))
  backup.chapters.forEach((chapter) => chapterIds.set(chapter.id, uuidv4()))
  backup.editorialDrafts.forEach((draft) => draftIds.set(draft.id, uuidv4()))
  backup.characters.forEach((character) => characterIds.set(character.id, uuidv4()))
  backup.scenarios.forEach((scenario) => scenarioIds.set(scenario.id, uuidv4()))
  backup.resources.forEach((resource) => resourceIds.set(resource.id, uuidv4()))
  backup.ideaNotes.forEach((ideaNote) => ideaNoteIds.set(ideaNote.id, uuidv4()))
  backup.aiConversations.forEach((conversation) => conversationIds.set(conversation.id, uuidv4()))

  const project: Project = {
    ...backup.project,
    id: projectId,
    userId: activeUserId,
    publicationSettings: {
      ...DEFAULT_PROJECT_PUBLICATION_SETTINGS,
      ...backup.project.publicationSettings,
    },
    updatedAt: now,
  }

  return {
    project,
    books: backup.books.map((book) => ({
      ...book,
      id: bookIds.get(book.id) || uuidv4(),
      projectId,
      publicationSettings: {
        ...DEFAULT_BOOK_PUBLICATION_SETTINGS,
        ...book.publicationSettings,
      },
    })),
    chapters: backup.chapters.map((chapter) => ({
      ...chapter,
      id: chapterIds.get(chapter.id) || uuidv4(),
      projectId,
      bookId: bookIds.get(chapter.bookId) || chapter.bookId,
      synopsis: chapter.synopsis || '',
    })),
    chapterSnapshots: backup.chapterSnapshots.map((snapshot) => ({
      ...snapshot,
      id: uuidv4(),
      projectId,
      bookId: bookIds.get(snapshot.bookId) || snapshot.bookId,
      chapterId: chapterIds.get(snapshot.chapterId) || snapshot.chapterId,
      editorialDraftId: snapshot.editorialDraftId
        ? draftIds.get(snapshot.editorialDraftId) || snapshot.editorialDraftId
        : undefined,
    })),
    editorialDrafts: backup.editorialDrafts.map((draft) => ({
      ...draft,
      id: draftIds.get(draft.id) || uuidv4(),
      projectId,
      bookId: bookIds.get(draft.bookId) || draft.bookId,
      chapterId: chapterIds.get(draft.chapterId) || draft.chapterId,
    })),
    characters: backup.characters.map((character) => ({
      ...normalizeCharacterRecord(character),
      id: characterIds.get(character.id) || uuidv4(),
      projectId,
      relationships: character.relationships.map((relationship) => ({
        ...relationship,
        characterId: characterIds.get(relationship.characterId) || relationship.characterId,
      })),
    })),
    scenarios: backup.scenarios.map((scenario) => ({
      ...scenario,
      id: scenarioIds.get(scenario.id) || uuidv4(),
      projectId,
    })),
    resources: backup.resources.map((resource) => ({
      ...resource,
      id: resourceIds.get(resource.id) || uuidv4(),
      projectId,
    })),
    ideaNotes: backup.ideaNotes.map((ideaNote) => ({
      ...ideaNote,
      id: ideaNoteIds.get(ideaNote.id) || uuidv4(),
      projectId,
      chapterId: ideaNote.chapterId
        ? chapterIds.get(ideaNote.chapterId) || ideaNote.chapterId
        : undefined,
    })),
    entityMentions: backup.entityMentions.map((mention) => ({
      ...mention,
      id: uuidv4(),
      projectId,
      bookId: mention.bookId ? bookIds.get(mention.bookId) || mention.bookId : undefined,
      chapterId: chapterIds.get(mention.chapterId) || mention.chapterId,
      entityId:
        mention.entityType === 'character'
          ? characterIds.get(mention.entityId) || mention.entityId
          : scenarioIds.get(mention.entityId) || mention.entityId,
    })),
    aiConversations: backup.aiConversations.map((conversation) => ({
      ...conversation,
      id: conversationIds.get(conversation.id) || uuidv4(),
      projectId,
      chapterId: conversation.chapterId
        ? chapterIds.get(conversation.chapterId) || conversation.chapterId
        : undefined,
      isGenerating: false,
    })),
  }
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // ========== PROJECTS ==========
      projects: [],
      currentProjectId: null,

      createProject: (data) => {
        const id = data.id || uuidv4()
        const activeUserId = getCurrentSupabaseUserId() || data.userId || 'local-user'
        const project: Project = {
          id,
          userId: activeUserId,
          title: data.title || 'Nuevo Proyecto',
          type: data.type || 'novela',
          genre: data.genre || '',
          premise: data.premise || '',
          theme: data.theme || '',
          antiTheme: data.antiTheme || '',
          creativeProfile: data.creativeProfile || '',
          aiInstructions: data.aiInstructions || '',
          editorialInstructions: data.editorialInstructions || '',
          coverColor: data.coverColor || COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)],
          coverImagePath: data.coverImagePath,
          publicationSettings: {
            ...DEFAULT_PROJECT_PUBLICATION_SETTINGS,
            ...data.publicationSettings,
          },
          status: data.status || 'planificando',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ projects: [...state.projects, project] }))
        syncProjectRemote(project)
        return project
      },

      updateProject: (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        }))
        const nextProject = get().projects.find((project) => project.id === id)
        if (nextProject) {
          syncProjectRemote(nextProject)
        }
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          books: state.books.filter((b) => b.projectId !== id),
          chapters: state.chapters.filter((c) => c.projectId !== id),
          chapterSnapshots: state.chapterSnapshots.filter((snapshot) => snapshot.projectId !== id),
          editorialDrafts: state.editorialDrafts.filter((draft) => draft.projectId !== id),
          characters: state.characters.filter((c) => c.projectId !== id),
          scenarios: state.scenarios.filter((s) => s.projectId !== id),
          resources: state.resources.filter((r) => r.projectId !== id),
          ideaNotes: state.ideaNotes.filter((note) => note.projectId !== id),
          entityMentions: state.entityMentions.filter((mention) => mention.projectId !== id),
          aiConversations: state.aiConversations.filter((chat) => chat.projectId !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }))
        syncProjectDeletionRemote(id)
      },

      setCurrentProject: (id) => set({ currentProjectId: id }),

      getCurrentProject: () => {
        const state = get()
        return state.projects.find((p) => p.id === state.currentProjectId)
      },

      // ========== BOOKS ==========
      books: [],

      createBook: (projectId, data) => {
        const existingBooks = get().books.filter((b) => b.projectId === projectId)
        const id = data?.id || uuidv4()
        const book: Book = {
          id,
          projectId,
          title: data?.title || `Libro ${existingBooks.length + 1}`,
          order: data?.order ?? existingBooks.length + 1,
          synopsis: data?.synopsis || '',
          publicationSettings: {
            ...DEFAULT_BOOK_PUBLICATION_SETTINGS,
            ...data?.publicationSettings,
          },
          status: data?.status || 'borrador',
          createdAt: data?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ books: [...state.books, book] }))
        syncBookRemote(book)
        return book
      },

      updateBook: (id, data) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b
          ),
        }))
        const nextBook = get().books.find((book) => book.id === id)
        if (nextBook) {
          syncBookRemote(nextBook)
        }
      },

      deleteBook: (id) => {
        set((state) => ({
          books: state.books.filter((b) => b.id !== id),
          chapters: state.chapters.filter((c) => c.bookId !== id),
          chapterSnapshots: state.chapterSnapshots.filter((snapshot) => snapshot.bookId !== id),
          editorialDrafts: state.editorialDrafts.filter((draft) => draft.bookId !== id),
          entityMentions: state.entityMentions.filter((mention) => mention.bookId !== id),
          aiConversations: state.aiConversations.filter((chat) => {
            const chapterIds = state.chapters
              .filter((chapter) => chapter.bookId === id)
              .map((chapter) => chapter.id)
            return !chat.chapterId || !chapterIds.includes(chat.chapterId)
          }),
        }))
        syncBookDeletionRemote(id)
      },

      getBooksByProject: (projectId) => {
        return get().books.filter((b) => b.projectId === projectId).sort((a, b) => a.order - b.order)
      },

      // ========== CHAPTERS ==========
      chapters: [],

      createChapter: (bookId, projectId, data) => {
        const existingChapters = get().chapters.filter((c) => c.bookId === bookId)
        const id = data?.id || uuidv4()
        const chapter: Chapter = {
          id,
          bookId,
          projectId,
          title: data?.title || `Capítulo ${existingChapters.length + 1}`,
          order: data?.order ?? existingChapters.length + 1,
          synopsis: data?.synopsis || '',
          coverImagePath: data?.coverImagePath,
          content: data?.content || '',
          wordCount: data?.wordCount || 0,
          trackedWritingSeconds: data?.trackedWritingSeconds ?? 0,
          lastWritingAt: data?.lastWritingAt,
          status: data?.status || 'borrador',
          createdAt: data?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ chapters: [...state.chapters, chapter] }))
        syncChapterRemote(chapter, 0)
        return chapter
      },

      updateChapter: (id, data) => {
        set((state) => ({
          chapters: state.chapters.map((c) =>
            c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
          ),
        }))
        const nextChapter = get().chapters.find((chapter) => chapter.id === id)
        if (nextChapter) {
          syncChapterRemote(nextChapter)
        }
      },

      incrementChapterWritingTime: (id, seconds) => {
        if (seconds <= 0) return

        set((state) => ({
          chapters: state.chapters.map((chapter) =>
            chapter.id === id
              ? {
                  ...chapter,
                  trackedWritingSeconds: (chapter.trackedWritingSeconds ?? 0) + seconds,
                  lastWritingAt: new Date().toISOString(),
                }
              : chapter
          ),
        }))
        const nextChapter = get().chapters.find((chapter) => chapter.id === id)
        if (nextChapter) {
          syncChapterRemote(nextChapter)
        }
      },

      deleteChapter: (id) => {
        set((state) => ({
          chapters: state.chapters.filter((c) => c.id !== id),
          chapterSnapshots: state.chapterSnapshots.filter((snapshot) => snapshot.chapterId !== id),
          editorialDrafts: state.editorialDrafts.filter((draft) => draft.chapterId !== id),
          entityMentions: state.entityMentions.filter((mention) => mention.chapterId !== id),
          aiConversations: state.aiConversations.filter((chat) => chat.chapterId !== id),
        }))
        syncChapterDeletionRemote(id)
      },

      getChaptersByBook: (bookId) => {
        return get().chapters.filter((c) => c.bookId === bookId).sort((a, b) => a.order - b.order)
      },

      reorderChapters: (bookId, orderedChapterIds) => {
        set((state) => ({
          chapters: state.chapters.map((chapter) => {
            if (chapter.bookId !== bookId) return chapter

            const nextOrder = orderedChapterIds.indexOf(chapter.id)
            if (nextOrder === -1) return chapter

            return {
              ...chapter,
              order: nextOrder + 1,
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
        get()
          .chapters.filter((chapter) => chapter.bookId === bookId)
          .forEach((chapter) => syncChapterRemote(chapter))
      },

      chapterSnapshots: [],

      createChapterSnapshot: ({
        chapterId,
        workspace = 'writing',
        content,
        wordCount,
        chapterTitle,
        reason = 'manual',
      }) => {
        const state = get()
        const chapter = state.chapters.find((item) => item.id === chapterId)
        if (!chapter) return undefined

        const draft =
          workspace === 'editorial'
            ? state.editorialDrafts.find((item) => item.chapterId === chapterId)
            : undefined

        const snapshotContent = content ?? (workspace === 'editorial' ? draft?.content : chapter.content) ?? ''
        const snapshotWordCount =
          wordCount ?? (workspace === 'editorial' ? draft?.wordCount : chapter.wordCount) ?? 0

        if (!snapshotContent.trim()) return undefined

        const snapshot: ChapterSnapshot = {
          id: uuidv4(),
          projectId: chapter.projectId,
          bookId: chapter.bookId,
          chapterId,
          editorialDraftId: draft?.id,
          workspace,
          chapterTitle: chapterTitle || chapter.title,
          content: snapshotContent,
          wordCount: snapshotWordCount,
          reason,
          createdAt: new Date().toISOString(),
        }

        set((currentState) => ({
          chapterSnapshots: appendSnapshotWithLimit(currentState.chapterSnapshots, snapshot),
        }))
        syncChapterSnapshotRemote(snapshot)

        return snapshot
      },

      getChapterSnapshotsByChapter: (chapterId, workspace) => {
        return get().chapterSnapshots
          .filter((snapshot) => {
            if (snapshot.chapterId !== chapterId) return false
            if (!workspace) return true
            return snapshot.workspace === workspace
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      },

      restoreChapterSnapshot: (snapshotId) => {
        const state = get()
        const snapshot = state.chapterSnapshots.find((item) => item.id === snapshotId)
        if (!snapshot) return

        if (snapshot.workspace === 'editorial') {
          const draft = state.editorialDrafts.find((item) => item.chapterId === snapshot.chapterId)
          if (!draft) return

          get().createChapterSnapshot({
            chapterId: snapshot.chapterId,
            workspace: 'editorial',
            reason: 'restore_safety',
          })

          get().updateEditorialDraft(draft.id, {
            content: snapshot.content,
            wordCount: snapshot.wordCount,
          })
          return
        }

        get().createChapterSnapshot({
          chapterId: snapshot.chapterId,
          workspace: 'writing',
          reason: 'restore_safety',
        })
        get().updateChapter(snapshot.chapterId, {
          content: snapshot.content,
          wordCount: snapshot.wordCount,
        })
      },

      // ========== EDITORIAL DRAFTS ==========
      editorialDrafts: [],

      getEditorialDraftByChapter: (chapterId) => {
        return get().editorialDrafts.find((draft) => draft.chapterId === chapterId)
      },

      createEditorialDraftFromChapter: (chapter) => {
        const existingDraft = get().editorialDrafts.find((draft) => draft.chapterId === chapter.id)
        if (existingDraft) return existingDraft

        const now = new Date().toISOString()
        const draft: EditorialDraft = {
          id: uuidv4(),
          projectId: chapter.projectId,
          bookId: chapter.bookId,
          chapterId: chapter.id,
          content: chapter.content,
          wordCount: chapter.wordCount,
          sourceChapterUpdatedAt: chapter.updatedAt,
          sourceSnapshotContent: chapter.content,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          editorialDrafts: [...state.editorialDrafts, draft],
        }))
        syncEditorialDraftRemote(draft, 0)

        return draft
      },

      updateEditorialDraft: (id, data) => {
        set((state) => ({
          editorialDrafts: state.editorialDrafts.map((draft) =>
            draft.id === id ? { ...draft, ...data, updatedAt: new Date().toISOString() } : draft
          ),
        }))
        const nextDraft = get().editorialDrafts.find((draft) => draft.id === id)
        if (nextDraft) {
          syncEditorialDraftRemote(nextDraft)
        }
      },

      refreshEditorialDraftFromChapter: (chapter) => {
        get().createChapterSnapshot({
          chapterId: chapter.id,
          workspace: 'editorial',
          reason: 'refresh_editorial',
        })

        const now = new Date().toISOString()
        const existingDraft = get().editorialDrafts.find((draft) => draft.chapterId === chapter.id)

        if (!existingDraft) {
          const draft: EditorialDraft = {
            id: uuidv4(),
            projectId: chapter.projectId,
            bookId: chapter.bookId,
            chapterId: chapter.id,
            content: chapter.content,
            wordCount: chapter.wordCount,
            sourceChapterUpdatedAt: chapter.updatedAt,
            sourceSnapshotContent: chapter.content,
            createdAt: now,
            updatedAt: now,
          }

          set((state) => ({
            editorialDrafts: [...state.editorialDrafts, draft],
          }))
          syncEditorialDraftRemote(draft, 0)

          return draft
        }

        const refreshedDraft: EditorialDraft = {
          ...existingDraft,
          content: chapter.content,
          wordCount: chapter.wordCount,
          sourceChapterUpdatedAt: chapter.updatedAt,
          sourceSnapshotContent: chapter.content,
          updatedAt: now,
        }

        set((state) => ({
          editorialDrafts: state.editorialDrafts.map((draft) =>
            draft.id === existingDraft.id ? refreshedDraft : draft
          ),
        }))
        syncEditorialDraftRemote(refreshedDraft)

        return refreshedDraft
      },

      applyEditorialDraftToChapter: (chapterId) => {
        const state = get()
        const draft = state.editorialDrafts.find((item) => item.chapterId === chapterId)
        if (!draft) return

        get().createChapterSnapshot({
          chapterId,
          workspace: 'writing',
          reason: 'apply_editorial',
        })

        const syncTimestamp = new Date().toISOString()

        set((currentState) => ({
          chapters: currentState.chapters.map((chapter) =>
            chapter.id === chapterId
              ? {
                  ...chapter,
                  content: draft.content,
                  wordCount: draft.wordCount,
                  updatedAt: syncTimestamp,
                }
              : chapter
          ),
          editorialDrafts: currentState.editorialDrafts.map((item) =>
            item.chapterId === chapterId
              ? {
                  ...item,
                  sourceChapterUpdatedAt: syncTimestamp,
                  sourceSnapshotContent: draft.content,
                  updatedAt: syncTimestamp,
                }
              : item
          ),
        }))
        const nextChapter = get().chapters.find((chapter) => chapter.id === chapterId)
        if (nextChapter) {
          syncChapterRemote(nextChapter)
        }
        const nextDraft = get().editorialDrafts.find((item) => item.chapterId === chapterId)
        if (nextDraft) {
          syncEditorialDraftRemote(nextDraft)
        }
      },

      deleteEditorialDraft: (id) => {
        set((state) => ({
          editorialDrafts: state.editorialDrafts.filter((draft) => draft.id !== id),
        }))
        syncEditorialDraftDeletionRemote(id)
      },

      isEditorialDraftOutdated: (chapterId) => {
        const state = get()
        const chapter = state.chapters.find((item) => item.id === chapterId)
        const draft = state.editorialDrafts.find((item) => item.chapterId === chapterId)

        if (!chapter || !draft) return false
        return draft.sourceChapterUpdatedAt !== chapter.updatedAt
      },

      // ========== CHARACTERS ==========
      characters: [],

      createCharacter: (projectId, data) => {
        const traits = data?.traits || DEFAULT_CHARACTER_TRAITS
        const character: Character = {
          id: uuidv4(),
          projectId,
          name: data?.name || 'Nuevo Personaje',
          age: data?.age,
          imageUrl: data?.imageUrl,
          physicalDescription: data?.physicalDescription || '',
          drive: data?.drive || '',
          wish: data?.wish || '',
          void: data?.void || '',
          vice: data?.vice || '',
          origin: data?.origin || '',
          persona: data?.persona || '',
          expedition: data?.expedition || '',
          attributes: data?.attributes || DEFAULT_CHARACTER_ATTRIBUTES,
          traits,
          valueSector: data?.valueSector || '',
          dominantValue: data?.dominantValue || '',
          archetypes: normalizeCharacterArchetypes(data?.archetypes, traits),
          relationships: data?.relationships || [],
          notes: data?.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ characters: [...state.characters, character] }))
        syncCharacterRemote(character, 0)
        return character
      },

      updateCharacter: (id, data) => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
          ),
        }))
        const nextCharacter = get().characters.find((character) => character.id === id)
        if (nextCharacter) {
          syncCharacterRemote(nextCharacter)
        }
      },

      deleteCharacter: (id) => {
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
          entityMentions: state.entityMentions.filter(
            (mention) => !(mention.entityType === 'character' && mention.entityId === id)
          ),
        }))
        syncCharacterDeletionRemote(id)
      },

      getCharactersByProject: (projectId) => {
        return get().characters.filter((c) => c.projectId === projectId)
      },

      // ========== SCENARIOS ==========
      scenarios: [],

      createScenario: (projectId, data) => {
        const scenario: Scenario = {
          id: uuidv4(),
          projectId,
          name: data?.name || 'Nuevo Escenario',
          type: data?.type || 'otro',
          description: data?.description || '',
          atmosphere: data?.atmosphere || '',
          narrativeImportance: data?.narrativeImportance || '',
          associatedCharacterIds: data?.associatedCharacterIds || [],
          imageUrl: data?.imageUrl,
          notes: data?.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ scenarios: [...state.scenarios, scenario] }))
        syncScenarioRemote(scenario, 0)
        return scenario
      },

      updateScenario: (id, data) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
          ),
        }))
        const nextScenario = get().scenarios.find((scenario) => scenario.id === id)
        if (nextScenario) {
          syncScenarioRemote(nextScenario)
        }
      },

      deleteScenario: (id) => {
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
          entityMentions: state.entityMentions.filter(
            (mention) => !(mention.entityType === 'scenario' && mention.entityId === id)
          ),
        }))
        syncScenarioDeletionRemote(id)
      },

      getScenariosByProject: (projectId) => {
        return get().scenarios.filter((s) => s.projectId === projectId)
      },

      // ========== RESOURCES ==========
      resources: [],

      addResource: (projectId, data) => {
        const resource: Resource = {
          id: uuidv4(),
          projectId,
          name: data.name || 'Recurso sin nombre',
          fileType: data.fileType || 'other',
          fileData: data.fileData,
          mediaPath: data.mediaPath,
          extractedContent: data.extractedContent,
          extractionMethod: data.extractionMethod,
          description: data.description || '',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ resources: [...state.resources, resource] }))
        syncResourceRemote(resource, 0)
        return resource
      },

      updateResource: (id, data) => {
        set((state) => ({
          resources: state.resources.map((resource) =>
            resource.id === id ? { ...resource, ...data } : resource
          ),
        }))
        const nextResource = get().resources.find((resource) => resource.id === id)
        if (nextResource) {
          syncResourceRemote(nextResource)
        }
      },

      deleteResource: (id) => {
        set((state) => ({
          resources: state.resources.filter((r) => r.id !== id),
        }))
        syncResourceDeletionRemote(id)
      },

      getResourcesByProject: (projectId) => {
        return get().resources.filter((r) => r.projectId === projectId)
      },

      // ========== IDEAS ==========
      ideaNotes: [],

      createIdeaNote: (projectId, data) => {
        const now = new Date().toISOString()
        const ideaNotes = get().ideaNotes.filter((note) => note.projectId === projectId)
        const firstChapter = get()
          .chapters
          .filter((chapter) => chapter.projectId === projectId)
          .sort((a, b) => a.order - b.order)[0]
        const index = ideaNotes.length
        const column = index % 3
        const row = Math.floor(index / 3)
        const ideaNote: IdeaNote = {
          id: data?.id || uuidv4(),
          projectId,
          chapterId: data?.chapterId ?? firstChapter?.id,
          title: data?.title || '',
          content: data?.content || '',
          color: data?.color || IDEA_NOTE_COLORS[index % IDEA_NOTE_COLORS.length],
          x: data?.x ?? 48 + column * 248,
          y: data?.y ?? 64 + row * 208,
          createdAt: data?.createdAt || now,
          updatedAt: data?.updatedAt || now,
        }
        set((state) => ({ ideaNotes: [ideaNote, ...state.ideaNotes] }))
        syncIdeaNoteRemote(ideaNote, 0)
        return ideaNote
      },

      updateIdeaNote: (id, data) => {
        set((state) => ({
          ideaNotes: state.ideaNotes.map((ideaNote) =>
            ideaNote.id === id
              ? { ...ideaNote, ...data, updatedAt: new Date().toISOString() }
              : ideaNote
          ),
        }))
        const nextIdeaNote = get().ideaNotes.find((ideaNote) => ideaNote.id === id)
        if (nextIdeaNote) {
          syncIdeaNoteRemote(nextIdeaNote)
        }
      },

      deleteIdeaNote: (id) => {
        set((state) => ({
          ideaNotes: state.ideaNotes.filter((ideaNote) => ideaNote.id !== id),
        }))
        syncIdeaNoteDeletionRemote(id)
      },

      getIdeaNotesByProject: (projectId) => {
        return get()
          .ideaNotes
          .filter((ideaNote) => ideaNote.projectId === projectId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      },

      // ========== AI SETTINGS ==========
      aiSettings: {
        provider: 'ollama',
      },

      updateAISettings: (settings) => {
        set((state) => ({ aiSettings: { ...state.aiSettings, ...settings } }))
      },

      writerPreferences: DEFAULT_WRITER_PREFERENCES,

      updateWriterPreferences: (preferences) => {
        set((state) => ({
          writerPreferences: {
            ...state.writerPreferences,
            ...preferences,
          },
        }))
      },

      entityMentions: [],

      addEntityMention: ({ projectId, bookId, chapterId, entityType, entityId, text, from, to }) => {
        const mention: EntityMention = {
          id: uuidv4(),
          projectId,
          bookId,
          chapterId,
          entityType,
          entityId,
          text,
          from,
          to,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          entityMentions: [...state.entityMentions, mention],
        }))
        syncEntityMentionsForChapterRemote(
          chapterId,
          get().entityMentions.filter((item) => item.chapterId === chapterId)
        )
        return mention
      },

      getEntityMentionsByChapter: (chapterId) => {
        return get().entityMentions.filter((mention) => mention.chapterId === chapterId)
      },

      syncEntityMentionsByChapter: (chapterId, mentions) => {
        const state = get()
        const chapter = state.chapters.find((item) => item.id === chapterId)
        if (!chapter) return

        const existingMentions = state.entityMentions.filter((mention) => mention.chapterId === chapterId)
        const existingById = new Map(existingMentions.map((mention) => [mention.id, mention]))
        const nextMentions = mentions
          .filter((mention) => Boolean(mention.entityId))
          .map((mention) => {
            const existing = mention.mentionId ? existingById.get(mention.mentionId) : undefined
            return {
              id: mention.mentionId || existing?.id || uuidv4(),
              projectId: chapter.projectId,
              bookId: chapter.bookId,
              chapterId,
              entityType: mention.entityType,
              entityId: mention.entityId || existing?.entityId || '',
              text: mention.text,
              from: mention.from,
              to: mention.to,
              createdAt: existing?.createdAt || new Date().toISOString(),
            } satisfies EntityMention
          })

        const mentionsAreEqual =
          existingMentions.length === nextMentions.length &&
          existingMentions.every((mention, index) => {
            const nextMention = nextMentions[index]
            return (
              nextMention &&
              mention.id === nextMention.id &&
              mention.entityType === nextMention.entityType &&
              mention.entityId === nextMention.entityId &&
              mention.text === nextMention.text &&
              mention.from === nextMention.from &&
              mention.to === nextMention.to
            )
          })

        if (mentionsAreEqual) return

        set((currentState) => ({
          entityMentions: [
            ...currentState.entityMentions.filter((mention) => mention.chapterId !== chapterId),
            ...nextMentions,
          ],
        }))
        syncEntityMentionsForChapterRemote(chapterId, nextMentions)
      },

      deleteEntityMentionsByEntity: (entityType, entityId) => {
        set((state) => ({
          entityMentions: state.entityMentions.filter(
            (mention) => !(mention.entityType === entityType && mention.entityId === entityId)
          ),
        }))
        syncEntityMentionDeletionByEntityRemote(entityType, entityId)
      },

      aiConversations: [],
      aiResponseCache: [],

      createAIConversation: ({ projectId, chapterId, workspace, title, mode }) => {
        const now = new Date().toISOString()
        const conversation: AIConversation = {
          id: uuidv4(),
          projectId,
          chapterId,
          workspace: workspace || 'writing',
          title: title || 'Nueva conversación',
          mode: mode || 'copiloto',
          messages: [],
          isGenerating: false,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          aiConversations: [conversation, ...state.aiConversations],
        }))
        syncAIConversationRemote(conversation, 0)
        return conversation
      },

      updateAIConversation: (id, data) => {
        set((state) => ({
          aiConversations: state.aiConversations.map((chat) =>
            chat.id === id ? { ...chat, ...data, updatedAt: new Date().toISOString() } : chat
          ),
        }))
        const nextConversation = get().aiConversations.find((chat) => chat.id === id)
        if (nextConversation) {
          syncAIConversationRemote(nextConversation)
        }
      },

      deleteAIConversation: (id) => {
        set((state) => ({
          aiConversations: state.aiConversations.filter((chat) => chat.id !== id),
        }))
        syncAIConversationDeletionRemote(id)
      },

      addAIMessageToConversation: (conversationId, message) => {
        set((state) => ({
          aiConversations: state.aiConversations.map((chat) =>
            chat.id === conversationId
              ? {
                  ...chat,
                  messages: [...chat.messages, message],
                  updatedAt: new Date().toISOString(),
                }
              : chat
          ),
        }))
        const nextConversation = get().aiConversations.find((chat) => chat.id === conversationId)
        if (nextConversation) {
          syncAIConversationRemote(nextConversation)
        }
      },

      replaceAIConversationMessages: (conversationId, messages) => {
        set((state) => ({
          aiConversations: state.aiConversations.map((chat) =>
            chat.id === conversationId
              ? {
                  ...chat,
                  messages,
                  updatedAt: new Date().toISOString(),
                }
              : chat
          ),
        }))
        const nextConversation = get().aiConversations.find((chat) => chat.id === conversationId)
        if (nextConversation) {
          syncAIConversationRemote(nextConversation)
        }
      },

      requestAIResponse: async ({
        conversationId,
        messageContent,
        mode,
        projectTitle,
        chapterTitle,
        contextText,
        customConfig,
        preferredLanguage,
        systemPrompt,
      }) => {
        const conversation = get().aiConversations.find((chat) => chat.id === conversationId)
        if (!conversation || conversation.isGenerating) return

        const trimmedContent = messageContent.trim()
        if (!trimmedContent) return

        const userMessage: AIChatMessage = {
          id: uuidv4(),
          role: 'user',
          content: trimmedContent,
          timestamp: new Date().toISOString(),
          mode,
        }

        const requestMessages = [...conversation.messages, userMessage]
        const cacheKey = shouldCacheAIResponse(mode)
          ? buildAIResponseCacheKey({
              mode,
              contextText,
              customConfig,
              preferredLanguage,
              systemPrompt,
              messages: requestMessages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
            })
          : null

        set((state) => ({
          aiConversations: state.aiConversations.map((chat) => {
            if (chat.id !== conversationId) return chat

            return {
              ...chat,
              mode,
              isGenerating: true,
              messages: requestMessages,
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
        const pendingConversation = get().aiConversations.find((chat) => chat.id === conversationId)
        if (pendingConversation) {
          syncAIConversationRemote(pendingConversation)
        }

        try {
          const cachedResponse = cacheKey
            ? get().aiResponseCache.find((entry) => entry.key === cacheKey)
            : undefined

          if (cachedResponse) {
            const assistantMessage: AIChatMessage = {
              id: uuidv4(),
              role: 'assistant',
              content: cachedResponse.content,
              timestamp: new Date().toISOString(),
              mode,
              responseType: cachedResponse.responseType,
              insertable: cachedResponse.insertable,
            }

            set((state) => {
              if (!conversationStillExists(state.aiConversations, conversationId)) {
                return state
              }

              return {
                aiConversations: state.aiConversations.map((chat) =>
                  chat.id === conversationId
                    ? {
                        ...chat,
                        isGenerating: false,
                        messages: [...chat.messages, assistantMessage],
                        updatedAt: new Date().toISOString(),
                      }
                    : chat
                ),
              }
            })
            const cachedConversation = get().aiConversations.find((chat) => chat.id === conversationId)
            if (cachedConversation) {
              syncAIConversationRemote(cachedConversation)
            }

            return
          }

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structured: true,
              mode,
              projectTitle,
              chapterTitle,
              contextText,
              customConfig,
              preferredLanguage,
              messages: requestMessages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
              systemPrompt,
            }),
          })

          if (!response.ok) {
            const errData = await response.json()
            throw new Error(errData.error || 'Network response was not ok')
          }

          const structuredResponse = await response.json()
          const safeContent =
            typeof structuredResponse.content === 'string' && structuredResponse.content.trim()
              ? structuredResponse.content
              : 'La IA no devolvió contenido utilizable en este intento. Prueba reformulando la petición o cambia de modo.'

          const assistantMessage: AIChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: safeContent,
            timestamp: new Date().toISOString(),
            mode,
            responseType:
              safeContent === structuredResponse.content ? structuredResponse.type : 'qa',
            insertable:
              safeContent === structuredResponse.content ? structuredResponse.insertable : false,
          }

          set((state) => {
            if (!conversationStillExists(state.aiConversations, conversationId)) {
              return state
            }

            return {
              aiConversations: state.aiConversations.map((chat) =>
                chat.id === conversationId
                  ? {
                      ...chat,
                      isGenerating: false,
                      messages: [...chat.messages, assistantMessage],
                      updatedAt: new Date().toISOString(),
                    }
                  : chat
              ),
              aiResponseCache:
                cacheKey &&
                typeof structuredResponse.content === 'string' &&
                structuredResponse.content.trim() &&
                safeContent.length <= MAX_AI_RESPONSE_CACHE_CONTENT_LENGTH
                  ? upsertAIResponseCacheEntry(state.aiResponseCache, {
                      key: cacheKey,
                      mode,
                      content: safeContent,
                      responseType:
                        safeContent === structuredResponse.content ? structuredResponse.type : 'qa',
                      insertable:
                        safeContent === structuredResponse.content ? structuredResponse.insertable : false,
                      createdAt: new Date().toISOString(),
                    })
                  : state.aiResponseCache,
            }
          })
          const updatedConversation = get().aiConversations.find((chat) => chat.id === conversationId)
          if (updatedConversation) {
            syncAIConversationRemote(updatedConversation)
          }
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'El servidor de IA no respondió'
          const providerLabel =
            customConfig?.provider === 'openai'
              ? 'OpenAI'
              : customConfig?.provider === 'anthropic'
              ? 'Anthropic'
              : customConfig?.provider === 'gemini'
              ? 'Gemini'
              : 'Ollama'

          const assistantMessage: AIChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: `Error de conexión: ${message}.\n\nRevisa la configuración de ${providerLabel} e inténtalo otra vez.`,
            timestamp: new Date().toISOString(),
            mode,
            responseType: 'qa',
            insertable: false,
          }

          set((state) => {
            if (!conversationStillExists(state.aiConversations, conversationId)) {
              return state
            }

            return {
              aiConversations: state.aiConversations.map((chat) =>
                chat.id === conversationId
                  ? {
                      ...chat,
                      isGenerating: false,
                      messages: [...chat.messages, assistantMessage],
                      updatedAt: new Date().toISOString(),
                    }
                  : chat
              ),
            }
          })
        }
      },

      getAIConversationsByProject: (projectId, chapterId, workspace = 'writing') => {
        return get().aiConversations
          .filter((chat) => {
            if (chat.projectId !== projectId) return false
            if ((chat.workspace || 'writing') !== workspace) return false
            if (chapterId === undefined) return true
            return chat.chapterId === chapterId
          })
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      },

      exportProjectBackup: (projectId) => {
        const state = get()
        const project = state.projects.find((item) => item.id === projectId)
        if (!project) return null

        const books = state.books.filter((item) => item.projectId === projectId)
        const chapters = state.chapters.filter((item) => item.projectId === projectId)
        const chapterIds = new Set(chapters.map((item) => item.id))

        return {
          version: PROJECT_BACKUP_VERSION,
          exportedAt: new Date().toISOString(),
          project,
          books,
          chapters,
          chapterSnapshots: state.chapterSnapshots.filter((snapshot) =>
            chapterIds.has(snapshot.chapterId)
          ),
          editorialDrafts: state.editorialDrafts.filter((draft) => chapterIds.has(draft.chapterId)),
          characters: state.characters.filter((item) => item.projectId === projectId),
          scenarios: state.scenarios.filter((item) => item.projectId === projectId),
          resources: state.resources.filter((item) => item.projectId === projectId),
          ideaNotes: state.ideaNotes.filter((item) => item.projectId === projectId),
          entityMentions: state.entityMentions.filter((item) => chapterIds.has(item.chapterId)),
          aiConversations: state.aiConversations.filter(
            (item) => item.projectId === projectId && (!item.chapterId || chapterIds.has(item.chapterId))
          ),
        }
      },

      importProjectBackup: (backup) => {
        const imported = cloneProjectWithFreshIds(backup)

        set((state) => ({
          projects: [...state.projects, imported.project],
          books: [...state.books, ...imported.books],
          chapters: [...state.chapters, ...imported.chapters],
          chapterSnapshots: [...state.chapterSnapshots, ...imported.chapterSnapshots],
          editorialDrafts: [...state.editorialDrafts, ...imported.editorialDrafts],
          characters: [...state.characters, ...imported.characters.map(normalizeCharacterRecord)],
          scenarios: [...state.scenarios, ...imported.scenarios],
          resources: [...state.resources, ...imported.resources],
          ideaNotes: [...state.ideaNotes, ...imported.ideaNotes],
          entityMentions: [...state.entityMentions, ...imported.entityMentions],
          aiConversations: [...state.aiConversations, ...imported.aiConversations],
          currentProjectId: imported.project.id,
        }))

        syncProjectRemote(imported.project, 0)
        imported.books.forEach((book) => syncBookRemote(book, 0))
        imported.chapters.forEach((chapter) => syncChapterRemote(chapter, 0))
        imported.chapterSnapshots.forEach((snapshot) => syncChapterSnapshotRemote(snapshot))
        imported.editorialDrafts.forEach((draft) => syncEditorialDraftRemote(draft, 0))
        imported.characters.forEach((character) => syncCharacterRemote(character, 0))
        imported.scenarios.forEach((scenario) => syncScenarioRemote(scenario, 0))
        imported.resources.forEach((resource) => syncResourceRemote(resource, 0))
        imported.ideaNotes.forEach((ideaNote) => syncIdeaNoteRemote(ideaNote, 0))
        const mentionsByChapter = new Map<string, EntityMention[]>()
        imported.entityMentions.forEach((mention) => {
          const scoped = mentionsByChapter.get(mention.chapterId) ?? []
          scoped.push(mention)
          mentionsByChapter.set(mention.chapterId, scoped)
        })
        mentionsByChapter.forEach((mentions, chapterId) => {
          syncEntityMentionsForChapterRemote(chapterId, mentions)
        })
        imported.aiConversations.forEach((conversation) => syncAIConversationRemote(conversation, 0))

        return imported.project
      },
    }),
    {
      name: browserLocalAdapter.key,
      storage: createPersistStorage(browserLocalAdapter),
      version: 14,
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProjectStore> | undefined
        if (!state) return persistedState

        return {
          ...state,
          projects: (state.projects || []).map((project) => ({
            ...project,
            creativeProfile: project.creativeProfile || '',
            aiInstructions: project.aiInstructions || '',
            editorialInstructions: project.editorialInstructions || '',
            coverImagePath: project.coverImagePath || undefined,
          })),
          chapters: (state.chapters || []).map((chapter) => ({
            ...chapter,
            synopsis: chapter.synopsis || '',
            coverImagePath: chapter.coverImagePath || undefined,
          })),
          chapterSnapshots: state.chapterSnapshots || [],
          editorialDrafts: state.editorialDrafts || [],
          characters: (state.characters || []).map((character) => ({
            ...character,
            archetypes: normalizeCharacterArchetypes(character.archetypes, character.traits),
          })),
          resources: (state.resources || [])
            .filter((resource) => !isLegacyBrokenResource(resource))
            .map((resource) => ({
              ...resource,
              mediaPath: resource.mediaPath || undefined,
            })),
          ideaNotes: (state.ideaNotes || []).map((ideaNote) => ({
            ...ideaNote,
            chapterId: ideaNote.chapterId || undefined,
            title: ideaNote.title || '',
            content: ideaNote.content || '',
            color: ideaNote.color || 'paper',
            x: typeof ideaNote.x === 'number' ? ideaNote.x : 48,
            y: typeof ideaNote.y === 'number' ? ideaNote.y : 64,
            updatedAt: ideaNote.updatedAt || ideaNote.createdAt || new Date().toISOString(),
          })),
          aiConversations: (state.aiConversations || []).map((conversation) => ({
            ...conversation,
            workspace: conversation.workspace || 'writing',
            archivedAt: conversation.archivedAt || undefined,
            isGenerating: false,
          })),
          aiResponseCache: (state.aiResponseCache || []).slice(0, MAX_AI_RESPONSE_CACHE_ENTRIES),
          writerPreferences: {
            ...DEFAULT_WRITER_PREFERENCES,
            ...(state.writerPreferences || {}),
          },
        }
      },
    }
  )
)
