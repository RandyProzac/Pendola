import type { Character, CharacterArchetypes, CharacterTraits } from "@/lib/types";

export type TraitAxis = keyof CharacterTraits;

export interface TraitPoleMeta {
  label: string;
  description: string;
}

export interface TraitSliderMeta {
  key: string;
  left: TraitPoleMeta;
  right: TraitPoleMeta;
}

export interface ArchetypeMeta {
  name: string;
  tagline: string;
  description: string;
  examples: string[];
}

export interface TraitAxisMeta {
  title: string;
  description: string;
  ambivalentHint: string;
  leftArchetype: ArchetypeMeta;
  rightArchetype: ArchetypeMeta;
  sliders: TraitSliderMeta[];
  narrative: {
    leftLean: string;
    rightLean: string;
    ambivalent: string;
  };
}

export interface AxisNarrativeSummary {
  average: number;
  dominantArchetype: string;
  intensityLabel: string;
  isAmbivalent: boolean;
  headline: string;
  summary: string;
}

const LEFT_EXTREME_MAX = 19;
const LEFT_MARKED_MAX = 39;
const LEFT_SUBTLE_MAX = 44;
const AMBIVALENT_MAX = 55;
const RIGHT_SUBTLE_MAX = 60;
const RIGHT_MARKED_MAX = 80;

export const TRAIT_AXIS_META: Record<TraitAxis, TraitAxisMeta> = {
  direction: {
    title: "Dirección moral",
    description:
      "El código ético del personaje. Aquí defines si actúa desde la rectitud, la soberbia, la astucia o el cuidado hacia otros.",
    ambivalentHint:
      "Está en la zona gris de su moral: puede sostener actos nobles y cuestionables sin encajar del todo en un extremo.",
    leftArchetype: {
      name: "Amenaza",
      tagline: "Actúa desde el conflicto y el deseo propio",
      description:
        "Prioriza sus fines sobre la moral común. Manipula, miente o confronta cuando le conviene.",
      examples: ["Walter White", "Cersei Lannister", "Macbeth"],
    },
    rightArchetype: {
      name: "Santo",
      tagline: "Actúa desde la rectitud y el bien común",
      description:
        "Su brújula moral guía sus decisiones incluso cuando eso le cuesta algo importante.",
      examples: ["Atticus Finch", "Frodo Baggins", "Aslan"],
    },
    sliders: [
      {
        key: "knavish_honest",
        left: {
          label: "Bribón",
          description:
            "Miente, manipula o engaña para conseguir lo que quiere y rara vez siente culpa por ello.",
        },
        right: {
          label: "Honesto",
          description:
            "Dice la verdad incluso cuando le perjudica. Su palabra pesa como un compromiso real.",
        },
      },
      {
        key: "haughty_modest",
        left: {
          label: "Altivo",
          description:
            "Se cree superior, mira desde arriba y suele despreciar a quien considera menos valioso.",
        },
        right: {
          label: "Modesto",
          description:
            "No se da demasiada importancia, reconoce méritos ajenos y no necesita imponerse.",
        },
      },
      {
        key: "harsh_gentle",
        left: {
          label: "Áspero",
          description:
            "Trata con dureza, sin filtros ni demasiada preocupación por el impacto emocional en otros.",
        },
        right: {
          label: "Gentil",
          description:
            "Trata con cuidado, suaviza sus palabras y percibe el efecto que provoca en los demás.",
        },
      },
    ],
    narrative: {
      leftLean:
        "Tiende a priorizar sus fines sobre la moral compartida y eso lo acerca a un rol antagónico o antiheroico.",
      rightLean:
        "Tiende a decidir desde principios claros, sacrificio o sentido del bien común.",
      ambivalent:
        "Funciona bien para protagonistas complejos, figuras ambiguas o personajes que todavía no terminan de definirse moralmente.",
    },
  },
  energy: {
    title: "Energía vital",
    description:
      "Cómo se relaciona con el mundo. Aquí defines si observa con curiosidad, improvisa, calcula o se deja llevar por el momento.",
    ambivalentHint:
      "Oscila entre la espontaneidad y el cálculo. Puede reaccionar por impulso en unas escenas y planificar con mucha precisión en otras.",
    leftArchetype: {
      name: "Despreocupado",
      tagline: "Vive el momento, no calcula demasiado",
      description:
        "Espontáneo, impulsivo y reactivo. Suele resolver desde el movimiento y no desde el plan.",
      examples: ["Jack Sparrow", "Holly Golightly", "Tyler Durden"],
    },
    rightArchetype: {
      name: "Estratega",
      tagline: "Piensa antes de moverse",
      description:
        "Planifica, mide consecuencias y puede mantener la cabeza fría ante decisiones difíciles.",
      examples: ["Tyrion Lannister", "Hermione Granger", "Light Yagami"],
    },
    sliders: [
      {
        key: "apathetic_inquisitive",
        left: {
          label: "Apático",
          description:
            "Le cuesta involucrarse. Parece desconectado de lo que ocurre a su alrededor.",
        },
        right: {
          label: "Inquisitivo",
          description:
            "Pregunta, investiga y no se conforma con la primera explicación. La curiosidad lo mueve.",
        },
      },
      {
        key: "sloppy_meticulous",
        left: {
          label: "Descuidado",
          description:
            "Improvisa, deja cabos sueltos y no presta demasiada atención a los detalles.",
        },
        right: {
          label: "Meticuloso",
          description:
            "Cuida cada detalle, revisa, ordena y anticipa lo que podría salir mal.",
        },
      },
      {
        key: "impulsive_prudent",
        left: {
          label: "Impulsivo",
          description:
            "Actúa primero y procesa después. Reacciona con velocidad y emocionalidad.",
        },
        right: {
          label: "Prudente",
          description:
            "Piensa antes de actuar, mide consecuencias y busca margen de seguridad.",
        },
      },
    ],
    narrative: {
      leftLean:
        "Se mueve por intuición, impulso o deseo inmediato, lo que da energía caótica o encanto impredecible.",
      rightLean:
        "Lee el tablero antes de actuar, administra mejor la tensión y suele pensar varios pasos por delante.",
      ambivalent:
        "Puede sorprender porque no siempre responde con el mismo ritmo interno: a veces improvisa y a veces calcula.",
    },
  },
  process: {
    title: "Modo de actuar",
    description:
      "Cómo enfrenta los problemas. Aquí defines si cede o resiste, si se expone o se repliega, y con cuánta presencia atraviesa el conflicto.",
    ambivalentHint:
      "No cae del todo en la retirada ni en la conquista. Puede observar mucho antes de actuar, pero aún así irrumpir cuando algo lo fuerza.",
    leftArchetype: {
      name: "Ermitaño",
      tagline: "Se retira, observa y protege su distancia",
      description:
        "Reservado, cauteloso e introspectivo. Su fuerza aparece más en la observación que en la exhibición.",
      examples: ["Sherlock Holmes", "Yoda", "Elsa"],
    },
    rightArchetype: {
      name: "Pionero",
      tagline: "Avanza, prueba y no se queda quieto",
      description:
        "Extrovertido, valiente y exploratorio. Aprende haciendo y se orienta hacia la acción.",
      examples: ["Indiana Jones", "Katniss Everdeen", "Han Solo"],
    },
    sliders: [
      {
        key: "stubborn_cooperative",
        left: {
          label: "Terco",
          description:
            "Se aferra a su postura y le cuesta ceder aunque haya evidencia o presión externa.",
        },
        right: {
          label: "Cooperativo",
          description:
            "Trabaja con otros, busca acuerdos y puede ceder para cuidar un objetivo compartido.",
        },
      },
      {
        key: "shy_bold",
        left: {
          label: "Tímido",
          description:
            "Se cohíbe, evita exponerse y suele quedarse atrás cuando una situación lo intimida.",
        },
        right: {
          label: "Audaz",
          description:
            "Se lanza, toma iniciativa y soporta mejor el riesgo de quedar expuesto.",
        },
      },
      {
        key: "aloof_spirited",
        left: {
          label: "Distante",
          description:
            "Conserva distancia emocional o expresiva. Se siente menos expansivo en presencia de otros.",
        },
        right: {
          label: "Vivaz",
          description:
            "Transmite energía, entusiasmo y presencia. Se nota cuando entra en escena.",
        },
      },
    ],
    narrative: {
      leftLean:
        "Tiende a protegerse, observar y dosificar su presencia antes de tomar partido.",
      rightLean:
        "Tiende a avanzar, exponerse y abrir camino incluso cuando no todo está resuelto.",
      ambivalent:
        "Puede alternar entre la cautela y el arrojo, lo que da matices muy útiles para escenas de presión.",
    },
  },
  boundary: {
    title: "Modo de relacionarse",
    description:
      "Cómo siente y vincula. Aquí defines si se protege con disciplina, se entrega con intensidad o fluctúa entre ambas cosas.",
    ambivalentHint:
      "Su forma de vincularse no es estable: por momentos se cierra y por momentos se desborda.",
    leftArchetype: {
      name: "Formalista",
      tagline: "Sigue reglas, códigos y límites claros",
      description:
        "Convencional, contenido y disciplinado. Suele regularse a través del orden y la compostura.",
      examples: ["Captain America", "Mr. Darcy", "Stannis Baratheon"],
    },
    rightArchetype: {
      name: "Bohemio",
      tagline: "Rompe reglas y vive con intensidad",
      description:
        "Excéntrico, apasionado y emocionalmente expuesto. Se relaciona desde la intensidad más que desde el control.",
      examples: ["Holden Caulfield", "Ofelia", "Sylvia Plath"],
    },
    sliders: [
      {
        key: "detached_sentimental",
        left: {
          label: "Desapegado",
          description:
            "Protege su mundo afectivo manteniendo distancia. Le cuesta mostrarse vulnerable.",
        },
        right: {
          label: "Sentimental",
          description:
            "Vive el vinculo con intensidad emocional y le cuesta separar decision y afecto.",
        },
      },
      {
        key: "conventional_eccentric",
        left: {
          label: "Convencional",
          description:
            "Respeta codigos conocidos, formas esperables y estructuras sociales compartidas.",
        },
        right: {
          label: "Excéntrico",
          description:
            "Se sale de la norma, incomoda o sorprende porque no se somete fácilmente a los moldes.",
        },
      },
      {
        key: "stoic_anxious",
        left: {
          label: "Estoico",
          description:
            "Contiene el desborde, tolera mejor la incomodidad y da una imagen de control o temple.",
        },
        right: {
          label: "Ansioso",
          description:
            "Procesa la tensión con inquietud visible y le cuesta sostener el control interno por mucho tiempo.",
        },
      },
    ],
    narrative: {
      leftLean:
        "Tiende a relacionarse desde el control, la disciplina y los códigos que lo contienen.",
      rightLean:
        "Tiende a vincularse desde la intensidad, la emoción y una expresividad menos domesticada.",
      ambivalent:
        "Puede ser muy rico para personajes que desean cercanía pero temen perder el control al vincularse.",
    },
  },
};

export const CHARACTER_TRAIT_AXES = Object.keys(
  TRAIT_AXIS_META
) as TraitAxis[];

export function getAxisAverage(traits: CharacterTraits, axis: TraitAxis) {
  const values = Object.values(traits[axis]);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function deriveCharacterArchetypes(
  traits: CharacterTraits
): CharacterArchetypes {
  return {
    direction: getAxisAverage(traits, "direction") > 50 ? "Santo" : "Amenaza",
    energy:
      getAxisAverage(traits, "energy") > 50
        ? "Estratega"
        : "Despreocupado",
    process: getAxisAverage(traits, "process") > 50 ? "Pionero" : "Ermitaño",
    boundary:
      getAxisAverage(traits, "boundary") > 50 ? "Bohemio" : "Formalista",
  };
}

export function normalizeCharacterArchetypes(
  archetypes: Partial<CharacterArchetypes> | undefined,
  traits: CharacterTraits
): CharacterArchetypes {
  const derived = deriveCharacterArchetypes(traits);
  const legacyEnergy = (archetypes as { energy?: string } | undefined)?.energy;

  return {
    direction:
      archetypes?.direction === "Amenaza" || archetypes?.direction === "Santo"
        ? archetypes.direction
        : derived.direction,
    energy:
      legacyEnergy === "Estratega"
        ? "Estratega"
        : legacyEnergy === "Despreocupado" || legacyEnergy === "Insouciant"
          ? "Despreocupado"
          : derived.energy,
    process:
      archetypes?.process === "Ermitaño" || archetypes?.process === "Pionero"
        ? archetypes.process
        : derived.process,
    boundary:
      archetypes?.boundary === "Formalista" ||
      archetypes?.boundary === "Bohemio"
        ? archetypes.boundary
        : derived.boundary,
  };
}

export function normalizeCharacterRecord(character: Character): Character {
  return {
    ...character,
    archetypes: normalizeCharacterArchetypes(
      character.archetypes,
      character.traits
    ),
  };
}

function getIntensityLabel(average: number) {
  if (average <= LEFT_EXTREME_MAX || average > RIGHT_MARKED_MAX) {
    return "muy definida";
  }
  if (average <= LEFT_MARKED_MAX || average > RIGHT_SUBTLE_MAX) {
    return "marcada";
  }
  return "sutil";
}

export function isAmbivalentAverage(average: number) {
  return average >= LEFT_SUBTLE_MAX + 1 && average <= AMBIVALENT_MAX;
}

export function buildAxisNarrativeSummary(
  axis: TraitAxis,
  average: number,
  characterName?: string
): AxisNarrativeSummary {
  const meta = TRAIT_AXIS_META[axis];
  const roundedAverage = Math.round(average);
  const subject = characterName || "Este personaje";

  if (isAmbivalentAverage(roundedAverage)) {
    return {
      average: roundedAverage,
      dominantArchetype:
        roundedAverage > 50
          ? meta.rightArchetype.name
          : meta.leftArchetype.name,
      intensityLabel: "ambivalente",
      isAmbivalent: true,
      headline: "Zona ambivalente",
      summary: `${subject} permanece en una zona ambivalente de este eje (${roundedAverage}/100). ${meta.ambivalentHint} ${meta.narrative.ambivalent}`,
    };
  }

  const leansRight = roundedAverage > 50;
  const dominantArchetype = leansRight
    ? meta.rightArchetype.name
    : meta.leftArchetype.name;
  const intensityLabel = getIntensityLabel(roundedAverage);
  const summaryBody = leansRight ? meta.narrative.rightLean : meta.narrative.leftLean;

  return {
    average: roundedAverage,
    dominantArchetype,
    intensityLabel,
    isAmbivalent: false,
    headline: `${dominantArchetype} · inclinación ${intensityLabel}`,
    summary: `${subject} se inclina de forma ${intensityLabel} hacia ${dominantArchetype.toLowerCase()} (${roundedAverage}/100). ${summaryBody}`,
  };
}

export function buildCharacterTraitSummary(character: Character) {
  const axisSummaries = CHARACTER_TRAIT_AXES.map((axis) =>
    buildAxisNarrativeSummary(axis, getAxisAverage(character.traits, axis), character.name)
  );

  return axisSummaries
    .map((summary, index) => {
      const axis = CHARACTER_TRAIT_AXES[index];
      return `${TRAIT_AXIS_META[axis].title}: ${summary.headline}. ${summary.summary}`;
    })
    .join(" ");
}
