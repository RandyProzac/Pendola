# Péndola — Propuestas de mejora

> Documento de análisis. No se ha modificado ningún archivo del proyecto.
> Fecha de análisis: 2026-05-07
> Stack actual examinado: Next.js 16.2.3 (App Router), React 19, TypeScript estricto, Tailwind v4, shadcn (`base-nova`), TipTap 3, Zustand, IndexedDB (`idb`), `@xyflow/react`, AI SDK con Anthropic / OpenAI / Gemini / Ollama.

---

## 0. Cómo leer este documento

Cada propuesta tiene cuatro etiquetas para ayudarte a priorizar:

- **Impacto**: bajo / medio / alto / muy alto — cuánto cambia la experiencia del escritor.
- **Esfuerzo**: XS / S / M / L / XL — XS = unas horas, XL = sprint largo.
- **Riesgo**: bajo / medio / alto — probabilidad de romper cosas o introducir deuda.
- **Depende de**: otras mejoras que conviene tener antes.

Al final hay un **roadmap sugerido en 4 fases** y una **matriz de priorización** para discutir.

---

## 1. Estructura narrativa profunda

### 1.1 Escenas como sub-unidad de capítulo
**Impacto:** muy alto · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** —

Hoy `Chapter.content` es un blob de TipTap JSON. Esto vuelve caro:
- darle contexto granular a la IA
- reordenar partes del capítulo
- detectar capítulos sin conflicto
- calcular minutos de lectura por escena
- saber qué personajes aparecen dónde

**Propuesta:** introducir una entidad `Scene` con:
- `id`, `chapterId`, `order`
- `title`, `synopsis`, `goal` (objetivo dramático)
- `pov` (id de personaje)
- `location` (id de escenario)
- `storyTimestamp` (momento cronológico de la historia, no del libro)
- `presentCharacterIds: string[]`
- `mood` (tensión / exposición / clímax / resolución)
- `content` (TipTap JSON)
- `wordCount`

Vista tipo *corkboard* (ya existe `corkboard-board.tsx` infra-utilizado) con drag-and-drop entre capítulos.

**Migración:** todo capítulo existente se convierte a una escena única durante la carga.

---

### 1.2 Plantillas de estructura narrativa
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 1.1

Plantillas seleccionables al crear proyecto: 3 actos, 4 actos, viaje del héroe, Save the Cat, kishōtenketsu, fórmula romance, fórmula thriller, etc. Cada plantilla genera un esqueleto de capítulos con `beatNumber` ya asignado y descripciones del beat ("Catalyst: el detonante que rompe el statu quo").

Reusar `lib/types` que ya tiene `beatNumber` opcional en `Chapter`.

---

### 1.3 Línea de tiempo cronológica vs narrativa
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 1.1

En thriller, noir, sci-fi y literaria, el orden de lectura ≠ orden cronológico. Una vista de timeline con dos ejes (orden del libro / orden de la historia) ayuda al autor y permite que la IA detecte saltos temporales raros automáticamente.

---

## 2. IA más inteligente

### 2.1 Memoria con búsqueda semántica (RAG local)
**Impacto:** muy alto · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** —

`lib/ai/context.ts` parece concatenar texto en el prompt. Esto se rompe en proyectos grandes (límite de tokens, costo, ruido).

**Propuesta:** capa de embeddings sobre capítulos, fichas, escenarios y recursos.

Opciones:
- **Local:** `transformers.js` con `Xenova/multilingual-e5-small` (multilingüe, ~100MB, corre en navegador). Privacidad total.
- **Hosted:** llamar al endpoint de embeddings del proveedor seleccionado (OpenAI `text-embedding-3-small`, Gemini `text-embedding-004`, Voyage para Anthropic).

Los embeddings se guardan en IndexedDB junto al contenido. En cada consulta a la IA, el panel hace un retrieve híbrido (top-K semántico + match exacto de keywords del lorebook) y pasa solo lo relevante al `contextText` que ya consume `route.ts`.

`LorebookEntry.priority` y `LorebookEntry.keywords` son el cimiento perfecto para el retriever híbrido.

---

### 2.2 Detección de inconsistencias narrativas
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 2.1

Vista "salud del manuscrito" con auditoría asíncrona en background:
- personajes mencionados sin ficha
- color de ojos / edad / nombre que cambia entre capítulos
- escenarios sin descripción previa
- saltos temporales ilógicos
- rasgos que contradicen la ficha del personaje

Cada finding se cachea contra un hash del capítulo correspondiente para no re-ejecutar la IA hasta que el contenido cambie.

---

### 2.3 Track-changes real en flujo editorial
**Impacto:** muy alto · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** —

Hoy `EditorialDraft` reemplaza el contenido entero. Falta:
- diff a nivel de párrafo o frase
- cada cambio sugerido por la IA es **aceptable o rechazable individualmente**
- comentarios anclados al texto (estilo Google Docs)
- comparación side-by-side con `react-resizable-panels` (ya instalado)
- export con marcas de cambios para mandar a editor humano

Buenas librerías base: `diff-match-patch` o `jsdiff` para el cálculo, ProseMirror plugin para mostrar las marcas en TipTap.

---

### 2.4 Caché de respuestas de IA
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

Acciones deterministas (extraer keywords de un capítulo, generar sinopsis, detectar personajes mencionados) deberían cachearse por hash del input. Ahorro real de tokens y latencia.

Lugar natural: una tabla `aiCache` en IndexedDB con `key = sha256(model + systemPrompt + inputHash + mode)`.

---

### 2.5 Streaming en modo `structured`
**Impacto:** bajo · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** —

El modo `structured` actual usa `generateObject` que bloquea hasta que termina. Se puede simular streaming mostrando un placeholder y haciendo `streamObject` (AI SDK lo soporta) para que el usuario vea progreso.

---

### 2.6 Costos y observabilidad de IA
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

Hoy no hay forma de saber cuánto cuesta usar Anthropic / OpenAI / Gemini.

**Propuesta:** un contador local con:
- tokens in / tokens out por mensaje
- costo estimado en USD según tabla de precios del proveedor
- agregado por proyecto, por capítulo, por modo, por mes
- alertas de presupuesto (e.g. "vas $5 este mes en este proyecto")

Tabla de precios versionada en `lib/ai/pricing.ts`.

---

## 3. Editor y experiencia de escritura

### 3.1 Modo enfoque / typewriter
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

Pantalla limpia, línea actual centrada verticalmente, opción de bloquear borrar (modo *hardcore*), pantalla completa real. Diferenciador clásico para escritores serios. Es UI pura sobre TipTap.

---

### 3.2 Métricas y hábitos del escritor
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** —

`Chapter.trackedWritingSeconds` y `lastWritingAt` ya existen pero parecen poco explotados. Construir encima:
- racha diaria de escritura
- palabras por día (gráfico)
- hora más productiva del día
- velocidad promedio (palabras/minuto)
- objetivos NaNoWriMo (objetivo de palabras + fecha límite + proyección "a este ritmo terminas el…")

Página `/proyecto/[id]/metricas` o widget en el dashboard.

---

### 3.3 Sugerencias de IA en línea (ghost text)
**Impacto:** alto · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** 2.1

Estilo Cursor/Copilot pero para narrativa: mientras escribes, una sugerencia gris aparece al final de la frase y la aceptas con `Tab`. Más sutil que el panel lateral, mucho más adictivo.

Importante: con throttle agresivo (cada N segundos sin escribir) y caché para no quemar tokens.

---

## 4. Personajes y mundo

### 4.1 Grafo de relaciones interactivo
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

El campo `Character.relationships` es una lista plana. Renderizarlo como mini-grafo con `@xyflow/react` (ya instalado) en la ficha del personaje hace obvias las dinámicas: triángulos, mentor/aprendiz, enemistades cruzadas.

---

### 4.2 Arcos de personaje calculados
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** 1.1, 2.1

La IA marca en qué escenas aparece cada personaje y estima su estado emocional/dramático en cada una. Se grafica como una línea de evolución a lo largo del libro. Muy útil para detectar personajes "planos" o que desaparecen sin razón.

---

### 4.3 Galería visual con IA
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** —

Permitir adjuntar imágenes a personajes y escenarios. Usar visión (Claude / GPT-4o / Gemini) para auto-describir la imagen y guardar la descripción como contexto textual. Así la IA "ve" lo que el autor ve sin pagar tokens de visión cada consulta.

---

## 5. Recursos y referencias

### 5.1 Procesamiento en Web Worker
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

`pdfjs-dist` + `tesseract.js` son pesados y bloquean el hilo principal. Mover a Web Worker con barra de progreso real.

---

### 5.2 Adjuntar URLs como recurso
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

Pegar una URL (Wikipedia, blog, paper, post) y que el servidor extraiga el texto vía readability/`@mozilla/readability`. Útil para investigación temática sin tener que descargar PDFs.

---

### 5.3 Recursos como ciudadanos de primera del RAG
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 2.1

Una vez que hay embeddings, los recursos se indexan igual que el manuscrito. Hoy `Resource.extractedContent` existe pero no parece participar del retrieval inteligente.

---

## 6. Versionado e historial

### 6.1 Diff visual entre snapshots
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** —

`ChapterSnapshot` ya guarda razones tipadas (`manual`, `auto_interval`, `apply_editorial`, etc.). Falta UI para:
- timeline de snapshots por capítulo
- diff visual entre dos snapshots cualesquiera
- etiquetar snapshots ("borrador 1", "antes del editor")
- restaurar a un snapshot

Reusar `chapter-versions-dialog.tsx` que ya existe (113 líneas) como base.

---

### 6.2 Blame por párrafo
**Impacto:** medio · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** 6.1

"Este párrafo no se ha tocado en 14 días, este otro lo reescribiste 6 veces." Útil para encontrar zonas frágiles del manuscrito.

Implementación posible: hash de cada párrafo + tabla de eventos de cambio.

---

## 7. Persistencia y sincronización

### 7.1 Export/import de proyecto desde la UI
**Impacto:** alto · **Esfuerzo:** XS · **Riesgo:** bajo · **Depende de:** —

`ProjectBackup` ya está tipado y `lib/persistence/project-backup.ts` parece tener la lógica. Falta UI obvia: botones de descargar / arrastrar y soltar JSON. Mientras no haya cuentas online, esto es lo único que protege al usuario de perder su trabajo.

---

### 7.2 Sync opcional a almacenamiento del usuario
**Impacto:** muy alto · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** 7.1

Sin servidor propio: el usuario conecta su Dropbox / Google Drive / S3 / iCloud Drive con sus credenciales y Péndola sincroniza el `ProjectBackup` cifrado.

Ventajas: privacidad alta, costo de infra cero, multi-dispositivo resuelto.

`lib/persistence/remote-sync-adapter.ts` ya sugiere que hay un plan para esto.

---

### 7.3 Cuentas y backend propio
**Impacto:** muy alto · **Esfuerzo:** XL · **Riesgo:** alto · **Depende de:** 7.1

Decisión de producto, no técnica. Si vas por aquí: Auth (Clerk / Auth.js), Postgres + Drizzle, Vercel Postgres o Neon, Inngest para jobs en background.

---

### 7.4 Conflict resolution
**Impacto:** medio · **Esfuerzo:** L · **Riesgo:** alto · **Depende de:** 7.2 o 7.3

Si hay sync, hay conflictos. Estrategias razonables para narrativa:
- last-write-wins por capítulo (suficiente para single-user multi-device)
- CRDT con `Yjs` (caro pero abre puerta a colaboración en tiempo real)

---

## 8. Colaboración

### 8.1 Comentarios anclados
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** —

Estilo Google Docs, en la copia editorial. Útil incluso en single-user (notas para uno mismo).

---

### 8.2 Lectores beta con link de solo lectura
**Impacto:** alto · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** 7.3

Compartir un capítulo o libro con un link público. El lector lee y deja comentarios sin cuenta. Convierte Péndola de "herramienta de borrador" a "herramienta de iteración".

---

### 8.3 Colaboración en vivo
**Impacto:** medio · **Esfuerzo:** XL · **Riesgo:** alto · **Depende de:** 7.4 con Yjs

Solo si hay demanda real. La mayoría de novelistas escriben solos.

---

## 9. Exportación y publicación

### 9.1 Export a EPUB
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** —

`docx` ya está. EPUB con `epub-gen` o construido manualmente desde el HTML de TipTap. Permite leer el manuscrito en e-reader, paso clave en el flujo de revisión.

---

### 9.2 Export a PDF maquetado
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** —

PDF con tipografía y márgenes de libro, no la impresión del navegador. `pdf-lib` o servidor con Puppeteer + CSS print.

---

### 9.3 Export con marcas de cambios
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 2.3

Para mandar al editor humano: docx con track-changes nativo (la lib `docx` lo soporta vía `tracking`).

---

### 9.4 Integraciones de publicación
**Impacto:** medio · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** —

Wattpad, AO3, Substack, KDP. Cada una requiere su propio adapter. Empezar por la que tu audiencia objetivo más use.

---

## 10. Onboarding y plantillas

### 10.1 Plantillas de proyecto
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 1.2

"Novela negra de 80k palabras", "Fantasía épica trilogía 3×25 capítulos", "Guion de cortometraje", "YA primera persona". Cada plantilla pre-rellena `Project`, crea `Book`s, `Chapter`s con beats, y agrega `LorebookEntry`s típicas del género.

Baja la fricción inicial de creación, que hoy es alta.

---

### 10.2 Tour interactivo
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

Primera vez que entras al editor, una guía señala las cuatro zonas: sidebar de capítulos, editor central, panel de IA, recursos. `react-joyride` o `driver.js`.

---

## 11. Internacionalización

### 11.1 Capa i18n
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** —

La app está hardcodeada en español, lo cual es una virtud (la mayoría de competidores hacen español pésimo) pero impide expandir a portugués / italiano / francés con bajo esfuerzo.

`next-intl` o `next-i18next`. Empezar extrayendo strings de `app/page.tsx` y los componentes más usados.

---

## 12. Accesibilidad

### 12.1 Auditoría de contraste y teclado
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

Los gradientes violet/indigo del hero pueden ser flojos en modo claro. Auditar con axe DevTools, asegurar navegación por teclado del editor y del corkboard, labels ARIA en componentes shadcn personalizados.

---

### 12.2 Lectura por voz / dictado
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** —

Web Speech API para dictado y para que la IA lea respuestas en voz alta. Útil para escritores que prefieren oír su prosa o que tienen limitaciones visuales.

---

## 13. Salud técnica

### 13.1 Configurar `next.config.ts`
**Impacto:** bajo · **Esfuerzo:** XS · **Riesgo:** bajo · **Depende de:** —

`next.config.ts` está vacío. Añadir:
- `experimental.optimizePackageImports` para `lucide-react`, `@tiptap/*`, `@base-ui/react`
- `images` config si se van a servir imágenes externas
- `reactStrictMode: true` (verificar)

---

### 13.2 Script de typecheck y pre-commit
**Impacto:** medio · **Esfuerzo:** XS · **Riesgo:** bajo · **Depende de:** —

```json
"typecheck": "tsc --noEmit"
```

Husky + lint-staged para correrlo en pre-commit junto al lint actual.

---

### 13.3 Tests unitarios sobre lógica pura
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** —

Vitest sobre:
- `lib/store/index.ts` (1.278 líneas, cero tests, es el cerebro)
- `lib/ai/context.ts`
- las heurísticas de `app/api/chat/route.ts` (`isMetaConversation`, `looksLikeManuscriptText`, `looksLikeIncompleteResponse`, `mergeContinuation`)
- `lib/resources/extract.ts`

Romperse en silencio aquí sería caro. Tests son baratos porque la lógica es pura.

---

### 13.4 Observabilidad en producción
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** —

Sentry o equivalente. Capturar errores del cliente y del endpoint de IA con contexto (proveedor, modo, longitud del input).

---

### 13.5 LICENSE y CONTRIBUTING
**Impacto:** bajo · **Esfuerzo:** XS · **Riesgo:** bajo · **Depende de:** —

No hay archivo `LICENSE` en el root. Si vas a publicar el repo, decide la licencia (MIT, Apache 2.0, AGPL si quieres copyleft fuerte).

---

### 13.6 CI/CD
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 13.2, 13.3

GitHub Actions: lint + typecheck + test en cada PR. Deploy automático a Vercel desde `main`.

---

## 14. Roadmap sugerido (4 fases)

### Fase 1 — Fundamentos (2-3 semanas)
*Objetivo: no perder datos, ver progreso real, base para todo lo demás.*

- 7.1 Export/import desde UI (XS)
- 13.1 `next.config.ts` (XS)
- 13.2 Typecheck + pre-commit (XS)
- 13.5 LICENSE (XS)
- 6.1 Diff visual entre snapshots (M)
- 3.2 Métricas y hábitos del escritor (M)
- 13.3 Tests sobre lógica pura (M)

### Fase 2 — IA seria (4-6 semanas)
*Objetivo: que la IA escale a proyectos grandes y deje de quemar dinero a ciegas.*

- 2.4 Caché de respuestas (S)
- 2.6 Costos y observabilidad (S)
- 2.1 RAG local con embeddings (L)
- 5.3 Recursos en el RAG (S)
- 2.2 Detección de inconsistencias (M)

### Fase 3 — Estructura y editorial (4-6 semanas)
*Objetivo: convertir Péndola en herramienta de editorial seria.*

- 1.1 Escenas como sub-unidad (L)
- 1.2 Plantillas de estructura (M)
- 10.1 Plantillas de proyecto (S)
- 2.3 Track-changes real (L)
- 8.1 Comentarios anclados (M)
- 9.1 Export a EPUB (M)
- 9.3 Export con marcas de cambios (M)

### Fase 4 — Sync y comunidad (variable)
*Objetivo: multi-dispositivo y publicación.*

- 7.2 Sync a almacenamiento del usuario (L)
- 8.2 Lectores beta con link (L)
- 4.2 Arcos de personaje (M)
- 1.3 Línea de tiempo (M)
- 11.1 i18n (M)
- 9.4 Integraciones de publicación (L)

---

## 15. Matriz de priorización (impacto × esfuerzo)

```
                    Esfuerzo →
                XS      S       M       L       XL
            ┌───────┬───────┬───────┬───────┬───────┐
  Muy alto  │  7.1  │       │       │ 1.1   │ 7.3   │
            │       │       │       │ 2.1   │       │
            │       │       │       │ 2.3   │       │
            │       │       │       │ 7.2   │       │
            ├───────┼───────┼───────┼───────┼───────┤
  Alto      │       │ 2.4   │ 1.2   │ 3.3   │       │
            │       │ 2.6   │ 2.2   │ 8.2   │       │
            │       │ 5.3   │ 3.2   │       │       │
            │       │ 10.1  │ 4.2   │       │       │
            │       │       │ 6.1   │       │       │
            │       │       │ 8.1   │       │       │
            │       │       │ 9.1   │       │       │
            │       │       │ 9.3   │       │       │
            │       │       │ 13.3  │       │       │
            ├───────┼───────┼───────┼───────┼───────┤
  Medio     │       │ 3.1   │ 1.3   │ 6.2   │ 8.3   │
            │       │ 4.1   │ 4.3   │       │       │
            │       │ 5.1   │ 9.2   │       │       │
            │       │ 5.2   │ 11.1  │       │       │
            │       │ 10.2  │ 12.2  │       │       │
            │       │ 12.1  │ 7.4   │       │       │
            │       │ 13.4  │       │       │       │
            │       │ 13.6  │       │       │       │
            ├───────┼───────┼───────┼───────┼───────┤
  Bajo      │ 13.1  │       │ 2.5   │       │       │
            │ 13.2  │       │       │       │       │
            │ 13.5  │       │       │       │       │
            └───────┴───────┴───────┴───────┴───────┘
```

**Las quick wins** (impacto alto + esfuerzo bajo) son el cuadrante para empezar:
**7.1, 2.4, 2.6, 5.3, 10.1**.

**Las apuestas grandes** (impacto muy alto + esfuerzo L o más) son las que definen el producto:
**1.1, 2.1, 2.3, 7.2**.

---

## 16. Decisiones que vale la pena tomar antes

Antes de empezar a implementar, conviene resolver estas preguntas de producto:

1. **¿Single-user o multi-user?** Cambia radicalmente todo lo de sync, cuentas y colaboración.
2. **¿Privacidad por defecto o cloud por defecto?** Define si vas por 7.2 (sync a Drive del usuario) o 7.3 (backend propio).
3. **¿Audiencia novelistas amateur o profesionales?** Profesionales pagarán por features de editorial (2.3, 8.1, 9.3); amateur valoran más métricas y hábitos (3.2).
4. **¿Mercado solo hispanohablante o multilingüe?** Define la urgencia de 11.1.
5. **¿Modelo de negocio?** Free + BYOK (bring your own key), suscripción, o créditos. Define si 2.6 (costos) es informativo o transaccional.

---

## 17. Riesgos transversales

- **Migración de datos:** cualquier cambio en `lib/types/index.ts` necesita una estrategia de migración para usuarios con datos en IndexedDB. Sugiero versionar el schema (`Project.schemaVersion`) y un módulo `lib/persistence/migrations/` con funciones idempotentes por versión.
- **Lock-in con TipTap:** todo el contenido es JSON de TipTap. Si algún día quieres cambiar editor, planificar export a Markdown / HTML estable como formato neutro.
- **Costo de IA descontrolado:** sin 2.4 y 2.6, un usuario activo puede gastar $50/mes en tokens sin enterarse.
- **Privacidad:** algunos usuarios escriben material muy personal. Documentar claramente qué se manda al proveedor de IA y qué se queda local. Modo "todo local" con Ollama debe seguir siendo first-class.

---

*Fin del documento. Listo para discutir, recortar o priorizar.*
