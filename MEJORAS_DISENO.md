# Péndola — Crítica y mejoras de diseño

> Documento de análisis. No se ha modificado ningún archivo del proyecto.
> Fecha: 2026-05-07
> Alcance: crítica basada en el código (JSX, Tailwind, configuración shadcn, layout). Sin acceso a renders reales aún — recomendaciones marcadas con 👁️ requieren validación visual con screenshots o `npm run dev`.

---

## 0. Cómo leer este documento

Cada hallazgo tiene tres etiquetas:

- **Severidad**: 🔴 Crítico (rompe la experiencia) · 🟡 Moderado (degrada la experiencia) · 🟢 Menor (pulido)
- **Esfuerzo**: XS (minutos) · S (horas) · M (medio día) · L (1-3 días) · XL (semana+)
- **Riesgo**: bajo / medio / alto — probabilidad de romper algo o introducir deuda

Y al final hay un **plan de implementación en 4 sprints de diseño** y una **matriz de priorización**.

---

## 1. Impresión general

Péndola es una app de escritura que **no se ve como una app de escritura**. Visualmente parece una herramienta SaaS genérica con gradientes violet/indigo de plantilla, no una herramienta literaria. La mayor oportunidad es alinear identidad visual con la promesa del producto: **gravedad, tipografía editorial, calma**. Hoy hay demasiada "energía de marketing" (gradientes, badges, sparkles) compitiendo con la introspección que necesita un escritor.

El diseño actual no es malo — es **anónimo**. Funciona, pero podría ser cualquier app de productividad. La meta debería ser que un escritor abra Péndola y sienta que entró a un estudio de escritura, no a un dashboard.

---

## 2. Tipografía (el problema más importante)

### 2.1 El editor usa Inter para escribir prosa
**Severidad:** 🔴 Crítico · **Esfuerzo:** XS · **Riesgo:** bajo

`app/layout.tsx` carga **solo Inter** como `--font-sans` para toda la app:

```tsx
const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
```

Inter es excelente para UI pero está diseñada para tamaños 12-16px en componentes. Para escribir prosa de 5.000-100.000 palabras es inapropiado: trazos uniformes, eje vertical comprimido, ascenders cortos. Para lectura larga necesitas una serif con eje vertical, contraste alto entre trazos, ascenders y descenders generosos.

**Candidatos de serif para el editor:**
- **Source Serif 4** (Adobe, gratis en Google Fonts) — neutra, contemporánea, excelente para pantallas
- **Literata** (Google, diseñada con Type Network para lectura larga en e-readers) — la más recomendable para Péndola
- **Lora** (Google) — humanista cálida, popular en blogs literarios
- **Crimson Pro** (Google) — clásica, tipo libro impreso
- **EB Garamond** (Google) — más formal, ideal para vista "modo libro" de exportación

**Propuesta:** cargar dos fuentes, asignar variables CSS distintas y aplicar la serif solo al ProseMirror del editor TipTap.

```tsx
const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const literata = Literata({ variable: "--font-serif", subsets: ["latin"] });

<html className={`${inter.variable} ${literata.variable} ...`}>
```

```css
/* en globals.css */
.ProseMirror {
  font-family: var(--font-serif);
  font-size: 18px;
  line-height: 1.7;
  letter-spacing: -0.003em;
}
```

Cambio de ~20 líneas, riesgo cero, transformación radical de la sensación del producto.

### 2.2 Ausencia de selector de tipografía por usuario
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

Algunos escritores son muy quisquillosos con esto. Un selector en ajustes del editor con 4-6 opciones curadas cubre la mayoría de preferencias:

- Serif clásica (Literata) — default
- Serif humanista (Lora)
- Serif moderna (Source Serif 4)
- Sans serif de lectura (Inter, para quien la prefiera)
- Monospace tipo máquina de escribir (JetBrains Mono, iA Writer Mono)
- Dyslexia-friendly (OpenDyslexic, Atkinson Hyperlegible)

Persistencia en Zustand (`writerPreferences.editorFont`) y aplicación vía CSS variable.

### 2.3 Controles tipográficos del editor
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

Estándar en Scrivener, Ulysses, iA Writer:

- tamaño de fuente (14-22px en steps)
- interlineado (1.4 / 1.6 / 1.8 / 2.0)
- ancho de columna (60ch / 70ch / 80ch / completo)
- alineación (izquierda vs justificado con hyphenation)

Todo guardado por usuario, no por proyecto.

### 2.4 Sizes minúsculos en UI
**Severidad:** 🟡 Moderado · **Esfuerzo:** XS · **Riesgo:** bajo

`text-[10px]` aparece varias veces en `app/page.tsx`:
- labels del stats grid ("Libros", "Capítulos", "Personajes", "Palabras")
- meta row con fecha y género
- texto del badge de estado

10px es demasiado pequeño para texto secundario. WCAG no lo prohíbe pero degrada accesibilidad y se lee mal en pantallas de alta densidad.

**Propuesta:** subir todos los `text-[10px]` a `text-xs` (12px).

### 2.5 Tipografía para vista "modo libro"
**Severidad:** 🟢 Menor · **Esfuerzo:** M · **Riesgo:** bajo

Cuando exportas o previsualizas como libro, la tipografía debería cambiar a una serif de impresión (Garamond, Caslon, Sabon-like) con interlineado de novela publicada (1.5x), márgenes amplios y sangría de párrafo. Es una sensación muy distinta a editar y refuerza la metáfora del producto.

---

## 3. Sistema de color

### 3.1 Mezcla de paletas sin sistema
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

En el dashboard conviven:
- Hero CTA: `from-violet-600 to-indigo-700` (gradient)
- Empty state icon: `from-violet-600/20 to-indigo-700/20` con sparkle `from-amber-400 to-orange-500`
- Feature cards: `violet-500/10`, `amber-500/10`, `emerald-500/10` (cada una distinta)
- Status badges: variantes de shadcn (`default`, `secondary`, `outline`, `destructive`)

Resultado: **5+ familias de color en una sola pantalla** sin un criterio claro.

**Propuesta de sistema de color:**

```
Marca primaria       → violet-600 (con gradient a indigo-700 para hero/loading)
Marca acento         → amber-400 (solo para destacar IA / Sparkles)
Color semántico      → success (emerald-500), warning (amber-500), error (red-500), info (sky-500)
Neutrales            → shadcn neutral (ya configurado en components.json)
```

Quitar amber y emerald del empty state — usar violet con distinta opacidad para las 3 feature cards. Reservar amber **solo** para acciones de IA (consistente con que `Sparkles` es el ícono de IA).

### 3.2 Gradientes huérfanos
**Severidad:** 🟢 Menor · **Esfuerzo:** S · **Riesgo:** bajo

Solo el CTA principal y el ícono del empty state usan gradientes. Aparecen 2 veces en toda la app (según lo examinado en `app/page.tsx`), lo que los hace especiales pero también un poco huérfanos.

**Dos caminos válidos:**
1. Comprometerse con gradiente como elemento de marca recurrente: usarlo en headers de proyecto, en estados activos del sidebar, en cabecera del panel de IA, en badges de IA generando.
2. Quitarlos y vivir con color sólido. Los gradientes como elemento de marca tienen costo (saturan, se ven fechados rápido).

Tener 2 gradientes "sueltos" es lo peor de ambos mundos.

### 3.3 Status del proyecto: variantes confusas
**Severidad:** 🟡 Moderado · **Esfuerzo:** XS · **Riesgo:** bajo

En `app/page.tsx`:

```tsx
const STATUS_LABELS = {
  planificando: { label: "Planificando", variant: "outline" },
  escribiendo:  { label: "Escribiendo",  variant: "default" },
  revisando:    { label: "Revisando",    variant: "secondary" },
  completado:   { label: "Completado",   variant: "default" }, // ⚠️ mismo que escribiendo
};
```

`escribiendo` y `completado` comparten variante. Visualmente son indistinguibles pero son estados muy distintos del flujo de trabajo.

**Propuesta:** asignar variantes propias con color semántico:
- planificando → outline (gris)
- escribiendo → info (azul)
- revisando → warning (ámbar)
- completado → success (verde)

### 3.4 Modo oscuro: validar saturación de gradientes 👁️
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** medio

`next-themes` está integrado y `suppressHydrationWarning` también. Pero los gradientes violet/indigo pueden saturar en dark mode (los colores 600-700 sobre fondo oscuro vibran demasiado). Validar con eyedropper. Si saturan, usar variantes desaturadas en dark con `dark:from-violet-500 dark:to-indigo-600`.

---

## 4. Jerarquía visual

### 4.1 Las cards de proyecto: el badge gana al título
**Severidad:** 🔴 Crítico · **Esfuerzo:** S · **Riesgo:** bajo

Lo que captura el ojo primero en una card es el **badge de estado**, no el título. El título debería ganar siempre.

**Por qué pasa:**
- El badge es colorido (violet/azul) contra texto neutro
- Está en zona de alto peso visual (esquina superior derecha)
- El título usa `text-base` (16px) y se trunca con `truncate`

**Propuesta:**
- Subir el título a `text-lg font-semibold` o `text-base font-bold`
- Mover el badge a la zona inferior, junto a "fecha · género", como meta
- O reducir intensidad del badge (variant outline siempre, color solo en el borde)

### 4.2 Stats grid centrado rompe el reading flow
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

Reading flow actual de la card:
1. color band (top)
2. título (left)
3. premisa (left)
4. badge (right)
5. **stats grid (center)** ← rompe
6. progreso (full width)
7. meta (left)

El centrado del stats grid hace que el ojo zigzaguee. Debería ser todo flush-left.

### 4.3 Métrica primaria no destacada
**Severidad:** 🟡 Moderado · **Esfuerzo:** XS · **Riesgo:** bajo

Los 4 stats (Libros / Capítulos / Personajes / Palabras) tienen el mismo peso (`text-lg font-bold`). En una herramienta de escritura, **palabras** debería ser el número primario.

**Propuesta:**
- Palabras: `text-2xl font-bold` con label arriba ("Palabras escritas")
- Libros / Capítulos / Personajes: `text-sm` en una línea de meta abajo, separadas por bullets

```
12.345 palabras
3 libros · 24 capítulos · 8 personajes
```

### 4.4 Color band de 2px no registra
**Severidad:** 🟢 Menor · **Esfuerzo:** XS · **Riesgo:** bajo

El `coverColor` se renderiza como un `<div className="h-2 rounded-t-xl">`. 2px (h-2 = 8px en realidad pero igual delgado) no es suficiente para registrar visualmente como elemento de identificación.

**Tres opciones:**
1. Subir a 6-8px (`h-1.5` o `h-2`) — mínimo
2. Convertir en un cover real de 60-80px con la inicial del proyecto sobre el color (más memorable)
3. Usar el color como background sutil de toda la card (`bg-violet-500/5`) y mostrar la inicial grande arriba

La opción 2 es la más diferenciada y la que crearía identidad visual real por proyecto.

### 4.5 Empty state: dos CTAs compitiendo
**Severidad:** 🟡 Moderado · **Esfuerzo:** XS · **Riesgo:** bajo

"Crear mi primer proyecto" y "Cargar proyecto demo" tienen ambos `size="lg"`, apilados, similar peso visual. El gradient ayuda al primario pero el secundario sigue siendo ruidoso.

**Propuesta:**
- Primario: queda como está (CTA gradient)
- Secundario: convertirlo en link discreto bajo el primario: "¿No sabes por dónde empezar? **Carga el proyecto demo** →"

### 4.6 Sparkle dorado del empty state es ruido
**Severidad:** 🟢 Menor · **Esfuerzo:** XS · **Riesgo:** bajo

El círculo gradient con la pluma (`Feather`) tiene un sparkle dorado en la esquina superior derecha (`from-amber-400 to-orange-500`). No aporta significado y compite con el ícono principal.

Quitarlo. La pluma sola es más clara y elegante.

### 4.7 Header del dashboard cargado
**Severidad:** 🟡 Moderado · **Esfuerzo:** XS · **Riesgo:** bajo

El header tiene 5 elementos en 56px de alto:
- `SidebarTrigger`
- `<h1>Mis Proyectos</h1>`
- Botón "Proyecto Demo"
- Botón "Nuevo Proyecto"
- `ThemeToggle`

**Propuesta:** mover "Proyecto Demo" a un menú "Más" (icon-only `MoreHorizontal`) o mostrarlo solo en empty state. Dejar el header con: navegación + título + CTA primario + ThemeToggle.

---

## 5. Componentes y patrones

### 5.1 Cards clickables sin semántica accesible
**Severidad:** 🔴 Crítico · **Esfuerzo:** S · **Riesgo:** bajo

Las cards de proyecto son `<Card>` con `onClick`. Esto rompe:
- navegación por teclado (no se puede tabular a la card)
- Enter para abrir
- Ctrl+Click para abrir en pestaña nueva
- screen readers (no anuncia la card como elemento interactivo)
- foco visible

**Propuesta:** envolver con `<a href={projectPath}>` y prevenir el comportamiento del dropdown con `event.preventDefault()` cuando sea necesario.

```tsx
<Link
  href={makeProjectPath(project)}
  className="group block ..."
  onClick={() => useProjectStore.getState().setCurrentProject(project.id)}
>
  <Card>...</Card>
</Link>
```

Beneficio extra: el navegador maneja el hover/focus por ti, sin necesidad de `cursor-pointer`.

### 5.2 Dropdown anidado en card clickable
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

Hoy se maneja con `event.stopPropagation()` en cada item del dropdown. Funciona, pero el usuario no tiene feedback de qué zona es clickable de la card vs cuál abre el menú.

**Propuesta:**
- Mostrar el `MoreHorizontal` solo en hover (`opacity-0 group-hover:opacity-100`)
- Hover state distinto en su área (background sutil)
- En mobile, mostrarlo siempre porque no hay hover

### 5.3 Dashed card "Nuevo Proyecto" duplicada
**Severidad:** 🟢 Menor · **Esfuerzo:** XS · **Riesgo:** bajo

"Nuevo Proyecto" aparece como botón en el header **y** como card punteada al final del grid. Dos entradas para la misma acción.

Es aceptable como atajo (Notion, Linear lo hacen así) pero conviene unificar el estilo: si se queda, debería usar el mismo color y radius que las cards normales en hover, no parecer un placeholder.

### 5.4 Densidad de información en card
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

Las cards exponen 7+ piezas de información (color band, título, premisa, badge, dropdown, 4 stats, progreso, fecha, género) en ~200px de alto.

**Propuesta:** reducir a:
- Título (grande)
- Premisa (2 líneas máx)
- Métrica primaria: palabras
- Progreso (barra fina)
- Meta line: 3 libros · 24 capítulos · actualizado hace 2 días

Mover el resto al detalle del proyecto. Las cards del dashboard son **identificación rápida**, no resumen ejecutivo.

### 5.5 Sidebar de 723 líneas 👁️
**Severidad:** 🟢 Menor · **Esfuerzo:** — · **Riesgo:** —

`components/ui/sidebar.tsx` tiene 723 líneas. Es el componente shadcn estándar pero es muy denso. No es un bug de diseño per se, pero cualquier customización futura va a requerir entender bien ese archivo. Vale la pena documentar qué partes están en uso y cuáles no.

---

## 6. Accesibilidad

### 6.1 Cards no accesibles por teclado
**Severidad:** 🔴 Crítico · **Esfuerzo:** S · **Riesgo:** bajo

Ya cubierto en 5.1. Es el peor problema de accesibilidad del dashboard.

### 6.2 Touch targets pequeños en mobile
**Severidad:** 🟡 Moderado · **Esfuerzo:** XS · **Riesgo:** bajo

El dropdown trigger es un botón con `p-1` rodeando un ícono `h-4 w-4` → ~24×24px. WCAG 2.1 AA recomienda 44×44px en touch. En desktop pasa, en mobile falla.

**Propuesta:** subir a `p-2` mínimo, idealmente `h-9 w-9` para asegurar 36-44px.

### 6.3 Foco visible 👁️
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

shadcn trae focus rings por defecto pero las cards con `cursor-pointer` y `onClick` puede que se hayan pisado. Auditar con tab-through completo del dashboard y la app.

### 6.4 Contraste a verificar 👁️
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** medio

Validar con eyedropper:
- Texto blanco sobre `violet-600` en CTA gradient (probablemente AA en violet-600 ~4.8:1, mejor en indigo-700)
- Texto del badge "Escribiendo" (variant default)
- Labels `text-muted-foreground` en cards
- Texto del placeholder del editor TipTap

### 6.5 Lang declarado correctamente
**Severidad:** ✅ — · **Esfuerzo:** — · **Riesgo:** —

`<html lang="es">` está bien.

### 6.6 Dictado y lectura por voz
**Severidad:** 🟢 Menor · **Esfuerzo:** M · **Riesgo:** medio

Web Speech API para dictado (entrada) y para que la IA lea respuestas en voz alta. Útil para escritores que prefieren oír su prosa o tienen limitaciones visuales. No es A11y mínima, pero amplifica accesibilidad.

---

## 7. Identidad de marca

### 7.1 Iconografía sin sistema
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

Hoy se usan: `Feather`, `BookOpen`, `Sparkles`, `Plus`, `Clock`, `Copy`, `MoreHorizontal`, `Trash2`. Todos de `lucide-react` (bien, consistencia base).

Pero no hay un mapa semántico:
- Pluma = ¿escribir? ¿la app en sí?
- BookOpen = ¿libros? ¿planificar?
- Sparkles = ¿IA? ¿algo nuevo? ¿demo?

**Propuesta de mapa de iconografía:**
- `Feather` → identidad de marca, header global, never reused
- `BookOpen` → libros / proyectos
- `FileText` → capítulos
- `User` o `Users` → personajes
- `Map` o `MapPin` → escenarios
- `Sparkles` → IA, exclusivo
- `FolderOpen` → recursos
- `Network` → estructura narrativa

Documentarlo en `MEJORAS_DISENO.md` o un archivo `docs/iconography.md`.

### 7.2 Falta una identidad literaria visible
**Severidad:** 🟡 Moderado · **Esfuerzo:** M · **Riesgo:** bajo

La pluma del logo es buena. Pero después de la primera pantalla, la app se "olvida" de que es una herramienta literaria. No hay:
- texturas o detalles que evoquen papel, tinta, libro
- citas de autores, frases de inspiración (con permiso, claro)
- cabeceras tipográficas con drop caps en el editor
- transición sutil al modo lectura

No hace falta llenarse de skeumorfismo (Scrivener cae en eso). Pero **un detalle por sección** que recuerde la naturaleza del producto es suficiente. Por ejemplo:
- en el editor, una cita pequeña al lado del título del capítulo
- en el dashboard vacío, un fragmento de la historia de Péndola (origen del nombre)
- en cada proyecto, una "portada" visual generada con el coverColor + título en serif grande

### 7.3 Voz visual demasiado neutra
**Severidad:** 🟢 Menor · **Esfuerzo:** M · **Riesgo:** medio

shadcn `base-nova` es bueno pero da una identidad anónima. Personalizar:
- Border radius distinto (más cuadrado, más editorial)
- Sombra más suave (papel, no cristal)
- Botones con peso menor (font-medium en vez de font-semibold)
- Animaciones más lentas (200ms → 300ms en hover, da sensación de "calma")

---

## 8. Spacing y consistencia

### 8.1 Mezcla de valores de spacing
**Severidad:** 🟡 Moderado · **Esfuerzo:** S · **Riesgo:** bajo

En `app/page.tsx`:
- header: `gap-4 px-6`
- empty state: `mt-12`, `gap-4`
- card grid: `gap-5`
- card stats: `gap-2`
- card progress: `space-y-1`

Valores 1, 2, 4, 5, 6, 12 sin un step claro. Tailwind permite cualquier valor pero un sistema saludable usa una escala restringida.

**Propuesta de escala:**
```
1  (4px)   → entre elementos atómicos (label/input)
2  (8px)   → spacing interno de componentes pequeños
4  (16px)  → spacing entre componentes en una card
6  (24px)  → padding de cards y secciones
8  (32px)  → entre secciones
12 (48px)  → entre bloques mayores
16 (64px)  → top de página, hero spacing
```

Usar **solo estos valores**. Si necesitas 5 (20px), redondea a 4 o 6.

### 8.2 Border radius inconsistente
**Severidad:** 🟢 Menor · **Esfuerzo:** XS · **Riesgo:** bajo

En el código actual: `rounded-t-xl`, `rounded-lg`, `rounded-full`, `rounded-md` mezclados.

**Propuesta:**
- `rounded-sm` (2px) → inputs, badges
- `rounded-md` (6px) → buttons, dropdown items
- `rounded-lg` (8px) → cards
- `rounded-xl` (12px) → modales, sheets
- `rounded-full` → solo avatares y elementos circulares

Documentar en globals.css como tokens.

### 8.3 Shadow inconsistente
**Severidad:** 🟢 Menor · **Esfuerzo:** XS · **Riesgo:** bajo

`hover:shadow-lg hover:shadow-black/10` en cards. Definir 3 niveles de shadow consistentes (sm/md/lg) y usarlos siempre. shadcn ya provee tokens, usar esos.

---

## 9. Lo que funciona bien (no lo rompas)

- **Estructura de información clara**: dashboard → proyecto → libro → capítulo se refleja en URL y mental model.
- **Empty state generoso**: muchas apps tiran al usuario a una pantalla vacía. Aquí hay onboarding visual + opción de demo.
- **Proyecto demo como atajo**: decisión de producto inteligente.
- **Color band por proyecto**: buena idea de identidad rápida (mal ejecutada en altura, bien en concepto).
- **shadcn `base-nova`**: punto de partida coherente.
- **Metadata SEO en español**: cuidada y consistente.
- **`lang="es"` y `antialiased`**: bien configurados.
- **`next-themes` integrado**: dark mode disponible desde el día 1.
- **Variables CSS de fuente**: la base correcta para introducir serif sin reescribir nada.

---

## 10. Plan de implementación (4 sprints)

### Sprint 1 — Tipografía y accesibilidad (1 semana)
*Impacto perceptual máximo, riesgo mínimo.*

- [ ] 2.1 Cargar Literata como `--font-serif` y aplicar al editor (XS)
- [ ] 2.4 Subir todos los `text-[10px]` a `text-xs` (XS)
- [ ] 5.1 Convertir cards clickables en `<Link>` accesibles (S)
- [ ] 6.2 Subir touch targets del dropdown a 36-44px (XS)
- [ ] 6.3 Auditar foco visible con tab-through completo (S)
- [ ] 6.4 Validar contrastes con eyedropper (S)
- [ ] 4.6 Quitar el sparkle dorado del empty state (XS)

### Sprint 2 — Sistema visual (1 semana)
*Bases para crecer sin deuda visual.*

- [ ] 3.1 Definir paleta de marca + semánticos, eliminar amber/emerald del empty state (S)
- [ ] 3.3 Variantes propias para cada status del proyecto (XS)
- [ ] 7.1 Mapa de iconografía documentado (S)
- [ ] 8.1 Escala de spacing restringida documentada (S)
- [ ] 8.2 Border radius como tokens (XS)
- [ ] 8.3 Shadow tokens consistentes (XS)
- [ ] 3.4 Validar saturación de gradientes en dark mode (S)

### Sprint 3 — Cards de proyecto y dashboard (3-4 días)
*Reducir ruido, aumentar claridad.*

- [ ] 4.1 Título de la card más prominente, badge degradado (S)
- [ ] 4.2 Stats flush-left en vez de centered (S)
- [ ] 4.3 Métrica primaria de palabras destacada (XS)
- [ ] 4.4 Color band a 6-8px o convertir en cover real (S-M)
- [ ] 4.5 Demo como link bajo el CTA principal (XS)
- [ ] 4.7 Header del dashboard simplificado (XS)
- [ ] 5.2 Dropdown solo en hover (S)
- [ ] 5.4 Reducir piezas de info por card (S)

### Sprint 4 — Editor y experiencia de escritura (1-2 semanas)
*El corazón del producto.*

- [ ] 2.2 Selector de tipografía en ajustes del editor (S)
- [ ] 2.3 Controles de tamaño / interlineado / ancho de columna (S)
- [ ] 2.5 Modo "vista de libro" con tipografía de impresión (M)
- [ ] 7.2 Detalles literarios discretos en la UI (M)
- [ ] 7.3 Personalización fina de tokens shadcn (M)
- [ ] 6.6 Web Speech API para dictado y lectura (M)

---

## 11. Matriz de priorización (severidad × esfuerzo)

```
                   Esfuerzo →
              XS       S       M       L
            ┌───────┬───────┬───────┬───────┐
  Crítico   │ 2.1   │ 4.1   │       │       │
            │       │ 5.1   │       │       │
            │       │ 6.1   │       │       │
            ├───────┼───────┼───────┼───────┤
  Moderado  │ 2.4   │ 2.2   │ 2.5   │       │
            │ 3.3   │ 2.3   │ 7.2   │       │
            │ 4.3   │ 3.1   │ 7.3   │       │
            │ 4.5   │ 4.2   │       │       │
            │ 4.7   │ 4.4   │       │       │
            │ 6.2   │ 5.2   │       │       │
            │       │ 5.4   │       │       │
            │       │ 6.3   │       │       │
            │       │ 6.4   │       │       │
            │       │ 7.1   │       │       │
            │       │ 8.1   │       │       │
            ├───────┼───────┼───────┼───────┤
  Menor     │ 4.6   │ 3.2   │ 6.6   │       │
            │ 5.3   │       │       │       │
            │ 8.2   │       │       │       │
            │ 8.3   │       │       │       │
            └───────┴───────┴───────┴───────┘
```

**Empezar por la diagonal superior-izquierda**: 2.1, 2.4, 3.3, 4.3, 4.5, 4.6, 4.7, 6.2 — son XS-Críticos/Moderados. Una tarde de trabajo y la app se ve distinta.

---

## 12. Validaciones que requieren render real (👁️)

Esta crítica está hecha sobre el código. Para profundizar y validar lo siguiente, hace falta ver la app corriendo:

- **Dashboard con varios proyectos cargados**, light y dark mode
- **Editor de capítulo** con texto real (4-5 párrafos) y panel de IA abierto
- **Ficha de personaje** completa con todos los campos rellenos
- **Vista de estructura narrativa** (`/proyecto/[id]/estructura`) con el grafo
- **Mobile** (~390px de ancho): dashboard y editor
- **Modo editorial**: comparación con la versión de manuscrito
- **Sidebar**: contenido y comportamiento responsive
- **Empty states intermedios**: proyecto sin libros, libro sin capítulos, capítulo vacío
- **Estados de carga**: ¿qué se ve mientras IndexedDB se rehidrata? ¿hay flash of empty content?
- **Estados de error**: ¿qué pasa si Anthropic devuelve 500? ¿hay UI de error elegante?
- **Animaciones y transiciones**: ¿el cambio entre capítulos tiene sensación fluida?
- **Tipografía actual del editor**: tamaño real, line-height, ancho de columna

Con esos visuales se puede evaluar contraste real, peso tipográfico percibido, densidad de información, comportamiento responsive, transiciones y la sensación general de la app.

---

## 13. Decisiones de diseño que vale la pena tomar antes

Antes de implementar lo de arriba, conviene resolver:

1. **¿Editorial calmada o productiva enérgica?** Hoy mezcla las dos voces. Definir el polo dominante.
2. **¿Tipografía como elemento de marca?** Si sí, invertir en serif premium (Literata, Source Serif, idealmente comprar una family con licencia para que sea distintivo). Si no, Inter sigue.
3. **¿La pluma es el logo definitivo?** Si sí, llevarla a un sistema (favicon, loading state, watermark de exports). Si va a evolucionar, no invertir mucho en `Feather` aún.
4. **¿Densidad de información alta (Notion, Linear) o baja (Bear, iA Writer)?** Define cuánta info muestras por card, por panel, por modal.
5. **¿Mobile como first-class o como soporte?** Determina si los touch targets, los modales y la navegación se diseñan mobile-first.

---

## 14. Riesgos transversales del rediseño

- **Migración de tokens en componentes**: cambiar el sistema de spacing/radius/shadow puede romper visualmente componentes ya pulidos. Hacer un audit antes y trabajar con un Storybook o página `/design-system` con todos los componentes vivos.
- **Customización shadcn**: si modificas demasiado los tokens base, las próximas actualizaciones de shadcn van a ser dolorosas. Mantén las customizaciones en un layer separado (`globals.css` con variables que sobreescriben).
- **Tipografía y FOUT/FOIT**: cambiar a serif puede causar flash of unstyled text si no usas `font-display: optional` o `swap` con cuidado.
- **A11y regression**: cambiar cards a `<Link>` puede afectar el comportamiento de hover/focus existente. Probar con teclado y con lector de pantalla (VoiceOver en macOS).
- **Testing visual**: sin Storybook + Chromatic o algo similar, los cambios visuales pueden romperse en escenarios poco usados. Considerar capturar screenshots de referencia antes del rediseño.

---

*Fin del documento. Listo para discutir, recortar o priorizar antes de implementar.*
