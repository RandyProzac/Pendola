import { createClient } from "@supabase/supabase-js";
import type { PublicProjectReadModel } from "@/lib/types";

function getPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function mapPublicProjectReadModel(data: unknown): PublicProjectReadModel | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const project = payload.project;
  const books = payload.books;
  const chapters = payload.chapters;

  if (!project || typeof project !== "object") {
    return null;
  }

  return {
    project: {
      id: String((project as Record<string, unknown>).id ?? ""),
      title: String((project as Record<string, unknown>).title ?? ""),
      premise: String((project as Record<string, unknown>).premise ?? ""),
      genre: String((project as Record<string, unknown>).genre ?? ""),
      coverColor: String((project as Record<string, unknown>).coverColor ?? "#534AB7"),
      coverImagePath:
        typeof (project as Record<string, unknown>).coverImagePath === "string"
          ? String((project as Record<string, unknown>).coverImagePath)
          : undefined,
      authorName: String((project as Record<string, unknown>).authorName ?? ""),
      penName: String((project as Record<string, unknown>).penName ?? ""),
      updatedAt: String((project as Record<string, unknown>).updatedAt ?? ""),
    },
    books: Array.isArray(books)
      ? books.map((book) => ({
          id: String((book as Record<string, unknown>).id ?? ""),
          title: String((book as Record<string, unknown>).title ?? ""),
          order: Number((book as Record<string, unknown>).order ?? 0),
        }))
      : [],
    chapters: Array.isArray(chapters)
      ? chapters.map((chapter) => ({
          id: String((chapter as Record<string, unknown>).id ?? ""),
          bookId: String((chapter as Record<string, unknown>).bookId ?? ""),
          title: String((chapter as Record<string, unknown>).title ?? ""),
          order: Number((chapter as Record<string, unknown>).order ?? 0),
          content: String((chapter as Record<string, unknown>).content ?? ""),
          wordCount: Number((chapter as Record<string, unknown>).wordCount ?? 0),
        }))
      : [],
  };
}

export async function fetchPublicProjectReadModel(token: string) {
  const client = getPublicSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.rpc("get_public_project_read_model", {
    share_token: token,
  });

  if (error) {
    console.error("[Pendola][PublicRead]", error.message);
    return null;
  }

  return mapPublicProjectReadModel(data);
}
