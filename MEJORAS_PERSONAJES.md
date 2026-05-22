# Péndola — Mejoras del módulo de Personajes (tab Rasgos)

> Documento de análisis. No se ha modificado ningún archivo del proyecto.
> Fecha: 2026-05-07
> Alcance: pestaña **Rasgos** dentro de la ficha de personaje (`/proyecto/[id]/personaje/[pid]`), basado en screenshot del personaje "Mara Vela".

---

## 0. Diagnóstico

El sistema actual funciona pero **no es didáctico**. El escritor mueve sliders, ve un número y un nombre de arquetipo, pero no entiende del todo qué está haciendo ni por qué importa para su novela.

### Problemas observados

1. **Nombres de arquetipos abstractos sin contexto**: Amenaza, Santo, Insouciant, Estratega, Ermitaño, Pionero, Formalista, Bohemio. Algunos son intuitivos, otros opacos.
2. **"Insouciant" está en francés** — rompe la consistencia idiomática y genera ruido visual/cognitivo.
3. **Subtítulo repetido 4 veces**: "Desliza para definir la personalidad. El arquetipo se calcula automáticamente." Aparece en cada eje y no aporta nada.
4. **"promedio: 48" no comunica nada**: ¿48 sobre qué? ¿cuál es el umbral? ¿qué significa estar cerca del umbral?
5. **No hay conexión visible entre los rasgos y la narrativa**: el escritor termina moviendo sliders al azar hasta que el arquetipo coincide con lo que ya tenía en la cabeza, en vez de **descubrir** al personaje a través de la herramienta.
6. **No hay tooltips ni definiciones**: "Áspero", "Altivo", "Insouciant" son ambiguos sin explicación.
7. **Los 4 ejes están aislados**: no hay una visualización conjunta de la personalidad completa.
8. **No hay punto de partida sugerido**: el usuario arranca en 50/50/50 en todo, lo cual es la peor configuración posible (no comunica nada).
9. **No hay comparación con otros personajes** del proyecto.
10. **No hay evolución a lo largo del libro**: el personaje es estático.

### Tesis

La pestaña Rasgos debería ser una **herramienta de descubrimiento y guía de escritura**, no un formulario de configuración. Cuando el escritor termina de moverlos, debería entender mejor a su personaje, no solo haberlo etiquetado.

### Cómo leer este documento

Cada propuesta tiene:

- **Impacto**: bajo / medio / alto / muy alto
- **Esfuerzo**: XS (minutos) · S (horas) · M (día) · L (varios días)
- **Riesgo**: bajo / medio / alto

Y al final hay un plan de implementación en 3 sprints y matriz de priorización.

---

## 1. Cambios de copy e idioma (los más urgentes)

### 1.1 Traducir o reemplazar "Insouciant"
**Impacto:** alto · **Esfuerzo:** XS · **Riesgo:** bajo

Es el problema más visible. "Insouciant" en francés rompe la consistencia. Opciones de reemplazo:

- **Despreocupado** — traducción directa, clara
- **Espontáneo** — más positivo
- **Indolente** — más oscuro, sugiere apatía
- **Bohemio** — ya existe en otro eje (Boundary), evitar repetición

Mejor candidato: **Despreocupado** o **Espontáneo** según la intención del modelo Hurricane original. Definir cuál y propagar al type `ArchetypeEnergy` en `lib/types/index.ts`.

### 1.2 Reemplazar el subtítulo repetitivo por descripciones de eje
**Impacto:** alto · **Esfuerzo:** XS · **Riesgo:** bajo

Hoy se repite 4 veces: *"Desliza para definir la personalidad. El arquetipo se calcula automáticamente."*

Cada eje merece su propio header explicativo:

| Eje | Descripción didáctica propuesta |
|---|---|
| **Dirección moral** | El código ético del personaje. ¿Miente o es honesto? ¿Se cree superior o es modesto? ¿Trata con dureza o con cuidado? |
| **Energía vital** | Cómo se relaciona con el mundo. ¿Curioso o apático? ¿Detallista o caótico? ¿Calculador o impulsivo? |
| **Modo de actuar** | Cómo enfrenta los problemas. ¿Cede o resiste? ¿Se esconde o se expone? ¿Distante o vibrante? |
| **Modo de relacionarse** | Cómo siente y vincula. ¿Frío o sentimental? ¿Convencional o excéntrico? ¿Estoico o ansioso? |

Con esto el escritor entiende **qué está configurando** antes de mover el primer slider.

### 1.3 Renombrar "promedio: 48" por una explicación narrativa
**Impacto:** muy alto · **Esfuerzo:** S · **Riesgo:** bajo

Hoy: *"Arquetipo resultante: Amenaza (promedio: 48)"*

Esto es lenguaje de spreadsheet. Reemplazar por una descripción narrativa con niveles:

| Promedio | Etiqueta | Descripción |
|---|---|---|
| 0-19 | **Amenaza extrema** | Villano clásico. Actúa desde el lado oscuro sin ambigüedades. Ejemplos: Joffrey Baratheon, Hannibal Lecter. |
| 20-39 | **Amenaza marcada** | Antagonista claro o antihéroe en zona oscura. Calcula desde el conflicto. Ejemplos: Walter White, Cersei Lannister. |
| 40-49 | **Amenaza sutil** | Moralmente gris, inclinado al lado oscuro pero con vetas de luz. Ejemplos: Severus Snape, Tony Soprano. |
| 50-50 | **Ambivalente** | Personaje matizado, no calza en arquetipo. Útil para protagonistas complejos. |
| 51-60 | **Santo sutil** | Buen corazón con sombras. Comete errores pero busca el bien. Ejemplos: Jaime Lannister (tardío), Boromir. |
| 61-80 | **Santo marcado** | Héroe con principios claros. Ejemplos: Frodo Baggins, Hermione Granger. |
| 81-100 | **Santo extremo** | Héroe arquetípico, virtud sin grietas. Ejemplos: Atticus Finch, Aslan, Samwise Gamgee. |

Formato propuesto:

> **Mara Vela es una Amenaza sutil.**
> Está apenas inclinada al lado oscuro (48 de 50). Esto la hace ambigua: no es claramente villana pero tampoco actúa desde el bien. Personaje moralmente gris, ideal para antihéroes o antagonistas con motivaciones complejas.

Mismo tratamiento para los 4 ejes.

### 1.4 Microcopy más cálida en general
**Impacto:** bajo · **Esfuerzo:** XS · **Riesgo:** bajo

"Desliza para definir la personalidad" es seco. Variaciones más invitantes:

- "Mueve los marcadores y descubre quién es"
- "Cada extremo es una versión del personaje. ¿Hacia dónde se inclina?"
- "Define el alma del personaje moviendo los marcadores"

Pequeño pero suma.

---

## 2. Sistema de arquetipos enriquecido

### 2.1 Nombre + descripción + ejemplo por arquetipo
**Impacto:** muy alto · **Esfuerzo:** S · **Riesgo:** bajo

Cada uno de los 8 arquetipos (2 por eje × 4 ejes) debería tener:

- **Nombre** (claro, en español)
- **Tagline** (una línea que captura la esencia)
- **Descripción** (2-3 líneas con implicaciones narrativas)
- **3 ejemplos famosos** (literarios y/o cinematográficos reconocibles)

**Tabla completa propuesta:**

#### Dirección moral
| Arquetipo | Tagline | Descripción | Ejemplos |
|---|---|---|---|
| **Amenaza** | Actúa desde el conflicto y el deseo propio | Prioriza sus fines sobre la moral común. Manipula, miente o confronta cuando le conviene. Útil para villanos, antiheroes y antagonistas con peso. | Walter White, Cersei Lannister, Macbeth |
| **Santo** | Actúa desde la rectitud y el bien común | Su brújula moral guía sus decisiones aunque le perjudique. Confiable, transparente, abnegado. Útil para protagonistas heroicos, mentores morales. | Atticus Finch, Frodo Baggins, Aslan |

#### Energía vital
| Arquetipo | Tagline | Descripción | Ejemplos |
|---|---|---|---|
| **Despreocupado** | Vive el momento, no calcula | Espontáneo, impulsivo, encantador. Reacciona en vez de planificar. Útil para alivio cómico, catalizadores, agentes de caos. | Jack Sparrow, Holly Golightly, Tyler Durden |
| **Estratega** | Piensa antes de moverse | Planifica varios pasos. Frío para tomar decisiones difíciles. Útil para mentores, manipuladores inteligentes, generales. | Tyrion Lannister, Hermione Granger, Light Yagami |

#### Modo de actuar
| Arquetipo | Tagline | Descripción | Ejemplos |
|---|---|---|---|
| **Ermitaño** | Se retira, observa, prefiere la soledad | Introvertido, cauto, reservado. Su poder está en la observación. Útil para sabios, francotiradores emocionales, ascetas. | Sherlock Holmes, Yoda, Elsa |
| **Pionero** | Avanza, prueba, no se queda quieto | Extrovertido, valiente, exploratorio. Su poder está en la acción. Útil para héroes, líderes, aventureros. | Indiana Jones, Katniss Everdeen, Han Solo |

#### Modo de relacionarse
| Arquetipo | Tagline | Descripción | Ejemplos |
|---|---|---|---|
| **Formalista** | Sigue las reglas, respeta los códigos | Convencional, estoico, contenido. Su poder está en la disciplina. Útil para soldados, jueces, autoridad moral. | Captain America, Mr. Darcy, Stannis Baratheon |
| **Bohemio** | Rompe las reglas, vive intensamente | Excéntrico, sentimental, ansioso. Su poder está en la pasión. Útil para artistas, rebeldes, mártires románticos. | Holden Caulfield, Ofelia, Sylvia Plath |

Implementación: nuevo módulo `lib/personajes/archetypes.ts` con esta tabla. Reusable en tooltips, descripciones y prompts de IA.

### 2.2 Tooltip de información en cada arquetipo
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 2.1

Pasar el cursor sobre la pill ("Amenaza" o "Santo") abre un mini-popover con:

```
─────────────────────────
AMENAZA
"Actúa desde el conflicto y el deseo propio"

Personaje que prioriza sus fines sobre la moral
común. Manipula, miente o confronta cuando le conviene.

Útil para villanos, antiheroes y antagonistas con peso.

Ejemplos: Walter White, Cersei Lannister, Macbeth
─────────────────────────
```

Esto convierte el sistema en **didáctico al pasar el mouse**, sin saturar la UI.

### 2.3 Iconografía para cada arquetipo
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo

La pill negra activa contra outline ya distingue cuál está seleccionado. Sumar **iconos lucide** distintivos por arquetipo ayuda al reconocimiento rápido y a la identidad visual:

| Arquetipo | Icono sugerido |
|---|---|
| Amenaza | Skull / Flame / Dagger |
| Santo | Sun / Heart / Shield |
| Despreocupado | Wind / Cloud |
| Estratega | Brain / ChessKnight |
| Ermitaño | Mountain / Moon |
| Pionero | Compass / MapPin |
| Formalista | Scale / Lock |
| Bohemio | Palette / Sparkle |

---

## 3. Tooltips y definiciones de cada rasgo individual

### 3.1 Help icon en cada palabra extrema
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo

Cada extremo del slider necesita un mini-tooltip al hover (icono `?` discreto o el propio texto subrayado punteado). Hoy palabras como "Áspero", "Altivo", "Insouciant", "Estoico", "Convencional" pueden ser ambiguas.

**Banco completo de definiciones a documentar:**

#### Dirección moral
| Rasgo | Definición narrativa |
|---|---|
| Bribón | Personaje que miente, manipula o engaña para conseguir lo que quiere. No siente culpa por hacerlo. |
| Honesto | Dice la verdad incluso cuando le perjudica. Su palabra vale como contrato. |
| Altivo | Se cree superior. Mira hacia abajo. Suele despreciar a quienes considera inferiores. |
| Modesto | No se da importancia. Reconoce méritos ajenos. Se incomoda con elogios. |
| Áspero | Trata con dureza, sin filtros. Puede ser brusco, sarcástico o frío. |
| Gentil | Trata con cuidado, suaviza sus palabras. Empático con el efecto que causa en otros. |

#### Energía vital
| Rasgo | Definición narrativa |
|---|---|
| Apático | Le da igual lo que pase a su alrededor. No se involucra emocionalmente. |
| Inquisitivo | Pregunta, investiga, no se queda con lo aparente. Curiosidad como motor. |
| Descuidado | No se fija en los detalles. Improvisa, deja cabos sueltos. |
| Meticuloso | Cuida cada detalle. Planifica, revisa, anticipa. |
| Impulsivo | Actúa primero, piensa después. Reactivo, emocional. |
| Prudente | Piensa antes de actuar. Mide consecuencias. Cauto. |

#### Modo de actuar
| Rasgo | Definición narrativa |
|---|---|
| Terco | No cambia de opinión fácilmente. Se aferra a lo suyo aunque haya evidencia contraria. |
| Cooperativo | Trabaja con otros, cede para llegar a acuerdos. Equipo antes que ego. |
| Tímido | Se cohíbe en situaciones nuevas. Prefiere quedarse atrás. Costoso exponerse. |
| Audaz | Se lanza sin miedo aparente. Toma riesgos, se expone. |
| Distante | Mantiene a la gente lejos emocionalmente. Hermético. |
| Vibrante | Contagia energía. Su presencia se siente. Abierto. |

#### Modo de relacionarse
| Rasgo | Definición narrativa |
|---|---|
| Frío | No expresa emociones. Racional, contenido. |
| Sentimental | Vive las emociones intensamente. Llora, se conmueve, se emociona. |
| Convencional | Sigue las normas sociales. Hace lo esperado. |
| Excéntrico | Rompe las normas. Original, raro, único. |
| Estoico | Soporta el dolor sin quejarse. Aguanta. |
| Ansioso | Vive en estado de alerta. Se preocupa, anticipa lo peor. |

Estas definiciones son el cimiento del sistema. Sin ellas, el escritor adivina.

### 3.2 Valores numéricos con etiquetas cualitativas
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo

Hoy el slider muestra solo el número (44, 49, 51...). Añadir una etiqueta cualitativa según rango:

| Valor | Etiqueta |
|---|---|
| 0-15 | Extremadamente [rasgo izquierdo] |
| 16-35 | Marcadamente [rasgo izquierdo] |
| 36-49 | Levemente [rasgo izquierdo] |
| 50 | Equilibrado |
| 51-64 | Levemente [rasgo derecho] |
| 65-84 | Marcadamente [rasgo derecho] |
| 85-100 | Extremadamente [rasgo derecho] |

Ejemplo: en lugar de "Bribón ── 44 ── Honesto", mostrar:

```
Bribón ─────────●──── Honesto
        Levemente Bribón (44)
```

---

## 4. Visualización conjunta

### 4.1 Gráfica radial / rosa de los vientos
**Impacto:** muy alto · **Esfuerzo:** M · **Riesgo:** medio

Al inicio del tab Rasgos (antes de los 4 acordeones), una **gráfica radial** con los 4 promedios de cada eje en un solo diagrama. Es la "huella dactilar" del personaje.

Estructura visual:
- 4 ejes radiales (uno por dimensión)
- Cada eje va de 0 (centro) a 100 (perímetro)
- Punto en el valor actual del eje
- Polígono que conecta los 4 puntos
- Etiquetas: Dirección moral / Energía vital / Modo de actuar / Modo de relacionarse

Esto convierte 12 sliders dispersos en **una imagen única de la personalidad**. El escritor entiende al personaje en 2 segundos.

Librerías candidatas: `recharts` (no instalada) o componente custom con SVG, o `@xyflow/react` que ya está instalado (aunque es overkill).

### 4.2 Comparación visual entre personajes
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 4.1

Una vez existe la huella radial, permitir **superponer** la huella de otro personaje del mismo proyecto. Esto muestra al instante si dos personajes son similares o opuestos.

Ejemplo de utilidad:
- Si Mara y su antagonista tienen huellas casi idénticas, hay un problema de contraste
- Si los protagonistas y aliados son todos similares, faltan voces distintas en el elenco
- Si pareja romántica tiene huellas en espejo, hay tensión natural

Botón: **"Comparar con..."** abre selector de otros personajes.

### 4.3 Vista de elenco completo
**Impacto:** medio · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 4.1

En `/proyecto/[id]/personajes` (la lista general), mostrar **mini-huella** debajo del nombre de cada personaje en la grid. Permite ver al elenco entero como conjunto y detectar diversidad o falta de ella.

---

## 5. Contexto narrativo generado

### 5.1 Bloque "Implicaciones narrativas" al final del tab
**Impacto:** muy alto · **Esfuerzo:** M · **Riesgo:** medio

Esto es lo que transforma el sistema de **configuración** a **herramienta de escritura**.

Al final del tab Rasgos, un bloque generado por la IA con el contexto del personaje:

```
─────────────────────────────────────────────
IMPLICACIONES NARRATIVAS DE MARA VELA
─────────────────────────────────────────────

Mara es una Amenaza-Estratega-Pionero-Formalista.

📌 Tenderá a:
   • Resolver conflictos con manipulación o engaño
     antes que con confrontación abierta
   • Planificar varios pasos antes de actuar;
     rara vez impulsiva
   • Avanzar hacia lo nuevo; no se queda en
     zonas conocidas
   • Ocultar sus motivos reales bajo capas de
     cortesía y formalidad

⚔️ En escenas de tensión:
   Calcula, sondea, evita el choque frontal hasta
   que tiene ventaja. Mantiene la compostura
   incluso cuando hierve por dentro.

💬 Su voz tiende a ser:
   Cortés, mesurada, con doble sentido. Rara vez
   alza la voz. Su sarcasmo es elegante.

🎭 Roles que le calzan:
   • Antagonista de alto perfil
   • Villana POV con simpatía del lector
   • Antiheroína protagonista
   • Aliada que traiciona en el momento clave

⚠️ Ojo con:
   Su frialdad puede alejar al lector si no se
   le da una grieta emocional visible. Asegúrate
   de mostrar al menos una vulnerabilidad en
   los primeros 3 capítulos.
─────────────────────────────────────────────
```

Implementación: prompt a la IA (modo `revision` o nuevo modo `personaje`) con la combinación de arquetipos + valores extremos. Cachear el resultado contra hash de los rasgos para no regenerar en cada vista.

### 5.2 Sugerencias de diálogo y acción típicas
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** 5.1

Bloque adicional con ejemplos generados de cómo el personaje hablaría o reaccionaría:

```
EJEMPLOS DE DIÁLOGO TÍPICO
─────────────────────────

Ante una traición:
"Curioso. Me preguntaba cuándo te atreverías."

Ante un elogio:
"Si insistes en flores, al menos tráelas vivas."

Bajo presión:
"Una mano cada vez. Sin sudar."
```

Esto le da al escritor un **punto de referencia tangible** del tono del personaje antes de empezar a escribir sus escenas.

### 5.3 Detección de incoherencias entre rasgos y diálogo escrito
**Impacto:** medio · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** 5.1, RAG

Cuando el escritor está editando un capítulo, la IA puede detectar:

> ⚠️ El diálogo de Mara en este capítulo se ve más impulsivo que su perfil (Estratega 73). Mara tiende a calcular. ¿Es un momento intencional de pérdida de control, o conviene revisar?

Esto cierra el círculo: los rasgos no solo configuran, sino que **vigilan la consistencia narrativa**.

---

## 6. Onboarding y puntos de partida

### 6.1 Modo guiado por preguntas
**Impacto:** muy alto · **Esfuerzo:** M · **Riesgo:** bajo

Banner discreto: **"¿No sabes por dónde empezar? Crea el personaje con preguntas"**.

Wizard de 8-12 preguntas en lenguaje natural reemplaza temporalmente los sliders:

1. *Si tu personaje encuentra una billetera en la calle, ¿la devuelve o se la queda?*
2. *Cuando algo lo molesta, ¿lo dice de frente o lo guarda?*
3. *Frente a una decisión difícil, ¿planifica o se lanza?*
4. *En una fiesta llena de desconocidos, ¿se mezcla o busca la salida?*
5. *Si alguien lo desprecia, ¿responde con dureza o lo ignora?*
6. *¿Cree que las reglas existen para seguirlas o para romperlas?*
7. *Frente a su propio dolor, ¿lo aguanta en silencio o lo expresa?*
8. *En el trabajo, ¿es de los meticulosos o de los que improvisan?*
9. *Si tiene que mentir para proteger a alguien, ¿lo hace sin problema o le pesa?*
10. *Frente al éxito, ¿lo celebra abiertamente o lo minimiza?*

Cada respuesta mueve uno o más sliders detrás de escena. Al terminar, el escritor ve los resultados **y entiende el porqué** porque las preguntas son narrativas, no abstractas.

Esto es exactamente el patrón de los tests de personalidad serios (16Personalities, Enneagram, MBTI) y funciona porque **enseña mientras configura**.

### 6.2 Plantillas de arquetipo como punto de partida
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo

Botón **"Empezar desde un arquetipo"** con presets famosos:

| Plantilla | Configuración inicial |
|---|---|
| **Héroe clásico** | Santo alto, Estratega medio-alto, Pionero alto, Formalista medio |
| **Antihéroe** | Amenaza moderado, Estratega alto, Pionero medio, Bohemio |
| **Villano calculador** | Amenaza extremo, Estratega extremo, Ermitaño, Formalista |
| **Villano caótico** | Amenaza extremo, Despreocupado, Pionero, Bohemio extremo |
| **Mentor sabio** | Santo, Estratega, Ermitaño, Formalista |
| **Trickster** | Ambivalente moral, Despreocupado, Pionero, Bohemio |
| **Comic relief** | Santo medio, Despreocupado extremo, Pionero, Bohemio |
| **Aliado leal** | Santo, Estratega medio, Pionero, Formalista |
| **Femme/Homme fatale** | Amenaza, Estratega, Pionero, Bohemio |
| **Mártir romántico** | Santo, Despreocupado/Estratega medio, Pionero, Bohemio extremo |

El escritor parte de un punto reconocible y ajusta desde ahí. Mucho menos fricción que empezar desde 50/50/50.

---

## 7. Evolución del personaje

### 7.1 Arco de personaje a lo largo del libro
**Impacto:** alto · **Esfuerzo:** L · **Riesgo:** medio

Permitir que el personaje **evolucione** entre capítulos. Marcar configuración inicial (capítulo 1) vs final (capítulo N), opcionalmente con waypoints intermedios.

Estructura propuesta:

```
Mara Vela — Arco de personaje

Capítulo 1   ▶ Amenaza-Estratega-Ermitaño-Formalista
Capítulo 15  ▶ Amenaza-Estratega-Pionero-Bohemio (punto de quiebre)
Capítulo 30  ▶ Santo-Estratega-Pionero-Bohemio (redención)
```

La IA puede entonces:
- Ajustar el comportamiento del personaje en cada capítulo según su estado actual
- Detectar inconsistencias ("en el cap 8 Mara actúa como ya hubiera cambiado, pero su arco dice que el cambio es en el cap 15")
- Sugerir escenas pivote para hacer creíble la transición

Muy útil para **arcos de redención**, **caídas trágicas**, **coming-of-age**.

### 7.2 Pre-sets de arcos narrativos comunes
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 7.1

Arcos clásicos como plantillas:
- **Redención**: empieza Amenaza, termina Santo
- **Caída**: empieza Santo, termina Amenaza
- **Endurecimiento**: pierde Bohemio/Sentimental, gana Formalista/Estoico
- **Apertura**: pierde Ermitaño, gana Pionero
- **Maduración**: pierde Despreocupado/Impulsivo, gana Estratega/Prudente

Cada arco modifica los waypoints automáticamente.

---

## 8. Diversidad del elenco

### 8.1 Análisis de balance del elenco
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** bajo · **Depende de:** 4.1

Banner sutil en la lista de personajes o al final del tab Rasgos:

```
Tu elenco actual: 6 personajes
├── 4 Amenazas, 2 Santos
├── 5 Estrategas, 1 Despreocupado
├── 4 Pioneros, 2 Ermitaños
└── 5 Formalistas, 1 Bohemio

⚠️ Tu elenco es predominantemente Amenaza-Estratega-
   Formalista. Los diálogos pueden sentirse uniformes
   en tono. Considera añadir un personaje Despreocupado
   o Bohemio para crear contraste natural.
```

Esto solo es invaluable para escritores primerizos que sin querer crean elencos homogéneos.

### 8.2 Detección de "personajes gemelos"
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 4.1

Si dos personajes tienen huellas radiales casi idénticas, advertir:

> ⚠️ Mara y Helena tienen perfiles muy similares (96% de overlap). Considera diferenciarlas más o fusionarlas en un solo personaje.

Patrón común en primeras novelas: el autor crea 5 personajes pero todos son variaciones de sí mismo.

---

## 9. Mejoras de UX/UI específicas

### 9.1 Slider con marcador central visible
**Impacto:** medio · **Esfuerzo:** XS · **Riesgo:** bajo

Hoy el slider es liso 0-100. Añadir una marca visual en 50 (centro neutro) ayuda al escritor a entender dónde está el punto medio.

### 9.2 Fondo del slider con gradiente sutil
**Impacto:** bajo · **Esfuerzo:** XS · **Riesgo:** bajo

El track del slider podría tener un gradiente muy sutil que cambie de un color a otro entre extremos (sin saturar). Refuerza visualmente que cada lado es una "personalidad" distinta.

### 9.3 Animación al cambiar arquetipo
**Impacto:** bajo · **Esfuerzo:** S · **Riesgo:** bajo

Cuando el promedio cruza el umbral 50 y el arquetipo flip de un lado al otro, una transición suave (200-300ms) en la pill activa. Pequeño detalle de polish que comunica "algo importante cambió".

### 9.4 Indicador visual del rango ambivalente
**Impacto:** medio · **Esfuerzo:** S · **Riesgo:** bajo

Cuando los promedios están en 45-55 (zona gris), mostrar explícitamente:

> 🌗 Personaje ambivalente en este eje. No calza claramente en ningún arquetipo. Útil para protagonistas complejos.

En lugar de forzar un arquetipo cuando realmente está en el medio.

### 9.5 Reset y aleatorización
**Impacto:** bajo · **Esfuerzo:** XS · **Riesgo:** bajo

Botones pequeños al final del tab:
- **Reset** — vuelve todo a 50/50/50
- **Sorprende** — aleatoriza dentro de combinaciones coherentes (no totalmente random)

El segundo es útil para personajes secundarios o para sacar al escritor de su zona de confort.

---

## 10. Integración con el flujo de escritura

### 10.1 Resumen del personaje en el panel de IA
**Impacto:** alto · **Esfuerzo:** S · **Riesgo:** bajo · **Depende de:** 5.1

Cuando el escritor está en el editor y trabaja con un personaje (entity-mention, ver `lib/editor/entity-mention.ts`), el panel de IA debería tener acceso al **resumen narrativo** del personaje (5.1), no solo a sus rasgos numéricos. Esto mejora drásticamente la calidad del texto generado.

### 10.2 Comando rápido "/personaje habla"
**Impacto:** alto · **Esfuerzo:** M · **Riesgo:** medio · **Depende de:** 5.2

Dentro del editor, comando slash: `/Mara dice ...` genera diálogo en el tono específico del personaje basado en sus rasgos. Ya hay un sistema de menciones (`entity-mention.ts`), extenderlo con acción.

### 10.3 Auditoría de coherencia post-capítulo
**Impacto:** alto · **Esfuerzo:** L · **Riesgo:** medio · **Depende de:** 5.1, RAG

Al cerrar un capítulo, la IA analiza:

> En este capítulo:
> - Mara aparece en 3 escenas
> - 2 escenas son coherentes con su perfil (Amenaza-Estratega-Formalista)
> - 1 escena la muestra impulsiva y emocional → revisar o justificar narrativamente

Cierra el ciclo: rasgos configuran, escritura ocurre, sistema verifica.

---

## 11. Plan de implementación (3 sprints)

### Sprint 1 — Fixes urgentes de copy (1-2 días)
*Cambios de texto sin lógica nueva. Riesgo cero, impacto perceptual alto.*

- [ ] 1.1 Traducir "Insouciant" (XS)
- [ ] 1.2 Headers explicativos por eje (XS)
- [ ] 1.3 Renombrar "promedio: 48" a explicación narrativa con niveles (S)
- [ ] 1.4 Microcopy más cálida (XS)
- [ ] 9.1 Marcador central visible en slider (XS)
- [ ] 9.4 Indicador de rango ambivalente (S)

### Sprint 2 — Sistema didáctico (1 semana)
*Convertir el sistema en herramienta de aprendizaje.*

- [ ] 2.1 Tabla completa de arquetipos con descripción + ejemplos (S)
- [ ] 2.2 Tooltips en pills de arquetipo (S)
- [ ] 2.3 Iconografía por arquetipo (S)
- [ ] 3.1 Definiciones narrativas de cada rasgo con tooltip (S)
- [ ] 3.2 Etiquetas cualitativas en valores numéricos (S)
- [ ] 6.2 Plantillas de arquetipo como punto de partida (S)

### Sprint 3 — Visualización e integración narrativa (2 semanas)
*Lo que transforma el sistema en herramienta de escritura.*

- [ ] 4.1 Gráfica radial / rosa de los vientos (M)
- [ ] 4.2 Comparación visual entre personajes (M)
- [ ] 5.1 Bloque "Implicaciones narrativas" generado por IA (M)
- [ ] 5.2 Ejemplos de diálogo típico (M)
- [ ] 6.1 Modo guiado por preguntas (M)
- [ ] 8.1 Análisis de balance del elenco (M)
- [ ] 10.1 Integración con panel de IA (S)

### Sprint 4 (opcional avanzado) — Evolución y auditoría
*Funcionalidades más ambiciosas que dependen de RAG (ver MEJORAS_PROPUESTAS.md 2.1).*

- [ ] 5.3 Detección de incoherencias entre rasgos y diálogo (L)
- [ ] 7.1 Arco de personaje a lo largo del libro (L)
- [ ] 7.2 Pre-sets de arcos narrativos (S)
- [ ] 10.2 Comando "/personaje habla" (M)
- [ ] 10.3 Auditoría de coherencia post-capítulo (L)

---

## 12. Matriz de priorización (impacto × esfuerzo)

```
                    Esfuerzo →
                XS      S       M       L
            ┌───────┬───────┬───────┬───────┐
  Muy alto  │ 1.2   │ 1.3   │ 4.1   │       │
            │       │       │ 5.1   │       │
            │       │       │ 6.1   │       │
            ├───────┼───────┼───────┼───────┤
  Alto      │ 1.1   │ 2.1   │ 4.2   │ 5.3   │
            │       │ 2.2   │ 5.2   │ 7.1   │
            │       │ 3.1   │ 8.1   │ 10.3  │
            │       │ 6.2   │ 10.2  │       │
            │       │ 10.1  │       │       │
            ├───────┼───────┼───────┼───────┤
  Medio     │ 9.1   │ 2.3   │ 4.3   │       │
            │       │ 3.2   │       │       │
            │       │ 7.2   │       │       │
            │       │ 8.2   │       │       │
            │       │ 9.4   │       │       │
            ├───────┼───────┼───────┼───────┤
  Bajo      │ 1.4   │ 9.3   │       │       │
            │ 9.2   │       │       │       │
            │ 9.5   │       │       │       │
            └───────┴───────┴───────┴───────┘
```

**Quick wins (XS-S con impacto alto/muy alto):** 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 6.2, 10.1. Una semana de trabajo y la pestaña Rasgos pasa de "formulario abstracto" a "herramienta literaria didáctica".

**Apuestas grandes (M con impacto muy alto):** 4.1, 5.1, 6.1. Son las que convierten el sistema en diferenciador real frente a Scrivener, Plottr, World Anvil.

---

## 13. Top 4 si solo puedes hacer 4 cosas

1. **Traducir "Insouciant" + headers por eje + reemplazar "promedio: 48" por explicación narrativa** (1.1 + 1.2 + 1.3) — el sistema se vuelve legible.
2. **Tooltips con descripción + ejemplos en cada arquetipo** (2.1 + 2.2) — el sistema se vuelve didáctico.
3. **Bloque "Implicaciones narrativas" generado por IA** (5.1) — el sistema se vuelve útil para escribir.
4. **Modo guiado por preguntas** (6.1) — el sistema baja la barrera de entrada para escritores nuevos.

Esos 4 cambios solos transforman radicalmente la experiencia. Todo lo demás es valor adicional pero esos cuatro son el core del rediseño didáctico.

---

## 14. Decisiones de producto que vale la pena tomar antes

1. **¿"Insouciant" se traduce a Despreocupado, Espontáneo o Indolente?** Cambia el matiz semántico del arquetipo.
2. **¿Los ejemplos famosos son universales (Walter White, Cersei) o se adaptan al público hispano (con Quijote, Soledad de los Buendía, Cien Años de Soledad)?** Probablemente mejor mixto.
3. **¿El bloque "Implicaciones narrativas" se genera con IA o con templates?** IA es más rico pero consume tokens. Templates son determinísticos.
4. **¿Las plantillas de arquetipo (6.2) son fijas o el usuario puede crear las suyas?** Empezar con fijas, abrir más adelante.
5. **¿El arco de personaje (7.1) es feature core o avanzada?** Feature avanzada que se desbloquea cuando el usuario muestra dominio del sistema básico.

---

## 15. Riesgos transversales

- **Saturación de información**: añadir tooltips, descripciones, ejemplos y bloques narrativos puede ahogar la UI. Importante aplicar progressive disclosure: lo esencial visible, lo profundo a un click.
- **Modelo Hurricane vs invención propia**: si los arquetipos tienen base teórica conocida (Big Five, MBTI, Enneagram, Hurricane), citarla. Si es propia, asumir su autoría con confianza.
- **Sesgo cultural en ejemplos**: los personajes famosos elegidos transmiten una visión del mundo. Asegurar diversidad de género, época y origen cultural en los ejemplos.
- **IA generando "Implicaciones" muy genéricas**: el prompt necesita iteración fuerte para que las descripciones sean específicas a la combinación exacta de rasgos y no aplicables a cualquier personaje.
- **Compatibilidad con datos existentes**: cualquier cambio en `lib/types/index.ts` (renombrar arquetipos, añadir campos) requiere migración de personajes ya creados por usuarios.

---

*Fin del documento. Listo para discutir, recortar o priorizar.*
