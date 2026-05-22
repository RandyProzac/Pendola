# Péndola — Mejoras para publicación profesional

> Documento de análisis. No se ha modificado ningún archivo del proyecto.
> Fecha: 2026-05-07
> Alcance: convertir Péndola de "herramienta de borrador" en "herramienta de publicación", cubriendo desde el manuscrito hasta el botón de "Publicar" en Amazon, Apple Books, Kobo, IngramSpark y similares.

---

## 0. Tesis del documento

Hoy Péndola es buen sitio para escribir, pero se queda en `lib/export/manuscript.ts` que produce docx/txt/json. Eso es perder el último 30% del flujo del autor moderno. La meta de este plan es **llevar al escritor desde la primera palabra hasta la subida final a la plataforma sin salir de Péndola**, con la calidad técnica que las plataformas exigen y las prácticas que separan a un autor amateur de uno profesional.

### Cómo leer este documento

Cada propuesta tiene:

- **Impacto**: bajo / medio / alto / muy alto
- **Esfuerzo**: XS (horas) · S (días) · M (semana) · L (sprint) · XL (1+ mes)
- **Riesgo**: bajo / medio / alto
- **Plataformas afectadas**: Amazon KDP, IngramSpark, Apple Books, Kobo, Google Play, D2D, etc.

---

## 1. Pipeline de publicación con perfiles por destino

### 1.1 Reemplazar `manuscript.ts` por sistema de perfiles
**Impacto:** muy alto · **Esfuerzo:** L · **Riesgo:** medio

Hoy `lib/export/manuscript.ts` exporta sin diferenciar destino. Cada plataforma tiene requisitos distintos y el escritor termina haciendo el mismo trabajo de formateo varias veces.

Nueva arquitectura: `lib/export/profiles/` con un módulo por destino, cada uno con su propia configuración de tipografía, márgenes, estructura y metadatos.

**Perfiles a implementar:**

| Perfil | Formato | Características |
|---|---|---|
| **Amazon KDP eBook** | EPUB 3 + DOCX | NCX, ToC navegable, metadatos Amazon, sin DRM |
| **Amazon KDP Print** | PDF print-ready | Bleed 3.175mm, márgenes según trim, gutter dinámico, headers alternados, drop caps |
| **IngramSpark** | EPUB 3 strict + PDF | Validación EPUBCheck strict, PDF/X-1a para print, perfil ICC adecuado |
| **Apple Books** | EPUB 3 | CSS avanzado, fuentes embedded, NCX + Nav Doc |
| **Kobo / Google Play** | EPUB 3 universal | Compatible con la mayoría de e-readers, CSS conservador |
| **Smashwords / D2D** | DOCX o EPUB | Estructurado para "meatgrinder" o EPUB universal |
| **Agente / editor (USA)** | DOCX | William Shunn manuscript format estricto |
| **Editor (España / LatAm)** | DOCX | Norma RAE, guion largo, comillas latinas, interlineado 1.5 |
| **Beta readers** | DOCX | Doble espacio, sin comentarios, marca "BORRADOR — No distribuir" |
| **Web (Substack, Medium, Royal Road)** | Markdown / HTML | Limpio, semántico, con front-matter YAML |

### 1.2 Validación con EPUBCheck integrada
**Impacto:** muy alto · **Esfuerzo:** M · **Riesgo:** medio

EPUBCheck es el validador oficial de la W3C/IDPF que Apple, Kobo y todas las plataformas serias corren contra el archivo. Si tu EPUB no pasa, lo rechazan.

**Implementación:**
- Correrlo en cada export de EPUB antes de descargar
- Mostrar errores y warnings con explicaciones legibles (no el dump técnico de Java)
- Sugerencias de cómo arreglar cada problema con link al capítulo afectado
- Opción "ver versión técnica completa" para usuarios avanzados

**Opciones técnicas:**
- `epubcheck-wasm` (puerto a WebAssembly, corre en navegador)
- Microservicio Node con el JAR oficial de EPUBCheck (más confiable)
- API gestionada de un tercero (más caro pero menos mantenimiento)

Sin esto, Péndola no es una herramienta seria para publicación.

### 1.3 Pre-flight check antes de publicar
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 1.2, 4

Pantalla "¿Listo para publicar?" antes de cualquier export final, con checklist visual:

```
✅ Título, autor, idioma definidos
✅ Sinopsis corta (87 / 280 caracteres)
⚠️ Sinopsis larga vacía  ← bloqueante
✅ ISBN ingresado y válido (978-84-XXXXX-XX-X)
⚠️ Cubierta no cargada  ← bloqueante para print
✅ BISAC categories (2 de 2)
⚠️ Keywords (3 de 7) — Amazon permite 7
✅ Front matter completo
⚠️ Back matter sin "Acerca del autor"
✅ EPUBCheck pasa sin errores
⚠️ 14 TODOs pendientes en el manuscrito
✅ Spelling revisado en todos los capítulos
```

Solo permite el export final cuando los bloqueantes están resueltos.

---

## 2. Front matter y back matter como ciudadanos de primera clase

### 2.1 Nueva entidad `BookSection`
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** medio

Hoy `Book` solo tiene capítulos. Pero un libro publicable necesita mucho más.

**Propuesta de modelo:**

```ts
type BookSectionType =
  | 'half_title'       // Falsa portada
  | 'title_page'       // Portada
  | 'copyright'        // Derechos reservados
  | 'dedication'       // Dedicatoria
  | 'epigraph'         // Epígrafe
  | 'toc'              // Tabla de contenidos
  | 'foreword'         // Prólogo (otro autor)
  | 'preface'          // Prefacio (mismo autor)
  | 'introduction'     // Introducción
  | 'chapter'          // Capítulo (existente)
  | 'epilogue'         // Epílogo
  | 'afterword'        // Posfacio
  | 'acknowledgments'  // Agradecimientos
  | 'about_author'     // Acerca del autor
  | 'other_books'      // Otros libros del autor
  | 'sneak_peek'       // Adelanto del próximo libro
  | 'newsletter_cta'   // Llamado a newsletter
  | 'review_request'   // Pedido de reseña
  | 'glossary'         // Glosario
  | 'appendix'         // Apéndice
  | 'bibliography'     // Bibliografía
  | 'notes'            // Notas finales
  | 'index'            // Índice analítico

interface BookSection {
  id: string
  bookId: string
  type: BookSectionType
  title: string
  content: string  // TipTap JSON
  order: number
  includeInToc: boolean
  pageBreakBefore: boolean
}
```

### 2.2 Plantillas legales por país
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 2.1

Página de copyright pre-rellenada según país de publicación. Cada jurisdicción tiene fórmulas legales distintas:

- **España**: "Reservados todos los derechos. No se permite la reproducción total o parcial..."
- **México**: nota sobre INDAUTOR
- **Argentina**: ley 11.723
- **USA**: "All rights reserved. No part of this publication may be reproduced..."
- **UK**: con referencia al Copyright, Designs and Patents Act 1988

Plantillas curadas por un asesor legal y mantenidas como datos, no como código.

### 2.3 Cross-promotion automático en back matter
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 2.1

"Otros libros del autor" se genera automáticamente a partir del workspace del usuario, con cubiertas, links de Amazon/Apple Books, sinopsis. Esto es **oro puro** en el algoritmo de Amazon: cada libro vende los siguientes.

Plus: "Sneak peek" del próximo libro con los primeros 1-2 capítulos del siguiente proyecto en estado `borrador` o `revision`.

### 2.4 Llamados a la acción funcionales
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 2.1

Plantillas para los CTAs estándar al final de un libro:
- "Si te gustó, ¿me regalas una reseña?" con link directo al producto en Amazon/Goodreads
- "Newsletter signup" con link a MailerLite, ConvertKit, Substack
- Códigos QR generados automáticamente para versiones impresas

---

## 3. Tipografía editorial automática en el editor

### 3.1 Smart quotes y sustitución de glifos
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo

El editor debe escribir directo en formato editorial, sin que el escritor haga buscar y reemplazar después.

| Entrada | Salida (es) | Salida (en) |
|---|---|---|
| `"hola"` | `«hola»` o `"hola"` (configurable) | `"hola"` |
| `'hola'` | `'hola'` | `'hola'` |
| `--` | `—` (em dash) | `—` |
| `-` entre números | `–` (en dash) | `–` |
| `...` | `…` (carácter unicode) | `…` |
| `(c)` | `©` | `©` |
| `(tm)` | `™` | `™` |

Implementación: extensión TipTap (similar a `@tiptap/extension-typography` pero más completa y configurable por idioma).

### 3.2 Diálogos en español con guion largo
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo

El estándar de novela en español es guion largo (—), no comillas. Detectar líneas que empiezan con `-` o `--` al inicio de línea y convertir automáticamente a `—` con espacio correcto:

```
- Hola - dijo Juan.
       ↓
— Hola —dijo Juan.
```

(Nota: la convención exacta varía: RAE actual no pone espacio antes del guion de cierre; otros estilos sí. Configurable.)

### 3.3 Comillas anidadas con jerarquía correcta
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo

```
Español (RAE):  «hola "mundo" qué tal»
Inglés (USA):   "hello 'world' how are you"
Inglés (UK):    'hello "world" how are you'
```

Detección automática del nivel de anidación.

### 3.4 Espacios finos y puntuación tipográfica
**Impacto:** bajo · **Esfuerzo:** S · **Riesgo:** bajo

- Espacios finos (`U+202F` o `U+2009`) antes de signos de puntuación en francés
- Espacio antes de comillas latinas en español tipográfico fino
- No-break spaces en abreviaturas ("Sr. García")
- Espacios correctos en rangos de fechas y páginas

### 3.5 Estilos de escritura por mercado
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 3.1, 3.2, 3.3

Selector a nivel proyecto:

- **Español de España (RAE)** — comillas latinas, voseo no, "vosotros", "ñ"
- **Español neutro panhispánico** — el que pide Amazon LatAm, evita localismos
- **Español rioplatense** — voseo, "ustedes"
- **Español mexicano** — modismos específicos
- **Inglés US** — color, organize, doble comilla
- **Inglés UK** — colour, organise, simple comilla
- **Inglés AU/CA** — variantes específicas

El corrector, las reglas tipográficas, la IA editorial y los exports cambian según la elección.

---

## 4. Metadatos editoriales completos

### 4.1 Sección `/proyecto/[id]/publicacion`
**Impacto:** muy alto · **Esfuerzo:** M · **Riesgo:** bajo

Una pantalla nueva que centraliza todo lo que las plataformas piden:

**Identificación**
- Título, subtítulo, autor (real + pseudónimo), traductor, ilustrador
- ISBN-13 con validación de checksum (KDP da gratis ASIN, IngramSpark exige propio)
- Idioma original
- Año de copyright
- Edición (1ª, 2ª revisada, etc.)

**Categorización**
- **BISAC categories** (mínimo 2, máximo 3): selector con búsqueda sobre el listado oficial de Book Industry Standards And Communications, ej. `FIC027020 — Fiction / Romance / Contemporary`
- **Keywords** (Amazon: 7 max): con validador que advierte si incluyen palabras del título o nombre del autor (Amazon penaliza)
- **Comparables** ("para fans de X y Y"): clave para algoritmo de Amazon
- **Edad objetivo**: Adult / NA / YA / MG / Children con rango específico

**Series**
- Nombre de la serie
- Número de libro en la serie
- Total previsto
- Standalone vs interconectado

**Sinopsis múltiples**
- **Tagline** (1 línea, ~80 caracteres) — para banners, ads
- **Sinopsis corta** (280 caracteres) — para redes sociales, newsletters
- **Sinopsis Amazon** (4000 caracteres con HTML simple permitido)
- **Sinopsis larga** (1-2 páginas) — para queries a agentes
- **Pitch elevator** (30 segundos hablado) — para podcasts y eventos

**Pricing por territorio**
- USA: precio en USD
- UK: precio en GBP
- EU: precio en EUR
- LatAm: precio en MXN, ARS, CLP, COP
- Cálculo automático de royalty: 35% vs 70% en KDP según rango de precio
- Recomendación de precio según género y longitud (datos de Amazon Charts)

### 4.2 Validación cruzada por plataforma
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 4.1

Cada plataforma tiene límites distintos. La UI debe mostrarlos:

```
Sinopsis Amazon: 3.847 / 4.000 ✅
Sinopsis Apple:  3.847 / 4.000 ✅
Sinopsis Kobo:   3.847 / 4.000 ✅
Tagline:         92 / 80 ⚠️ excede en Twitter (excede)
```

---

## 5. Estimaciones útiles para el escritor

### 5.1 Páginas según trim size
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo

```
80.245 palabras
├── 5×8" (mass market) ≈ 320 páginas
├── 5.25×8" (KDP popular) ≈ 295 páginas
├── 5.5×8.5" (trade paperback estándar) ≈ 280 páginas
├── 6×9" (literary trade) ≈ 245 páginas
└── 7×10" (textbook) ≈ 180 páginas
```

Calculado con la tipografía y márgenes del perfil seleccionado. Las fórmulas son públicas; cada combinación de trim + font + leading da una palabras-por-página estable.

### 5.2 Costo de impresión POD y royalty
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 5.1

Tablas oficiales de KDP Print y IngramSpark:

```
Para 295 páginas en 5.5×8.5", B&W, papel crema:

KDP Print:
  Costo de impresión:    $4.85
  Precio sugerido:       $14.99
  Royalty (60% precio):  $9.00
  Royalty neto:          $4.15 por copia vendida

IngramSpark:
  Costo de impresión:    $5.40
  Precio sugerido:       $14.99
  Royalty (45% precio):  $6.75
  Royalty neto:          $1.35 por copia vendida (peor margen, mejor distribución)
```

Tablas versionadas en `lib/publishing/pricing-tables.ts` y actualizadas trimestralmente.

### 5.3 Duración estimada en audiobook
**Impacto:** medio · **Esfuerzo:** XS · **Riesgo:** bajo

Estándar industria: ~9.300 palabras = 1 hora narrada (varía por idioma y narrador).

```
80.245 palabras ≈ 8 horas 38 minutos de audiobook
```

Útil para presupuestar narrador (cobran $200-400 USD por hora terminada en inglés, $80-200 en español).

### 5.4 Comparación con el género
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo

```
Tu novela: 65.000 palabras
Romance contemporáneo promedio: 70.000-90.000

⚠️ Estás 5.000 palabras debajo del límite inferior del género.
Los lectores de romance contemporáneo esperan más extensión.
```

Datos de Goodreads / Amazon Charts agregados por género.

### 5.5 Spine width calculator para print
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 5.1

Para que el diseñador de cubierta sepa el ancho exacto del lomo:

```
295 páginas × 0.0025" (papel blanco crema KDP) = 0.738" (1.87 cm)
```

Genera template PDF de wraparound con dimensiones exactas (frente + lomo + contracubierta + bleed) listo para mandar al diseñador.

---

## 6. Análisis editorial automático

### 6.1 Detección de patrones profesionales
**Impacto:** muy alto · **Esfuerzo:** L · **Riesgo:** medio

Los editores humanos cobran $1.000-3.000 por una revisión que mayormente busca patrones detectables automáticamente. Una pestaña "Análisis editorial" con hallazgos marcados en línea sobre el manuscrito:

| Patrón | Severidad | Ejemplo |
|---|---|---|
| Líneas viudas y huérfanas | 🟡 | Última línea de párrafo cae en página nueva |
| Rivers tipográficos | 🟢 | Espacios alineados verticalmente que cruzan párrafos |
| Inconsistencia de cursivas | 🟡 | Palabra X en cursiva en cap 1, sin cursiva en cap 7 |
| Inconsistencia de comillas | 🔴 | Mezcla de "..." y «...» en el mismo libro |
| Espacios dobles, tabs | 🟢 | Detectables y corregibles automáticamente |
| Mayúsculas erráticas | 🟡 | Después de diálogos, después de signos de cierre |
| Adverbios en -mente excesivos | 🟢 | Stephen King los odia, la mayoría de editores también |
| Tags de diálogo abusivas | 🟡 | "Said is invisible" — exclamó/susurró/gritó en exceso |
| Repeticiones a corta distancia | 🟡 | Misma palabra en frases adyacentes |
| Filtros de POV | 🟡 | "vio que", "sintió que", "pensó que" — alejan del personaje |
| Signos de puntuación dobles | 🟢 | ?? !! ?! suelen ser amateur |

### 6.2 Gramática y ortografía con IA
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** medio

Capa adicional sobre el corrector del navegador, usando la IA ya integrada en modo `revision`:

- Concordancia de género/número
- Tildes diacríticas (sí/si, dé/de, sé/se, té/te, mí/mi)
- Loísmo, leísmo, laísmo (con tolerancia configurable según mercado)
- Dequeísmo y queísmo
- Anglicismos innecesarios
- Falsos amigos en traducciones

Para inglés: Hemingway-style suggestions sobre pasiva, frases largas, palabras complejas.

### 6.3 Análisis de ritmo y prosa
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** 6.2

Métricas de prosa por capítulo:

- Longitud promedio de oración (cortas = thriller, largas = literario)
- Variabilidad de longitud (alta = mejor ritmo)
- Ratio diálogo/narración (depende del género)
- Densidad de adjetivos
- Densidad de verbos en pasiva
- Lecturabilidad (Flesch en inglés, Fernández-Huerta en español)

Visualizado como gráfico por capítulo, con benchmarks del género.

### 6.4 Continuity check con IA + RAG
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** RAG (ver MEJORAS_PROPUESTAS.md 2.1)

- Color de ojos / edad / nombre que cambia entre capítulos
- Personajes mencionados sin ficha
- Saltos temporales raros
- Escenarios usados sin descripción previa
- Rasgos que contradicen la ficha del personaje

---

## 7. Cubiertas

### 7.1 Validador de specs por plataforma
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo

Carga de imagen + validación contra requisitos:

| Plataforma | Tamaño mínimo | Formato | Color | Otros |
|---|---|---|---|---|
| Amazon KDP eBook | 1.000×1.600 px | JPG/TIFF | RGB | Ratio 1.6:1 ideal |
| KDP Print | 1.625×2.625 px | TIFF | CMYK | Bleed 0.125" |
| Apple Books | 1.400×2.100 px | JPG | RGB | Ratio variable |
| Kobo | 1.600×2.400 px | JPG | RGB | — |
| IngramSpark | 1.800×2.700 px | PDF/X-1a | CMYK | Bleed 0.125" |

Con sugerencias de cómo arreglar cada problema (resize, conversión de color, etc.).

### 7.2 Generador de cubiertas con plantillas
**Impacto:** alto · **Esfuerzo:** L · **Riesgo:** medio

Plantillas por género con variables editables:

- **Romance**: pareja en primer plano, paleta cálida, tipografía script en título
- **Thriller**: silueta urbana, paleta azul/negro, tipografía bold sans
- **Fantasy**: ilustración épica, paleta saturada, tipografía display fantasy
- **Cozy mystery**: ilustración cute, paleta pastel, tipografía handwritten
- **Literary**: minimalismo, paleta neutra, tipografía elegante
- **Sci-fi**: futurismo, paleta neon, tipografía geométrica
- **Memoir**: foto del autor, paleta sobria, tipografía serif clásica

Usuario edita: título, subtítulo, autor, color principal, ilustración base. La IA genera 6-8 variantes para elegir.

No reemplaza al diseñador profesional ($300-1.500 USD) pero le da algo digno al autor sin presupuesto.

### 7.3 Wraparound generator para print
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 5.5, 7.2

Una vez calculado el ancho del lomo, generar el template wraparound completo (frente + lomo + contracubierta) con bleed correcto. Incluye:

- ISBN barcode generado automáticamente (formato Bookland EAN-13)
- Espacio reservado para precio (decisión editorial)
- Sinopsis corta en contracubierta
- Logo de editorial (si aplica) o "Self-published"

Export como PDF/X-1a listo para mandar a IngramSpark o KDP Print.

---

## 8. ARC, beta readers y reseñas

### 8.1 Generación de ARC copies
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo

ARC = Advance Review Copy. Versión del libro distribuida antes del lanzamiento a reseñadores y beta readers.

**Características:**
- Marca de agua "ARC — Not for resale" en cada página
- Watermark personalizado por destinatario (`Property of Juan García`) — útil para rastrear leaks
- Fecha de expiración (algunos servicios la respetan)
- Sin link directo a la tienda para evitar ventas pirata

### 8.2 Tracking de beta readers / ARC readers
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo

Lista de personas a quienes se les envió:

- Nombre, email, plataforma de reseña preferida (Goodreads, Amazon, blog)
- Fecha de envío
- Fecha de expiración del ARC
- Estado: enviado / leído / reseñado / sin respuesta
- Recordatorios automáticos en intervalos configurables

### 8.3 Plantillas de email para pedir reseñas
**Impacto:** medio · **Esfuerzo:** XS · **Riesgo:** bajo

Plantillas pre-redactadas en español e inglés para:
- Pitch inicial al beta reader
- Recordatorio amable a la mitad del plazo
- Pedido de reseña post-lectura
- Agradecimiento post-publicación

### 8.4 Integración con BookFunnel / StoryOrigin
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** medio

Servicios estándar de la industria para distribuir ARCs. Tienen APIs públicas.

### 8.5 Tracker de reseñas post-publicación
**Impacto:** alto · **Esfuerzo:** L · **Riesgo:** medio

Scrapeo respetuoso (con TOS) de Amazon, Goodreads, Apple Books:

- Rating average actual
- Cantidad de reseñas
- Notificar reseñas nuevas
- Análisis de sentimiento sobre los textos
- Detección de palabras clave recurrentes en reseñas (positivas y negativas)

---

## 9. Audiobook

### 9.1 Script para narrador
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo

Mercado en explosión. Si tienes el manuscrito digital estructurado, generas:

- Cada diálogo etiquetado con personaje (`MARÍA: — ¿Y ahora qué?`)
- Instrucciones de tono opcionales (`[ansiosa]`, `[susurrando]`)
- Notas de pausa entre escenas
- Indicación de capítulo y track number

Export como PDF + carpeta de archivos lista para narrador o ACX (Audible).

### 9.2 Notas de pronunciación
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo

Especialmente útil en fantasía con nombres inventados.

```
Aelindra Vellathorne   →   /ai-LIN-dra ve-la-THORN/
Tezcatlipoca           →   /tes-kat-li-PO-ka/
```

Glosario fonético al inicio del script.

### 9.3 Resumen de personajes para narrador
**Impacto:** medio · **Esfuerzo:** XS · **Riesgo:** bajo

Antes de empezar la grabación, el narrador necesita saber: voz, edad, acento, personalidad de cada personaje. Generar automáticamente desde las fichas existentes.

### 9.4 Audiobook tracks por capítulo
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 5.3

Cada capítulo como un track con duración estimada y orden numerado.

---

## 10. Distribución directa

### 10.1 Integración con Draft2Digital
**Impacto:** muy alto · **Esfuerzo:** L · **Riesgo:** medio

D2D tiene API pública y desde una sola subida distribuye a:

- Apple Books
- Kobo
- Barnes & Noble
- Tolino (Alemania)
- Vivlio (Francia)
- Borrow Box (bibliotecas)
- Scribd
- Bibliotheca
- Hoopla
- Overdrive
- Y más

Una integración con D2D ahorra al escritor 12 subidas distintas.

### 10.2 KDP automation
**Impacto:** alto · **Esfuerzo:** XL · **Riesgo:** alto

Amazon KDP no tiene API pública abierta (solo partnership program restringido). Alternativas:

- Generar el archivo + metadatos perfectos y hacer **deep linking** a la pantalla de creación de KDP con los campos pre-rellenados
- Tutorial guiado paso a paso con screenshots de KDP en sus propias palabras
- En el largo plazo: aplicar al partnership program

### 10.3 Programación de release
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo

Calendario interno que respeta los plazos de cada plataforma:

- Amazon: pre-order requiere subir borrador 10 días antes
- IngramSpark: 6-8 semanas para distribución física global
- D2D: 24-72 horas a la mayoría de stores
- Apple Books: 24-48 horas

### 10.4 Newsletter integration
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo

Conectar con MailerLite, ConvertKit, Substack. Cuando el libro se publica, mandar email automático a lista del autor con link de afiliado de Amazon.

---

## 11. Marketing post-publicación

### 11.1 Generador de imágenes promocionales
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** bajo

Quote cards desde el manuscrito:

- Selector de fragmentos del libro
- Plantillas para Instagram (1:1, 4:5, stories), Twitter (16:9), Facebook
- Logo del libro y autor incluidos
- Watermark sutil

### 11.2 A/B testing de blurbs
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** bajo

Para autores con audiencia: probar dos sinopsis distintas en Amazon Ads o redes y trackear cuál convierte mejor.

### 11.3 Integración con Goodreads
**Impacto:** medio · **Esfuerzo:** L · **Riesgo:** medio

Crear el listing del libro, responder a reseñas, hacer giveaways automáticos.

---

## 12. Presets por género (lo que más diferencia)

### 12.1 Plantillas completas por género
**Impacto:** muy alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** todas las anteriores

Cada género tiene reglas tácitas de publicación. Un preset por género que pre-configura:

| Género | Palabras objetivo | Capítulos típicos | Beats narrativos | BISAC sugeridas | Cubierta |
|---|---|---|---|---|---|
| Romance contemporáneo | 70-90k | 25-35 (3-4k cada uno) | meet-cute, fight, dark moment, HEA | FIC027020 | personaje en primer plano, paleta cálida |
| Cozy mystery | 60-80k | 20-30 (2-3k) | crime, suspect intro, red herring, reveal | FIC022040 | ilustración cute, paleta pastel |
| Epic fantasy | 100-200k | 40-60 (varios POVs) | call to adventure, ordeals, climax | FIC009020 | ilustración épica, glosario, mapa |
| Thriller | 80-100k | 50-70 (1-2k cada uno) | hook fuerte, ticking clock, twists | FIC031000 | silueta urbana, paleta oscura |
| Literary | 60-90k | flexible | sin estructura clara, foco en prosa | FIC019000 | minimalismo |
| YA | 50-80k | 25-35 | coming-of-age beats | YAF | personaje protagonista visible |
| Memoir | 70-90k | flexible, cronológico o temático | arco transformacional | BIO026000 | foto del autor, paleta sobria |

Esto solo, ahorra al escritor primerizo dos meses de investigación de "cómo se publica en mi género".

### 12.2 Comparables y trends por género
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** 12.1

"Tu libro es de género X, libros similares son Y, Z, W publicados en los últimos 12 meses." Datos de Amazon Charts agregados por género y subgénero. Sirve para:

- Llenar el campo "Para fans de..." en sinopsis
- Categorizar correctamente (BISAC primarias y secundarias)
- Identificar tropes populares del momento

### 12.3 Trope detection
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** RAG

"Tu libro tiene los tropes: enemies-to-lovers, found family, slow burn. Los lectores que buscan estos tropes también buscan: fake dating, grumpy/sunshine, second chance." Estos tropes son **keywords clave para el algoritmo de Amazon en romance** y otros géneros.

---

## 13. Plan de implementación (4 fases)

### Fase 1 — Fundamentos de publicación (3-4 semanas)
*Sin esto, Péndola no es seria para autopublicar.*

- 1.1 Pipeline con perfiles (L)
- 1.2 EPUBCheck integrado (M)
- 2.1 Front matter / back matter como entidad (M)
- 2.2 Plantillas legales por país (S)
- 3.1 Smart quotes y glifos (S)
- 3.2 Diálogos en español con guion largo (S)
- 4.1 Sección publicación con metadatos (M)

### Fase 2 — Calidad editorial (3-4 semanas)
*Lo que diferencia un autor amateur de uno profesional.*

- 1.3 Pre-flight check (M)
- 3.5 Estilos por mercado (M)
- 4.2 Validación cruzada por plataforma (S)
- 5.1 Páginas según trim size (S)
- 5.2 Costo de impresión y royalty (S)
- 5.3 Duración audiobook (XS)
- 6.1 Detección de patrones profesionales (L)
- 6.2 Gramática y ortografía con IA (M)

### Fase 3 — Diferenciación (4-6 semanas)
*Lo que hace que un escritor elija Péndola sobre Scrivener / Vellum.*

- 7.1 Validador de specs de cubierta (S)
- 7.2 Generador de cubiertas con IA (L)
- 7.3 Wraparound generator (M)
- 9.1 Script de audiobook (M)
- 9.2 Notas de pronunciación (S)
- 12.1 Presets por género (M)
- 12.2 Comparables del momento (M)
- 2.3 Cross-promotion automático (S)

### Fase 4 — Ecosistema completo (variable)
*Pasa de herramienta a plataforma.*

- 8.1-8.5 ARC management completo (M+L)
- 10.1 Integración D2D (L)
- 10.3 Programación de release (S)
- 11.1 Imágenes promocionales (M)
- 11.3 Goodreads integration (L)
- 12.3 Trope detection con RAG (M)

---

## 14. Matriz de priorización (impacto × esfuerzo)

```
                    Esfuerzo →
                XS      S       M       L       XL
            ┌───────┬───────┬───────┬───────┬───────┐
  Muy alto  │ 5.3   │       │ 1.2   │ 1.1   │ 10.2  │
            │       │       │ 1.3   │ 6.1   │       │
            │       │       │ 4.1   │ 10.1  │       │
            │       │       │ 12.1  │       │       │
            ├───────┼───────┼───────┼───────┼───────┤
  Alto      │       │ 2.2   │ 2.1   │ 6.4   │ 8.5   │
            │       │ 2.3   │ 3.5   │ 7.2   │       │
            │       │ 3.1   │ 5.4   │       │       │
            │       │ 3.2   │ 6.2   │       │       │
            │       │ 4.2   │ 9.1   │       │       │
            │       │ 5.1   │ 12.2  │       │       │
            │       │ 5.2   │       │       │       │
            │       │ 7.1   │       │       │       │
            │       │ 8.1   │       │       │       │
            │       │ 8.2   │       │       │       │
            ├───────┼───────┼───────┼───────┼───────┤
  Medio     │ 8.3   │ 2.4   │ 6.3   │ 8.4   │       │
            │ 9.3   │ 3.3   │ 7.3   │ 11.3  │       │
            │       │ 5.5   │ 9.2   │       │       │
            │       │ 9.4   │ 11.1  │       │       │
            │       │ 10.4  │ 11.2  │       │       │
            │       │ 10.3  │ 12.3  │       │       │
            ├───────┼───────┼───────┼───────┼───────┤
  Bajo      │       │ 3.4   │       │       │       │
            └───────┴───────┴───────┴───────┴───────┘
```

**Empezar por:** 5.3 (XS muy alto), 3.1, 3.2, 5.1, 5.2 (S muy alto/alto). Una semana de trabajo y la app cambia categoría.

**Apuestas grandes:** 1.1 (pipeline de perfiles), 1.2 (EPUBCheck), 6.1 (análisis editorial), 12.1 (presets por género).

---

## 15. Decisiones de producto que vale la pena tomar antes

1. **¿Audiencia self-publishers o tradicional?**
   - Self → priorizar Amazon KDP + IngramSpark + D2D
   - Tradicional → priorizar Shunn manuscript format + queries a agentes
   - Probablemente quieras los dos, pero el orden importa.

2. **¿Mercado hispano, anglo o ambos?**
   - Hispano-only es nicho desatendido (Vellum y Atticus son anglo-first)
   - Anglo-only abre mercado 10× más grande pero compites con Vellum
   - Ambos requiere más esfuerzo en localización y reglas tipográficas

3. **¿Hasta dónde llega la integración con plataformas?**
   - Solo generar archivos perfectos → 80% del valor con 30% del esfuerzo
   - Integración API con D2D → +15% del valor con 30% más esfuerzo
   - Automation de KDP → +5% del valor con 40% más esfuerzo (y partnership program)

4. **¿Cubiertas en la app o solo validación?**
   - Solo validación → barato, neutro
   - Generador IA → diferenciador grande pero esfuerzo serio
   - Marketplace de diseñadores recomendados → modelo de negocio extra

5. **¿Modelo de negocio?**
   - Free + tier pago para "publishing pipeline" completo
   - Pay-per-export ($5 por export profesional, gratis los borradores)
   - Subscription ($15/mes con todo)
   - Cobro por royalty (1-2% de ventas, riesgoso)

---

## 16. Riesgos transversales

- **Mantener tablas de pricing actualizadas:** KDP cambia precios y royalties periódicamente. IngramSpark también. Si no se actualizan trimestralmente, el escritor recibe estimaciones malas.
- **EPUBCheck es complejo:** los falsos positivos pueden frustrar al usuario. Curar los mensajes con explicaciones legibles es trabajo continuo.
- **Tropes y keywords cambian rápido:** lo que era hot en romance hace 12 meses ya no lo es. Sin un proceso de actualización continua, las recomendaciones envejecen mal.
- **Legal por país:** las plantillas de copyright requieren asesoría legal real. No improvisar.
- **Distribución directa = soporte directo:** si Péndola sube algo a D2D y falla, el escritor te culpa a ti, no a D2D. Pensar bien el modelo de soporte antes de meterse a integraciones.
- **Calidad de detección automática:** un falso positivo en "adverbios excesivos" puede ofender al escritor literario que sabe lo que hace. Hacer todo configurable y opcional.

---

## 17. Lo que más diferencia a Péndola si esto se ejecuta

Hoy las opciones son:

- **Scrivener** ($55) — potente para escribir y planificar, débil en exportación a plataformas modernas
- **Vellum** ($250 Mac-only) — excelente en exportación pero solo formatea, no ayuda a escribir
- **Atticus** ($147 cross-platform) — copia de Vellum, compite directamente
- **Word** — existe pero no es serio para autopublicación
- **Reedsy Studio** — gratuito, online, decente, sin IA seria
- **Plottr** — para outlining, no editor

Si Péndola ejecuta este plan, su pitch es:

> "Lo único que necesitas para escribir y publicar tu libro. Desde la idea inicial hasta el archivo subido a Amazon, con IA contextual durante todo el proceso, validación profesional y formato editorial automático."

Eso no existe hoy. Es defendible.

---

*Fin del documento. Listo para discutir, recortar o priorizar.*
