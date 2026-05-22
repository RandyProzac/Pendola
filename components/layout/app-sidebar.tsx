'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  BookOpen,
  FileText,
  Users,
  MapPin,
  Plus,
  Feather,
  Paperclip,
  Compass,
  Sparkles,
  LogOut,
  BookMarked,
  Lightbulb,
} from 'lucide-react'
import { useSupabaseAuth } from '@/components/auth/auth-gate'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { GlobalSettings } from '@/components/settings/global-settings'
import { useProjectStore } from '@/lib/store'
import { makeBookPath, makeEditorialBookPath, makeProjectPath, parseEntityToken } from '@/lib/routing'

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useSupabaseAuth()
  const {
    projects,
    currentProjectId,
    setCurrentProject,
    getBooksByProject,
  } = useProjectStore()

  const currentBooks = currentProjectId ? getBooksByProject(currentProjectId) : []

  const handleNewProject = () => {
    router.push('/proyecto/nuevo')
  }

  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId)
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    router.push(makeProjectPath(project))
  }

  const getWritingHref = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    const books = getBooksByProject(projectId)
    if (!project) return `/proyecto/${projectId}`
    return books[0] ? makeBookPath(project, books[0]) : makeProjectPath(project)
  }

  const getEditorialHref = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    const books = getBooksByProject(projectId)
    if (!project) return `/proyecto/${projectId}`
    return books[0] ? makeEditorialBookPath(project, books[0]) : makeProjectPath(project)
  }

  const currentBookIdFromPath = pathname.includes('/libro/')
    ? parseEntityToken(pathname.split('/libro/')[1]?.split('/')[0] || '')
    : null

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => router.push('/')}
              className="cursor-pointer"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 text-sidebar-primary-foreground">
                <Feather className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-sm">Péndola</span>
                <span className="text-xs text-muted-foreground">Escritura Narrativa</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Projects Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Mis Proyectos</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleNewProject}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleNewProject}
                    className="text-muted-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Crear primer proyecto</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                projects.map((project) => {
                  const projectPath = makeProjectPath(project)

                  return (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton
                        isActive={project.id === currentProjectId}
                        onClick={() => handleSelectProject(project.id)}
                        className="cursor-pointer"
                      >
                        <div
                          className="h-3 w-3 rounded-sm shrink-0"
                          style={{ backgroundColor: project.coverColor }}
                        />
                        <span className="truncate">{project.title}</span>
                      </SidebarMenuButton>

                      {project.id === currentProjectId && (
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={
                                pathname === projectPath ||
                                pathname.startsWith(`${projectPath}/libro/`)
                              }
                              onClick={() => router.push(getWritingHref(project.id))}
                              className="cursor-pointer"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>Escribir</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname.startsWith(`${projectPath}/editorial/`)}
                              onClick={() => router.push(getEditorialHref(project.id))}
                              className="cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Editorial</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={
                                pathname === `${projectPath}/personalizacion` ||
                                pathname === `${projectPath}/ia`
                              }
                              onClick={() => router.push(`${projectPath}/personalizacion`)}
                              className="cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Personalización</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === `${projectPath}/personajes`}
                              onClick={() => router.push(`${projectPath}/personajes`)}
                              className="cursor-pointer"
                            >
                              <Users className="h-3.5 w-3.5" />
                              <span>Personajes</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === `${projectPath}/escenarios`}
                              onClick={() => router.push(`${projectPath}/escenarios`)}
                              className="cursor-pointer"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              <span>Escenarios</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === `${projectPath}/publicacion`}
                              onClick={() => router.push(`${projectPath}/publicacion`)}
                              className="cursor-pointer"
                            >
                              <BookMarked className="h-3.5 w-3.5" />
                              <span>Publicación</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === `${projectPath}/estructura`}
                              onClick={() => router.push(`${projectPath}/estructura`)}
                              className="cursor-pointer"
                            >
                              <Compass className="h-3.5 w-3.5" />
                              <span>Estructura Nar.</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === `${projectPath}/ideas`}
                              onClick={() => router.push(`${projectPath}/ideas`)}
                              className="cursor-pointer"
                            >
                              <Lightbulb className="h-3.5 w-3.5" />
                              <span>Ideas</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === `${projectPath}/recursos`}
                              onClick={() => router.push(`${projectPath}/recursos`)}
                              className="cursor-pointer"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>Recursos</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          {currentBooks.length > 1 &&
                            currentBooks.slice(1).map((book) => (
                              <SidebarMenuSubItem key={book.id}>
                                <SidebarMenuSubButton
                                  isActive={currentBookIdFromPath === book.id}
                                  onClick={() =>
                                    router.push(makeBookPath(project, book))
                                  }
                                  className="cursor-pointer"
                                >
                                  <BookOpen className="h-3.5 w-3.5" />
                                  <span className="truncate">{book.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 pt-2 gap-2">
              <div className="min-w-0 flex-1 px-2">
                <p className="truncate text-xs font-medium">
                  {user?.email || 'Sesión activa'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Sync con Supabase
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between px-2 pb-2 gap-2">
              <GlobalSettings />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
