"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { Feather, Loader2, LogIn, Mail, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchRemoteWorkspaceState,
  type RemoteWorkspaceState,
  SupabaseSetupError,
  upsertProjectBackupRemote,
} from "@/lib/supabase/project-repository";
import {
  setCurrentSupabaseUserId,
  setRemoteSyncEnabled,
} from "@/lib/supabase/runtime";
import { useProjectStore } from "@/lib/store";
import type { ProjectBackup } from "@/lib/types";

interface SupabaseAuthContextValue {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

function getReadableAuthErrorMessage(error: unknown) {
  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
    return "No se pudo conectar con Supabase. Revisa tu internet, bloqueadores de contenido, VPN/firewall o la configuración del proyecto."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "No se pudo enviar el magic link."
}

function buildBackupFromState(
  state: ReturnType<typeof useProjectStore.getState>,
  projectId: string
): ProjectBackup | null {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return null;

  const books = state.books.filter((item) => item.projectId === projectId);
  const chapters = state.chapters.filter((item) => item.projectId === projectId);
  const chapterIds = new Set(chapters.map((item) => item.id));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    books,
    chapters,
    chapterSnapshots: state.chapterSnapshots.filter((snapshot) =>
      chapterIds.has(snapshot.chapterId)
    ),
    editorialDrafts: state.editorialDrafts.filter((draft) =>
      chapterIds.has(draft.chapterId)
    ),
    characters: state.characters.filter((item) => item.projectId === projectId),
    scenarios: state.scenarios.filter((item) => item.projectId === projectId),
    resources: state.resources.filter((item) => item.projectId === projectId),
    ideaNotes: state.ideaNotes.filter((item) => item.projectId === projectId),
    entityMentions: state.entityMentions.filter((item) =>
      chapterIds.has(item.chapterId)
    ),
    aiConversations: state.aiConversations.filter(
      (item) => item.projectId === projectId && (!item.chapterId || chapterIds.has(item.chapterId))
    ),
  };
}

function applyRemoteState(remoteState: RemoteWorkspaceState) {
  useProjectStore.setState((state) => {
    const nextCurrentProjectId =
      state.currentProjectId &&
      remoteState.projects.some((project) => project.id === state.currentProjectId)
        ? state.currentProjectId
        : remoteState.projects[0]?.id ?? null;

    return {
      ...state,
      projects: remoteState.projects,
      projectShares: remoteState.projectShares,
      books: remoteState.books,
      chapters: remoteState.chapters,
      chapterSnapshots: remoteState.chapterSnapshots,
      editorialDrafts: remoteState.editorialDrafts,
      characters: remoteState.characters,
      scenarios: remoteState.scenarios,
      resources: remoteState.resources,
      ideaNotes: remoteState.ideaNotes,
      entityMentions: remoteState.entityMentions,
      aiConversations: remoteState.aiConversations,
      aiResponseCache: [],
      aiSettings: remoteState.aiSettings ?? state.aiSettings,
      writerPreferences: remoteState.writerPreferences ?? state.writerPreferences,
      currentProjectId: nextCurrentProjectId,
    };
  });
}

function buildImportableBackups(
  backups: ProjectBackup[],
  userId: string,
  remoteState: RemoteWorkspaceState
) {
  const remoteProjectIds = new Set(remoteState.projects.map((project) => project.id));

  return backups.filter((backup) => {
    if (backup.project.userId === userId && remoteProjectIds.has(backup.project.id)) {
      return false;
    }

    return !remoteProjectIds.has(backup.project.id) || backup.project.userId === "local-user";
  });
}

function AuthScreen({
  onSubmit,
  isSubmitting,
  authError,
}: {
  onSubmit: (email: string) => Promise<void>;
  isSubmitting: boolean;
  authError: string | null;
}) {
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.16),transparent_34%)] px-6">
      <div className="w-full max-w-md rounded-3xl border bg-background/90 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
            <Feather className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Entrar a Péndola</h1>
            <p className="text-sm text-muted-foreground">
              Inicia sesión con magic link para sincronizar tus proyectos.
            </p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(email);
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="pendola-email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pendola-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          {authError ? (
            <p className="text-sm text-destructive">{authError}</p>
          ) : (
            <p className="text-xs leading-6 text-muted-foreground">
              Te enviaremos un enlace seguro para entrar desde este navegador.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Enviar magic link
          </Button>
        </form>
      </div>
    </div>
  );
}

function CloudSetupScreen({
  email,
  message,
  onSignOut,
}: {
  email?: string;
  message: string;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_34%)] px-6">
      <div className="w-full max-w-2xl rounded-3xl border bg-background/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Supabase necesita setup</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              La autenticación ya funciona, pero Péndola todavía no encuentra sus tablas cloud.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-4">
          <p className="text-sm">{message}</p>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Aplica en tu proyecto Supabase las migraciones SQL de
            {" "}
            <code>supabase/migrations/</code>
            {" "}
            y luego recarga esta página.
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Usuario actual: {email || "sesión autenticada"}.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
          <Button variant="outline" onClick={() => void onSignOut()}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const client = getSupabaseBrowserClient();
  const localBackupsRef = useRef<ProjectBackup[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [importableBackups, setImportableBackups] = useState<ProjectBackup[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [cloudSetupError, setCloudSetupError] = useState<string | null>(null);

  if (localBackupsRef.current.length === 0) {
    const state = useProjectStore.getState();
    localBackupsRef.current = state.projects
      .map((project) => buildBackupFromState(state, project.id))
      .filter((backup): backup is ProjectBackup => Boolean(backup));
  }

  const refreshWorkspace = useCallback(
    async (userId: string) => {
      setIsWorkspaceLoading(true);
      setRemoteSyncEnabled(false);
      setCloudSetupError(null);

      try {
        const remoteState = await fetchRemoteWorkspaceState(userId);
        applyRemoteState(remoteState);

        const nextImportable = buildImportableBackups(
          localBackupsRef.current,
          userId,
          remoteState
        );
        setImportableBackups(nextImportable);
        setIsImportDialogOpen(nextImportable.length > 0);
        setRemoteSyncEnabled(true);
      } catch (error) {
        if (error instanceof SupabaseSetupError) {
          setCloudSetupError(error.message);
          return;
        }

        throw error;
      } finally {
        setIsWorkspaceLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!client) {
      setAuthError("Falta configurar Supabase para iniciar sesión.");
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (error) {
          setAuthError(error.message);
        }

        setSession(data.session);
        setIsAuthLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        setAuthError(error instanceof Error ? error.message : "No se pudo abrir la sesión.");
        setIsAuthLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    setCurrentSupabaseUserId(userId);

    if (!userId) {
      setRemoteSyncEnabled(false);
      setCloudSetupError(null);
      return;
    }

    void refreshWorkspace(userId).catch((error) => {
      setAuthError(
        error instanceof Error
          ? error.message
          : "No se pudo sincronizar el workspace con Supabase."
      );
    });
  }, [refreshWorkspace, session?.user?.id]);

  const handleSendMagicLink = useCallback(
    async (email: string) => {
      if (!client) {
        setAuthError("Supabase no está disponible en este entorno.");
        return;
      }

      setIsSubmittingEmail(true);
      setAuthError(null);

      try {
        const { error } = await client.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          throw error;
        }

        toast.success("Revisa tu correo", {
          description: "Te enviamos un magic link para entrar a Péndola.",
        });
      } catch (error) {
        console.error("[Pendola][Auth] No se pudo enviar magic link", error);
        setAuthError(getReadableAuthErrorMessage(error));
      } finally {
        setIsSubmittingEmail(false);
      }
    },
    [client]
  );

  const handleImportLocalProjects = useCallback(async () => {
    if (!session?.user) return;

    setIsImporting(true);

    try {
      for (const backup of importableBackups) {
        await upsertProjectBackupRemote(session.user.id, backup);
      }

      toast.success("Proyectos importados", {
        description: "Tus datos locales ya quedaron respaldados en Supabase.",
      });

      localBackupsRef.current = [];
      setImportableBackups([]);
      setIsImportDialogOpen(false);
      await refreshWorkspace(session.user.id);
    } catch (error) {
      toast.error("No se pudo importar a la nube", {
        description:
          error instanceof Error ? error.message : "La migración a Supabase falló.",
      });
    } finally {
      setIsImporting(false);
    }
  }, [importableBackups, refreshWorkspace, session?.user]);

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
    toast.success("Sesión cerrada");
  }, [client]);

  const contextValue = useMemo<SupabaseAuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      signOut,
    }),
    [session, signOut]
  );

  if (isAuthLoading || isWorkspaceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border bg-background px-5 py-4 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          <p className="text-sm text-muted-foreground">
            {isAuthLoading ? "Abriendo sesión..." : "Sincronizando proyectos..."}
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        onSubmit={handleSendMagicLink}
        isSubmitting={isSubmittingEmail}
        authError={authError}
      />
    );
  }

  if (cloudSetupError) {
    return (
      <CloudSetupScreen
        email={session.user.email}
        message={cloudSetupError}
        onSignOut={signOut}
      />
    );
  }

  return (
    <SupabaseAuthContext.Provider value={contextValue}>
      {children}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" />
              Importar proyectos locales
            </DialogTitle>
            <DialogDescription>
              Encontramos proyectos guardados solo en este navegador. Puedes
              migrarlos a Supabase para que aparezcan en cualquier dispositivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {importableBackups.map((backup) => (
              <div
                key={backup.project.id}
                className="rounded-2xl border bg-muted/30 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{backup.project.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {backup.chapters.length} capítulos · {backup.aiConversations.length} conversaciones IA
                    </p>
                  </div>
                  <Badge variant="outline">Local</Badge>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={isImporting}
            >
              Ahora no
            </Button>
            <Button onClick={() => void handleImportLocalProjects()} disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              Importar a la nube
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth debe usarse dentro de AuthGate.");
  }
  return context;
}
