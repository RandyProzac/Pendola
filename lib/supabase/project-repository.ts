import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeCharacterRecord } from "@/lib/characters/archetypes";
import type {
  AIChatMessage,
  AIConversation,
  AISettings,
  Book,
  Chapter,
  ChapterSnapshot,
  Character,
  EditorialDraft,
  EntityMention,
  IdeaNote,
  Project,
  ProjectBackup,
  ProjectShare,
  Resource,
  Scenario,
  WriterPreferences,
} from "@/lib/types";

const STALE_CONVERSATION_DAYS = 60;

export class SupabaseSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseSetupError";
  }
}

export interface RemoteWorkspaceState {
  projects: Project[];
  projectShares: ProjectShare[];
  books: Book[];
  chapters: Chapter[];
  chapterSnapshots: ChapterSnapshot[];
  editorialDrafts: EditorialDraft[];
  characters: Character[];
  scenarios: Scenario[];
  resources: Resource[];
  ideaNotes: IdeaNote[];
  entityMentions: EntityMention[];
  aiConversations: AIConversation[];
  aiSettings?: AISettings;
  writerPreferences?: WriterPreferences;
}

function getClient() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase no está configurado en este entorno.");
  }
  return client;
}

function isMissingTableErrorMessage(message: string) {
  return (
    message.includes("schema cache") ||
    message.includes("Could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

function isMissingAIMessageUsageColumnErrorMessage(message: string) {
  return (
    message.includes("Could not find the 'usage' column of 'ai_messages'") ||
    (message.includes("schema cache") && message.includes("usage") && message.includes("ai_messages"))
  );
}

function isMissingProjectSharesTableErrorMessage(message: string) {
  return (
    message.includes("project_shares") &&
    (message.includes("schema cache") ||
      message.includes("Could not find the table") ||
      (message.includes("relation") && message.includes("does not exist")))
  );
}

function normalizeSupabaseError(error: { message: string } | null) {
  if (!error) return null;

  if (isMissingTableErrorMessage(error.message)) {
    return new SupabaseSetupError(
      "Falta aplicar la migración SQL de Péndola en Supabase antes de usar la nube."
    );
  }

  return new Error(error.message);
}

function ensureNoError<T>(error: { message: string } | null, fallback: T) {
  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) {
    throw normalizedError;
  }
  return fallback;
}

function mapProjectRow(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title ?? ""),
    type: (row.type as Project["type"]) ?? "novela",
    genre: String(row.genre ?? ""),
    premise: String(row.premise ?? ""),
    theme: String(row.theme ?? ""),
    antiTheme: String(row.anti_theme ?? ""),
    creativeProfile: String(row.creative_profile ?? ""),
    aiInstructions: String(row.ai_instructions ?? ""),
    editorialInstructions: String(row.editorial_instructions ?? ""),
    coverColor: String(row.cover_color ?? "#534AB7"),
    coverImagePath:
      typeof row.cover_image_path === "string" ? row.cover_image_path : undefined,
    publicationSettings: {
      authorName:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Project["publicationSettings"]).authorName === "string"
          ? (row.publication_settings as Project["publicationSettings"]).authorName
          : "",
      penName:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Project["publicationSettings"]).penName === "string"
          ? (row.publication_settings as Project["publicationSettings"]).penName
          : "",
      language:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        ((row.publication_settings as Project["publicationSettings"]).language === "en" ||
          (row.publication_settings as Project["publicationSettings"]).language === "es")
          ? (row.publication_settings as Project["publicationSettings"]).language
          : "es",
      publicationGoal:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        ((row.publication_settings as Project["publicationSettings"]).publicationGoal === "traditional" ||
          (row.publication_settings as Project["publicationSettings"]).publicationGoal === "self_publish")
          ? (row.publication_settings as Project["publicationSettings"]).publicationGoal
          : "self_publish",
      targetProfile:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Project["publicationSettings"]).targetProfile === "string"
          ? (row.publication_settings as Project["publicationSettings"]).targetProfile
          : "editorial_docx",
      trimSize:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Project["publicationSettings"]).trimSize === "string"
          ? (row.publication_settings as Project["publicationSettings"]).trimSize
          : "5.5x8.5",
      copyrightYear:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Project["publicationSettings"]).copyrightYear === "string"
          ? (row.publication_settings as Project["publicationSettings"]).copyrightYear
          : String(new Date().getFullYear()),
      bisacCategories:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        Array.isArray((row.publication_settings as Project["publicationSettings"]).bisacCategories)
          ? ((row.publication_settings as Project["publicationSettings"]).bisacCategories as string[])
          : [],
      keywords:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        Array.isArray((row.publication_settings as Project["publicationSettings"]).keywords)
          ? ((row.publication_settings as Project["publicationSettings"]).keywords as string[])
          : [],
      quotationStyle:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        (row.publication_settings as Project["publicationSettings"]).quotationStyle === "inglesas"
          ? "inglesas"
          : "latinas",
    },
    status: (row.status as Project["status"]) ?? "planificando",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProjectShareRow(row: Record<string, unknown>): ProjectShare {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    projectId: String(row.project_id),
    token: String(row.token ?? ""),
    isActive: typeof row.is_active === "boolean" ? row.is_active : false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapBookRow(row: Record<string, unknown>): Book {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title ?? ""),
    order: Number(row.order ?? 0),
    synopsis: String(row.synopsis ?? ""),
    publicationSettings: {
      subtitle:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Book["publicationSettings"]).subtitle === "string"
          ? (row.publication_settings as Book["publicationSettings"]).subtitle
          : "",
      tagline:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Book["publicationSettings"]).tagline === "string"
          ? (row.publication_settings as Book["publicationSettings"]).tagline
          : "",
      shortSynopsis:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Book["publicationSettings"]).shortSynopsis === "string"
          ? (row.publication_settings as Book["publicationSettings"]).shortSynopsis
          : "",
      longSynopsis:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Book["publicationSettings"]).longSynopsis === "string"
          ? (row.publication_settings as Book["publicationSettings"]).longSynopsis
          : "",
      aboutAuthor:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Book["publicationSettings"]).aboutAuthor === "string"
          ? (row.publication_settings as Book["publicationSettings"]).aboutAuthor
          : "",
      isbn:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Book["publicationSettings"]).isbn === "string"
          ? (row.publication_settings as Book["publicationSettings"]).isbn
          : "",
      priceUsd:
        typeof row.publication_settings === "object" &&
        row.publication_settings &&
        typeof (row.publication_settings as Book["publicationSettings"]).priceUsd === "number"
          ? (row.publication_settings as Book["publicationSettings"]).priceUsd
          : 14.99,
    },
    status: (row.status as Book["status"]) ?? "borrador",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapChapterRow(row: Record<string, unknown>): Chapter {
  return {
    id: String(row.id),
    bookId: String(row.book_id),
    projectId: String(row.project_id),
    title: String(row.title ?? ""),
    order: Number(row.order ?? 0),
    synopsis: String(row.synopsis ?? ""),
    coverImagePath:
      typeof row.cover_image_path === "string" ? row.cover_image_path : undefined,
    content: String(row.content ?? ""),
    beatNumber:
      typeof row.beat_number === "number" ? row.beat_number : undefined,
    wordCount: Number(row.word_count ?? 0),
    trackedWritingSeconds: Number(row.tracked_writing_seconds ?? 0),
    lastWritingAt:
      typeof row.last_writing_at === "string" ? row.last_writing_at : undefined,
    status: (row.status as Chapter["status"]) ?? "borrador",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSnapshotRow(row: Record<string, unknown>): ChapterSnapshot {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    bookId: String(row.book_id),
    chapterId: String(row.chapter_id),
    editorialDraftId:
      typeof row.editorial_draft_id === "string"
        ? row.editorial_draft_id
        : undefined,
    workspace: (row.workspace as ChapterSnapshot["workspace"]) ?? "writing",
    chapterTitle: String(row.chapter_title ?? ""),
    content: String(row.content ?? ""),
    wordCount: Number(row.word_count ?? 0),
    reason: (row.reason as ChapterSnapshot["reason"]) ?? "manual",
    createdAt: String(row.created_at),
  };
}

function mapEditorialDraftRow(row: Record<string, unknown>): EditorialDraft {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    bookId: String(row.book_id),
    chapterId: String(row.chapter_id),
    content: String(row.content ?? ""),
    wordCount: Number(row.word_count ?? 0),
    sourceChapterUpdatedAt: String(row.source_chapter_updated_at ?? ""),
    sourceSnapshotContent:
      typeof row.source_snapshot_content === "string"
        ? row.source_snapshot_content
        : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCharacterRow(row: Record<string, unknown>): Character {
  return normalizeCharacterRecord({
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name ?? ""),
    age: typeof row.age === "number" ? row.age : undefined,
    imageUrl: typeof row.image_url === "string" ? row.image_url : undefined,
    physicalDescription:
      typeof row.physical_description === "string"
        ? row.physical_description
        : undefined,
    drive: String(row.drive ?? ""),
    wish: String(row.wish ?? ""),
    void: String(row.void ?? ""),
    vice: String(row.vice ?? ""),
    origin: String(row.origin ?? ""),
    persona: String(row.persona ?? ""),
    expedition: String(row.expedition ?? ""),
    attributes: row.attributes as Character["attributes"],
    traits: row.traits as Character["traits"],
    valueSector: String(row.value_sector ?? ""),
    dominantValue: String(row.dominant_value ?? ""),
    archetypes: row.archetypes as Character["archetypes"],
    relationships: (row.relationships as Character["relationships"]) ?? [],
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });
}

function mapScenarioRow(row: Record<string, unknown>): Scenario {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name ?? ""),
    type: (row.type as Scenario["type"]) ?? "otro",
    description: String(row.description ?? ""),
    atmosphere: String(row.atmosphere ?? ""),
    narrativeImportance: String(row.narrative_importance ?? ""),
    associatedCharacterIds:
      (row.associated_character_ids as string[] | null) ?? [],
    imageUrl: typeof row.image_url === "string" ? row.image_url : undefined,
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapResourceRow(row: Record<string, unknown>): Resource {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name ?? ""),
    fileType: (row.file_type as Resource["fileType"]) ?? "other",
    fileData: typeof row.file_data === "string" ? row.file_data : undefined,
    mediaPath: typeof row.media_path === "string" ? row.media_path : undefined,
    extractedContent:
      typeof row.extracted_content === "string" ? row.extracted_content : undefined,
    extractionMethod:
      typeof row.extraction_method === "string"
        ? (row.extraction_method as Resource["extractionMethod"])
        : undefined,
    description: String(row.description ?? ""),
    createdAt: String(row.created_at),
  };
}

function mapIdeaNoteRow(row: Record<string, unknown>): IdeaNote {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    chapterId: typeof row.chapter_id === "string" ? row.chapter_id : undefined,
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    color: (row.color as IdeaNote["color"]) ?? "paper",
    x: Number(row.x ?? 0),
    y: Number(row.y ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapEntityMentionRow(row: Record<string, unknown>): EntityMention {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    bookId: typeof row.book_id === "string" ? row.book_id : undefined,
    chapterId: String(row.chapter_id),
    entityType: row.entity_type as EntityMention["entityType"],
    entityId: String(row.entity_id ?? ""),
    text: String(row.text ?? ""),
    from: typeof row.from_position === "number" ? row.from_position : undefined,
    to: typeof row.to_position === "number" ? row.to_position : undefined,
    createdAt: String(row.created_at),
  };
}

function mapAIMessageRow(row: Record<string, unknown>): AIChatMessage {
  return {
    id: String(row.id),
    role: (row.role as AIChatMessage["role"]) ?? "assistant",
    content: String(row.content ?? ""),
    timestamp: String(row.created_at),
    mode:
      typeof row.mode === "string"
        ? (row.mode as AIChatMessage["mode"])
        : undefined,
    responseType:
      typeof row.response_type === "string"
        ? (row.response_type as AIChatMessage["responseType"])
        : undefined,
    insertable:
      typeof row.insertable === "boolean" ? row.insertable : undefined,
    usage:
      row.usage && typeof row.usage === "object"
        ? (row.usage as AIChatMessage["usage"])
        : undefined,
  };
}

function mapUserSettingsRow(row: Record<string, unknown>) {
  const aiSettingsRaw =
    typeof row.ai_settings === "object" && row.ai_settings ? (row.ai_settings as Partial<AISettings>) : {};
  const writerPreferencesRaw =
    typeof row.writer_preferences === "object" && row.writer_preferences
      ? (row.writer_preferences as Partial<WriterPreferences>)
      : {};

  return {
    aiSettings: {
      provider: aiSettingsRaw.provider ?? "ollama",
      openaiKey: aiSettingsRaw.openaiKey || undefined,
      anthropicKey: aiSettingsRaw.anthropicKey || undefined,
      geminiKey: aiSettingsRaw.geminiKey || undefined,
      ollamaBaseUrl: aiSettingsRaw.ollamaBaseUrl || undefined,
      ollamaKey: aiSettingsRaw.ollamaKey || undefined,
      ollamaModel: aiSettingsRaw.ollamaModel || undefined,
      monthlyBudgetUsd:
        typeof aiSettingsRaw.monthlyBudgetUsd === "number" ? aiSettingsRaw.monthlyBudgetUsd : undefined,
      budgetCycleStartedAt: aiSettingsRaw.budgetCycleStartedAt || undefined,
    } satisfies AISettings,
    writerPreferences: {
      editorFont: writerPreferencesRaw.editorFont ?? "editorial",
      fontSize: typeof writerPreferencesRaw.fontSize === "number" ? writerPreferencesRaw.fontSize : 18,
      lineHeight:
        typeof writerPreferencesRaw.lineHeight === "number" ? writerPreferencesRaw.lineHeight : 1.8,
      columnWidth: writerPreferencesRaw.columnWidth ?? "equilibrada",
    } satisfies WriterPreferences,
  };
}

function mapAIConversationRow(
  row: Record<string, unknown>,
  messages: AIChatMessage[]
): AIConversation {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    chapterId: typeof row.chapter_id === "string" ? row.chapter_id : undefined,
    workspace:
      typeof row.workspace === "string"
        ? (row.workspace as AIConversation["workspace"])
        : "writing",
    title: String(row.title ?? "Nueva conversación"),
    mode: (row.mode as AIConversation["mode"]) ?? "copiloto",
    messages,
    archivedAt:
      typeof row.archived_at === "string" ? row.archived_at : undefined,
    isGenerating: false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toProjectRow(userId: string, project: Project) {
  return {
    id: project.id,
    user_id: userId,
    title: project.title,
    type: project.type,
    genre: project.genre,
    premise: project.premise,
    theme: project.theme,
    anti_theme: project.antiTheme,
    creative_profile: project.creativeProfile,
    ai_instructions: project.aiInstructions,
    editorial_instructions: project.editorialInstructions,
    cover_color: project.coverColor,
    cover_image_path: project.coverImagePath ?? null,
    publication_settings: project.publicationSettings,
    status: project.status,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

function toProjectShareRow(userId: string, share: ProjectShare) {
  return {
    id: share.id,
    user_id: userId,
    project_id: share.projectId,
    token: share.token,
    is_active: share.isActive,
    created_at: share.createdAt,
    updated_at: share.updatedAt,
  };
}

function toBookRow(userId: string, book: Book) {
  return {
    id: book.id,
    user_id: userId,
    project_id: book.projectId,
    title: book.title,
    order: book.order,
    synopsis: book.synopsis,
    publication_settings: book.publicationSettings,
    status: book.status,
    created_at: book.createdAt,
    updated_at: book.updatedAt,
  };
}

function toChapterRow(userId: string, chapter: Chapter) {
  return {
    id: chapter.id,
    user_id: userId,
    project_id: chapter.projectId,
    book_id: chapter.bookId,
    title: chapter.title,
    order: chapter.order,
    synopsis: chapter.synopsis,
    cover_image_path: chapter.coverImagePath ?? null,
    content: chapter.content,
    beat_number: chapter.beatNumber ?? null,
    word_count: chapter.wordCount,
    tracked_writing_seconds: chapter.trackedWritingSeconds ?? 0,
    last_writing_at: chapter.lastWritingAt ?? null,
    status: chapter.status,
    created_at: chapter.createdAt,
    updated_at: chapter.updatedAt,
  };
}

function toSnapshotRow(userId: string, snapshot: ChapterSnapshot) {
  return {
    id: snapshot.id,
    user_id: userId,
    project_id: snapshot.projectId,
    book_id: snapshot.bookId,
    chapter_id: snapshot.chapterId,
    editorial_draft_id: snapshot.editorialDraftId ?? null,
    workspace: snapshot.workspace,
    chapter_title: snapshot.chapterTitle,
    content: snapshot.content,
    word_count: snapshot.wordCount,
    reason: snapshot.reason,
    created_at: snapshot.createdAt,
  };
}

function toEditorialDraftRow(userId: string, draft: EditorialDraft) {
  return {
    id: draft.id,
    user_id: userId,
    project_id: draft.projectId,
    book_id: draft.bookId,
    chapter_id: draft.chapterId,
    content: draft.content,
    word_count: draft.wordCount,
    source_chapter_updated_at: draft.sourceChapterUpdatedAt,
    source_snapshot_content: draft.sourceSnapshotContent ?? null,
    created_at: draft.createdAt,
    updated_at: draft.updatedAt,
  };
}

function toCharacterRow(userId: string, character: Character) {
  return {
    id: character.id,
    user_id: userId,
    project_id: character.projectId,
    name: character.name,
    age: character.age ?? null,
    image_url: character.imageUrl ?? null,
    physical_description: character.physicalDescription ?? null,
    drive: character.drive,
    wish: character.wish,
    void: character.void,
    vice: character.vice,
    origin: character.origin,
    persona: character.persona,
    expedition: character.expedition,
    attributes: character.attributes,
    traits: character.traits,
    value_sector: character.valueSector,
    dominant_value: character.dominantValue,
    archetypes: character.archetypes,
    relationships: character.relationships,
    notes: character.notes,
    created_at: character.createdAt,
    updated_at: character.updatedAt,
  };
}

function toScenarioRow(userId: string, scenario: Scenario) {
  return {
    id: scenario.id,
    user_id: userId,
    project_id: scenario.projectId,
    name: scenario.name,
    type: scenario.type,
    description: scenario.description,
    atmosphere: scenario.atmosphere,
    narrative_importance: scenario.narrativeImportance,
    associated_character_ids: scenario.associatedCharacterIds,
    image_url: scenario.imageUrl ?? null,
    notes: scenario.notes,
    created_at: scenario.createdAt,
    updated_at: scenario.updatedAt,
  };
}

function toResourceRow(userId: string, resource: Resource) {
  return {
    id: resource.id,
    user_id: userId,
    project_id: resource.projectId,
    name: resource.name,
    file_type: resource.fileType,
    file_data: resource.fileData ?? null,
    media_path: resource.mediaPath ?? null,
    extracted_content: resource.extractedContent ?? null,
    extraction_method: resource.extractionMethod ?? null,
    description: resource.description,
    created_at: resource.createdAt,
  };
}

function toIdeaNoteRow(userId: string, ideaNote: IdeaNote) {
  return {
    id: ideaNote.id,
    user_id: userId,
    project_id: ideaNote.projectId,
    chapter_id: ideaNote.chapterId ?? null,
    title: ideaNote.title,
    content: ideaNote.content,
    color: ideaNote.color,
    x: ideaNote.x,
    y: ideaNote.y,
    created_at: ideaNote.createdAt,
    updated_at: ideaNote.updatedAt,
  };
}

function toEntityMentionRow(userId: string, mention: EntityMention) {
  return {
    id: mention.id,
    user_id: userId,
    project_id: mention.projectId,
    book_id: mention.bookId ?? null,
    chapter_id: mention.chapterId,
    entity_type: mention.entityType,
    entity_id: mention.entityId,
    text: mention.text,
    from_position: mention.from ?? null,
    to_position: mention.to ?? null,
    created_at: mention.createdAt,
  };
}

function getConversationLastMessageAt(conversation: AIConversation) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  return lastMessage?.timestamp ?? conversation.updatedAt;
}

function toAIConversationRow(userId: string, conversation: AIConversation) {
  return {
    id: conversation.id,
    user_id: userId,
    project_id: conversation.projectId,
    chapter_id: conversation.chapterId ?? null,
    workspace: conversation.workspace ?? "writing",
    title: conversation.title,
    mode: conversation.mode,
    archived_at: conversation.archivedAt ?? null,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
    last_message_at: getConversationLastMessageAt(conversation),
  };
}

function toAIMessageRows(userId: string, conversation: AIConversation) {
  return conversation.messages.map((message) => ({
    id: message.id,
    user_id: userId,
    conversation_id: conversation.id,
    role: message.role,
    content: message.content,
    mode: message.mode ?? null,
    response_type: message.responseType ?? null,
    insertable:
      typeof message.insertable === "boolean" ? message.insertable : null,
    usage: message.usage ?? null,
    created_at: message.timestamp,
  }));
}

function stripUsageFromAIMessageRows<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map(({ usage: _usage, ...row }) => row);
}

function toUserSettingsRow(
  userId: string,
  input: {
    aiSettings: AISettings;
    writerPreferences: WriterPreferences;
  }
) {
  return {
    user_id: userId,
    ai_settings: input.aiSettings,
    writer_preferences: input.writerPreferences,
    updated_at: new Date().toISOString(),
  };
}

export async function archiveStaleAIConversations(userId: string) {
  const client = getClient();
  const cutoff = new Date(
    Date.now() - STALE_CONVERSATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await client
    .from("ai_conversations")
    .update({ archived_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("archived_at", null)
    .lt("last_message_at", cutoff);

  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) {
    throw normalizedError;
  }
}

export async function fetchRemoteWorkspaceState(
  userId: string
): Promise<RemoteWorkspaceState> {
  const client = getClient();

  await archiveStaleAIConversations(userId);

  const [
    projectsResult,
    projectSharesResult,
    booksResult,
    chaptersResult,
    snapshotsResult,
    draftsResult,
    charactersResult,
    scenariosResult,
    resourcesResult,
    ideaNotesResult,
    mentionsResult,
    conversationsResult,
    messagesResult,
    userSettingsResult,
  ] = await Promise.all([
    client.from("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("project_shares").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("books").select("*").eq("user_id", userId).order("order", { ascending: true }),
    client.from("chapters").select("*").eq("user_id", userId).order("order", { ascending: true }),
    client.from("chapter_snapshots").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("editorial_drafts").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("characters").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("scenarios").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("resources").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("idea_notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("entity_mentions").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("ai_conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("ai_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const projects = ensureNoError(
    projectsResult.error,
    (projectsResult.data ?? []).map((row) => mapProjectRow(row))
  );
  const projectShares = projectSharesResult.error
    ? isMissingProjectSharesTableErrorMessage(projectSharesResult.error.message)
      ? []
      : ensureNoError(projectSharesResult.error, [] as ProjectShare[])
    : (projectSharesResult.data ?? []).map((row) => mapProjectShareRow(row));
  const books = ensureNoError(
    booksResult.error,
    (booksResult.data ?? []).map((row) => mapBookRow(row))
  );
  const chapters = ensureNoError(
    chaptersResult.error,
    (chaptersResult.data ?? []).map((row) => mapChapterRow(row))
  );
  const chapterSnapshots = ensureNoError(
    snapshotsResult.error,
    (snapshotsResult.data ?? []).map((row) => mapSnapshotRow(row))
  );
  const editorialDrafts = ensureNoError(
    draftsResult.error,
    (draftsResult.data ?? []).map((row) => mapEditorialDraftRow(row))
  );
  const characters = ensureNoError(
    charactersResult.error,
    (charactersResult.data ?? []).map((row) => mapCharacterRow(row))
  );
  const scenarios = ensureNoError(
    scenariosResult.error,
    (scenariosResult.data ?? []).map((row) => mapScenarioRow(row))
  );
  const resources = ensureNoError(
    resourcesResult.error,
    (resourcesResult.data ?? []).map((row) => mapResourceRow(row))
  );
  const ideaNotes = ensureNoError(
    ideaNotesResult.error,
    (ideaNotesResult.data ?? []).map((row) => mapIdeaNoteRow(row))
  );
  const entityMentions = ensureNoError(
    mentionsResult.error,
    (mentionsResult.data ?? []).map((row) => mapEntityMentionRow(row))
  );
  const conversationRows = ensureNoError(
    conversationsResult.error,
    conversationsResult.data ?? []
  );
  const messageRows = ensureNoError(messagesResult.error, messagesResult.data ?? []);
  const userSettingsRow = ensureNoError(userSettingsResult.error, userSettingsResult.data ?? null);
  const messagesByConversationId = new Map<string, AIChatMessage[]>();

  messageRows.forEach((row) => {
    const conversationId = String(row.conversation_id);
    const messages = messagesByConversationId.get(conversationId) ?? [];
    messages.push(mapAIMessageRow(row));
    messagesByConversationId.set(conversationId, messages);
  });

  const aiConversations = conversationRows.map((row) =>
    mapAIConversationRow(
      row,
      messagesByConversationId.get(String(row.id)) ?? []
    )
  );

  const settings = userSettingsRow ? mapUserSettingsRow(userSettingsRow) : undefined;

  return {
    projects,
    projectShares,
    books,
    chapters,
    chapterSnapshots,
    editorialDrafts,
    characters,
    scenarios,
    resources,
    ideaNotes,
    entityMentions,
    aiConversations,
    aiSettings: settings?.aiSettings,
    writerPreferences: settings?.writerPreferences,
  };
}

export async function listProjectSharesRemote(userId: string) {
  const client = getClient();
  const result = await client
    .from("project_shares")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (result.error) {
    if (isMissingProjectSharesTableErrorMessage(result.error.message)) {
      return [];
    }

    const normalizedError = normalizeSupabaseError(result.error);
    if (normalizedError) {
      throw normalizedError;
    }
  }

  return (result.data ?? []).map((row) => mapProjectShareRow(row));
}

export async function upsertUserSettingsRemote(
  userId: string,
  input: {
    aiSettings: AISettings;
    writerPreferences: WriterPreferences;
  }
) {
  const client = getClient();
  const { error } = await client.from("user_settings").upsert(toUserSettingsRow(userId, input));
  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) {
    throw normalizedError;
  }
}

export async function upsertProjectRemote(userId: string, project: Project) {
  const client = getClient();
  const { error } = await client.from("projects").upsert(toProjectRow(userId, project));
  if (error) throw new Error(error.message);
}

export async function deleteProjectRemote(projectId: string) {
  const client = getClient();
  const { error } = await client.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);
}

export async function upsertProjectShareRemote(userId: string, share: ProjectShare) {
  const client = getClient();
  const { error } = await client
    .from("project_shares")
    .upsert(toProjectShareRow(userId, share));

  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) {
    throw normalizedError;
  }
}

export async function deleteProjectShareRemote(shareId: string) {
  const client = getClient();
  const { error } = await client.from("project_shares").delete().eq("id", shareId);
  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) {
    throw normalizedError;
  }
}

export async function upsertBookRemote(userId: string, book: Book) {
  const client = getClient();
  const { error } = await client.from("books").upsert(toBookRow(userId, book));
  if (error) throw new Error(error.message);
}

export async function deleteBookRemote(bookId: string) {
  const client = getClient();
  const { error } = await client.from("books").delete().eq("id", bookId);
  if (error) throw new Error(error.message);
}

export async function upsertChapterRemote(userId: string, chapter: Chapter) {
  const client = getClient();
  const { error } = await client.from("chapters").upsert(toChapterRow(userId, chapter));
  if (error) throw new Error(error.message);
}

export async function deleteChapterRemote(chapterId: string) {
  const client = getClient();
  const { error } = await client.from("chapters").delete().eq("id", chapterId);
  if (error) throw new Error(error.message);
}

export async function upsertChapterSnapshotRemote(
  userId: string,
  snapshot: ChapterSnapshot
) {
  const client = getClient();
  const { error } = await client
    .from("chapter_snapshots")
    .upsert(toSnapshotRow(userId, snapshot));
  if (error) throw new Error(error.message);
}

export async function upsertEditorialDraftRemote(
  userId: string,
  draft: EditorialDraft
) {
  const client = getClient();
  const { error } = await client
    .from("editorial_drafts")
    .upsert(toEditorialDraftRow(userId, draft));
  if (error) throw new Error(error.message);
}

export async function deleteEditorialDraftRemote(draftId: string) {
  const client = getClient();
  const { error } = await client
    .from("editorial_drafts")
    .delete()
    .eq("id", draftId);
  if (error) throw new Error(error.message);
}

export async function upsertCharacterRemote(userId: string, character: Character) {
  const client = getClient();
  const { error } = await client
    .from("characters")
    .upsert(toCharacterRow(userId, character));
  if (error) throw new Error(error.message);
}

export async function deleteCharacterRemote(characterId: string) {
  const client = getClient();
  const { error } = await client.from("characters").delete().eq("id", characterId);
  if (error) throw new Error(error.message);
}

export async function upsertScenarioRemote(userId: string, scenario: Scenario) {
  const client = getClient();
  const { error } = await client
    .from("scenarios")
    .upsert(toScenarioRow(userId, scenario));
  if (error) throw new Error(error.message);
}

export async function deleteScenarioRemote(scenarioId: string) {
  const client = getClient();
  const { error } = await client.from("scenarios").delete().eq("id", scenarioId);
  if (error) throw new Error(error.message);
}

export async function upsertResourceRemote(userId: string, resource: Resource) {
  const client = getClient();
  const { error } = await client
    .from("resources")
    .upsert(toResourceRow(userId, resource));
  if (error) throw new Error(error.message);
}

export async function deleteResourceRemote(resourceId: string) {
  const client = getClient();
  const { error } = await client.from("resources").delete().eq("id", resourceId);
  if (error) throw new Error(error.message);
}

export async function upsertIdeaNoteRemote(userId: string, ideaNote: IdeaNote) {
  const client = getClient();
  const { error } = await client
    .from("idea_notes")
    .upsert(toIdeaNoteRow(userId, ideaNote));
  if (error) throw new Error(error.message);
}

export async function deleteIdeaNoteRemote(ideaNoteId: string) {
  const client = getClient();
  const { error } = await client.from("idea_notes").delete().eq("id", ideaNoteId);
  if (error) throw new Error(error.message);
}

export async function replaceEntityMentionsForChapterRemote(
  userId: string,
  chapterId: string,
  mentions: EntityMention[]
) {
  const client = getClient();
  const { error: deleteError } = await client
    .from("entity_mentions")
    .delete()
    .eq("chapter_id", chapterId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (mentions.length === 0) return;

  const { error } = await client
    .from("entity_mentions")
    .insert(mentions.map((mention) => toEntityMentionRow(userId, mention)));
  if (error) throw new Error(error.message);
}

export async function deleteEntityMentionsByEntityRemote(
  userId: string,
  entityType: EntityMention["entityType"],
  entityId: string
) {
  const client = getClient();
  const { error } = await client
    .from("entity_mentions")
    .delete()
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) throw new Error(error.message);
}

export async function upsertAIConversationRemote(
  userId: string,
  conversation: AIConversation
) {
  const client = getClient();
  const { error: conversationError } = await client
    .from("ai_conversations")
    .upsert(toAIConversationRow(userId, conversation));

  if (conversationError) {
    throw new Error(conversationError.message);
  }

  const { error: deleteMessagesError } = await client
    .from("ai_messages")
    .delete()
    .eq("conversation_id", conversation.id)
    .eq("user_id", userId);

  if (deleteMessagesError) {
    throw new Error(deleteMessagesError.message);
  }

  if (conversation.messages.length === 0) return;

  const messageRows = toAIMessageRows(userId, conversation);
  let { error: messageError } = await client
    .from("ai_messages")
    .insert(messageRows);

  if (messageError && isMissingAIMessageUsageColumnErrorMessage(messageError.message)) {
    const fallbackResult = await client
      .from("ai_messages")
      .insert(stripUsageFromAIMessageRows(messageRows));
    messageError = fallbackResult.error;
  }

  if (messageError) {
    throw new Error(messageError.message);
  }
}

export async function deleteAIConversationRemote(conversationId: string) {
  const client = getClient();
  const { error } = await client
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId);

  if (error) throw new Error(error.message);
}

export async function upsertProjectBackupRemote(
  userId: string,
  backup: ProjectBackup
) {
  const client = getClient();

  const projects = [toProjectRow(userId, { ...backup.project, userId })];
  const books = backup.books.map((book) => toBookRow(userId, book));
  const chapters = backup.chapters.map((chapter) => toChapterRow(userId, chapter));
  const snapshots = backup.chapterSnapshots.map((snapshot) =>
    toSnapshotRow(userId, snapshot)
  );
  const drafts = backup.editorialDrafts.map((draft) =>
    toEditorialDraftRow(userId, draft)
  );
  const characters = backup.characters.map((character) =>
    toCharacterRow(userId, character)
  );
  const scenarios = backup.scenarios.map((scenario) =>
    toScenarioRow(userId, scenario)
  );
  const resources = backup.resources.map((resource) =>
    toResourceRow(userId, resource)
  );
  const ideaNotes = backup.ideaNotes.map((ideaNote) =>
    toIdeaNoteRow(userId, ideaNote)
  );
  const mentions = backup.entityMentions.map((mention) =>
    toEntityMentionRow(userId, mention)
  );
  const conversations = backup.aiConversations.map((conversation) =>
    toAIConversationRow(userId, conversation)
  );
  const messages = backup.aiConversations.flatMap((conversation) =>
    toAIMessageRows(userId, conversation)
  );

  const operations = [
    client.from("projects").upsert(projects),
    books.length ? client.from("books").upsert(books) : Promise.resolve({ error: null }),
    chapters.length ? client.from("chapters").upsert(chapters) : Promise.resolve({ error: null }),
    snapshots.length
      ? client.from("chapter_snapshots").upsert(snapshots)
      : Promise.resolve({ error: null }),
    drafts.length
      ? client.from("editorial_drafts").upsert(drafts)
      : Promise.resolve({ error: null }),
    characters.length
      ? client.from("characters").upsert(characters)
      : Promise.resolve({ error: null }),
    scenarios.length
      ? client.from("scenarios").upsert(scenarios)
      : Promise.resolve({ error: null }),
    resources.length
      ? client.from("resources").upsert(resources)
      : Promise.resolve({ error: null }),
    ideaNotes.length
      ? client.from("idea_notes").upsert(ideaNotes)
      : Promise.resolve({ error: null }),
    mentions.length
      ? client.from("entity_mentions").upsert(mentions)
      : Promise.resolve({ error: null }),
    conversations.length
      ? client.from("ai_conversations").upsert(conversations)
      : Promise.resolve({ error: null }),
  ] as const;

  const results = await Promise.all(operations);
  results.forEach((result) => {
    if (result.error) {
      throw new Error(result.error.message);
    }
  });

  if (messages.length > 0) {
    const conversationIds = backup.aiConversations.map((conversation) => conversation.id);
    const { error: deleteMessagesError } = await client
      .from("ai_messages")
      .delete()
      .eq("user_id", userId)
      .in("conversation_id", conversationIds);

    if (deleteMessagesError) {
      throw new Error(deleteMessagesError.message);
    }

    let { error: messageError } = await client.from("ai_messages").insert(messages);
    if (messageError && isMissingAIMessageUsageColumnErrorMessage(messageError.message)) {
      const fallbackResult = await client
        .from("ai_messages")
        .insert(stripUsageFromAIMessageRows(messages));
      messageError = fallbackResult.error;
    }
    if (messageError) {
      throw new Error(messageError.message);
    }
  }
}
