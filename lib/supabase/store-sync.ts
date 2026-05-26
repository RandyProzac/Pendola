import {
  deleteAIConversationRemote,
  deleteBookRemote,
  deleteChapterRemote,
  deleteCharacterRemote,
  deleteEditorialDraftRemote,
  deleteEntityMentionsByEntityRemote,
  deleteIdeaNoteRemote,
  deleteProjectRemote,
  deleteProjectShareRemote,
  deleteResourceRemote,
  deleteScenarioRemote,
  replaceEntityMentionsForChapterRemote,
  upsertAIConversationRemote,
  upsertBookRemote,
  upsertChapterRemote,
  upsertChapterSnapshotRemote,
  upsertCharacterRemote,
  upsertEditorialDraftRemote,
  upsertIdeaNoteRemote,
  upsertProjectRemote,
  upsertProjectShareRemote,
  upsertResourceRemote,
  upsertScenarioRemote,
  upsertUserSettingsRemote,
} from "@/lib/supabase/project-repository";
import { getCurrentSupabaseUserId, isRemoteSyncEnabled } from "@/lib/supabase/runtime";
import type {
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
  ProjectShare,
  Resource,
  Scenario,
  WriterPreferences,
} from "@/lib/types";

const scheduledTasks = new Map<string, ReturnType<typeof setTimeout>>();
const scheduledTaskPromises = new Map<string, Promise<void>>();

function canSync() {
  return isRemoteSyncEnabled() && Boolean(getCurrentSupabaseUserId());
}

function runSafely(task: () => Promise<void>) {
  void task().catch((error) => {
    console.error("[Pendola][Supabase sync]", error);
  });
}

function scheduleTask(
  key: string,
  task: () => Promise<void>,
  delay = 400,
  dependencyKeys: string[] = []
) {
  if (!canSync()) return;

  const current = scheduledTasks.get(key);
  if (current) {
    clearTimeout(current);
  }

  let resolveTaskPromise: (() => void) | null = null;
  const taskPromise = new Promise<void>((resolve) => {
    resolveTaskPromise = resolve;
  });
  scheduledTaskPromises.set(key, taskPromise);

  scheduledTasks.set(
    key,
    setTimeout(() => {
      scheduledTasks.delete(key);
      runSafely(async () => {
        try {
          const dependencyPromises = dependencyKeys
            .map((dependencyKey) => scheduledTaskPromises.get(dependencyKey))
            .filter((promise): promise is Promise<void> => Boolean(promise));

          await Promise.all(dependencyPromises);
          await task();
        } finally {
          scheduledTaskPromises.delete(key);
          resolveTaskPromise?.();
        }
      });
    }, delay)
  );
}

function runNow(task: () => Promise<void>) {
  if (!canSync()) return;
  runSafely(task);
}

export function syncProjectRemote(project: Project, delay = 400) {
  scheduleTask(`project:${project.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertProjectRemote(userId, project);
  }, delay);
}

export function syncProjectDeletionRemote(projectId: string) {
  runNow(() => deleteProjectRemote(projectId));
}

export function syncProjectShareRemote(share: ProjectShare, delay = 150) {
  scheduleTask(`project-share:${share.projectId}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertProjectShareRemote(userId, share);
  }, delay, [`project:${share.projectId}`]);
}

export function syncProjectShareDeletionRemote(shareId: string) {
  runNow(() => deleteProjectShareRemote(shareId));
}

export function syncBookRemote(book: Book, delay = 400) {
  scheduleTask(`book:${book.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertBookRemote(userId, book);
  }, delay, [`project:${book.projectId}`]);
}

export function syncBookDeletionRemote(bookId: string) {
  runNow(() => deleteBookRemote(bookId));
}

export function syncChapterRemote(chapter: Chapter, delay = 600) {
  scheduleTask(`chapter:${chapter.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertChapterRemote(userId, chapter);
  }, delay, [`project:${chapter.projectId}`, `book:${chapter.bookId}`]);
}

export function syncChapterDeletionRemote(chapterId: string) {
  runNow(() => deleteChapterRemote(chapterId));
}

export function syncChapterSnapshotRemote(snapshot: ChapterSnapshot) {
  scheduleTask(`chapter-snapshot:${snapshot.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertChapterSnapshotRemote(userId, snapshot);
  }, 100, [
    `project:${snapshot.projectId}`,
    `book:${snapshot.bookId}`,
    `chapter:${snapshot.chapterId}`,
    ...(snapshot.editorialDraftId ? [`editorial-draft:${snapshot.editorialDraftId}`] : []),
  ]);
}

export function syncEditorialDraftRemote(draft: EditorialDraft, delay = 600) {
  scheduleTask(`editorial-draft:${draft.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertEditorialDraftRemote(userId, draft);
  }, delay, [
    `project:${draft.projectId}`,
    `book:${draft.bookId}`,
    `chapter:${draft.chapterId}`,
  ]);
}

export function syncEditorialDraftDeletionRemote(draftId: string) {
  runNow(() => deleteEditorialDraftRemote(draftId));
}

export function syncCharacterRemote(character: Character, delay = 300) {
  scheduleTask(`character:${character.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertCharacterRemote(userId, character);
  }, delay, [`project:${character.projectId}`]);
}

export function syncCharacterDeletionRemote(characterId: string) {
  runNow(() => deleteCharacterRemote(characterId));
}

export function syncScenarioRemote(scenario: Scenario, delay = 300) {
  scheduleTask(`scenario:${scenario.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertScenarioRemote(userId, scenario);
  }, delay, [`project:${scenario.projectId}`]);
}

export function syncScenarioDeletionRemote(scenarioId: string) {
  runNow(() => deleteScenarioRemote(scenarioId));
}

export function syncResourceRemote(resource: Resource, delay = 300) {
  scheduleTask(`resource:${resource.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertResourceRemote(userId, resource);
  }, delay, [`project:${resource.projectId}`]);
}

export function syncResourceDeletionRemote(resourceId: string) {
  runNow(() => deleteResourceRemote(resourceId));
}

export function syncIdeaNoteRemote(ideaNote: IdeaNote, delay = 300) {
  scheduleTask(`idea-note:${ideaNote.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertIdeaNoteRemote(userId, ideaNote);
  }, delay, [`project:${ideaNote.projectId}`]);
}

export function syncIdeaNoteDeletionRemote(ideaNoteId: string) {
  runNow(() => deleteIdeaNoteRemote(ideaNoteId));
}

export function syncEntityMentionsForChapterRemote(
  chapterId: string,
  mentions: EntityMention[]
) {
  const dependencyKeys = mentions[0]
    ? [
        `project:${mentions[0].projectId}`,
        ...(mentions[0].bookId ? [`book:${mentions[0].bookId}`] : []),
        `chapter:${chapterId}`,
      ]
    : [`chapter:${chapterId}`];

  scheduleTask(`entity-mentions:${chapterId}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await replaceEntityMentionsForChapterRemote(userId, chapterId, mentions);
  }, 150, dependencyKeys);
}

export function syncEntityMentionDeletionByEntityRemote(
  entityType: EntityMention["entityType"],
  entityId: string
) {
  runNow(async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await deleteEntityMentionsByEntityRemote(userId, entityType, entityId);
  });
}

export function syncAIConversationRemote(
  conversation: AIConversation,
  delay = 250
) {
  scheduleTask(`ai-conversation:${conversation.id}`, async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertAIConversationRemote(userId, {
      ...conversation,
      isGenerating: false,
    });
  }, delay, [
    `project:${conversation.projectId}`,
    ...(conversation.chapterId ? [`chapter:${conversation.chapterId}`] : []),
  ]);
}

export function syncAIConversationDeletionRemote(conversationId: string) {
  runNow(() => deleteAIConversationRemote(conversationId));
}

export function syncUserSettingsRemote(input: {
  aiSettings: AISettings;
  writerPreferences: WriterPreferences;
}, delay = 250) {
  scheduleTask("user-settings", async () => {
    const userId = getCurrentSupabaseUserId();
    if (!userId) return;
    await upsertUserSettingsRemote(userId, input);
  }, delay);
}
