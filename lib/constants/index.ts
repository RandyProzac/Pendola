export const SCENARIO_TYPES = [
  {
    value: "interior",
    label: "Interior",
    description: "Espacios cerrados, domésticos o contenidos.",
  },
  {
    value: "exterior",
    label: "Exterior",
    description: "Espacios abiertos expuestos al clima y al entorno.",
  },
  {
    value: "fantastico",
    label: "Fantástico",
    description: "Lugares con reglas extraordinarias, mágicas o irreales.",
  },
  {
    value: "urbano",
    label: "Urbano",
    description: "Ciudades, barrios, infraestructuras y vida metropolitana.",
  },
  {
    value: "natural",
    label: "Natural",
    description: "Paisajes, bosques, montañas, mares y entornos orgánicos.",
  },
  {
    value: "otro",
    label: "Otro",
    description: "Escenarios híbridos o difíciles de clasificar.",
  },
] as const;

export const MOTIVATION_FIELDS = [
  {
    key: "drive",
    label: "Impulso",
    description: "La fuerza profunda que empuja al personaje a actuar.",
    placeholder: "¿Qué lo mueve incluso cuando no quiere admitirlo?",
  },
  {
    key: "wish",
    label: "Deseo",
    description: "Lo que cree querer de forma consciente.",
    placeholder: "¿Qué quiere conseguir, proteger o alcanzar?",
  },
  {
    key: "void",
    label: "Vacío",
    description: "La carencia interna que intenta llenar.",
    placeholder: "¿Qué falta emocional o existencial carga dentro?",
  },
  {
    key: "vice",
    label: "Falla",
    description: "El defecto que distorsiona su conducta o sus decisiones.",
    placeholder: "¿Qué vicio, debilidad o patrón autodestructivo lo sabotea?",
  },
  {
    key: "origin",
    label: "Origen",
    description: "El hecho o herida que explica su forma de mirar el mundo.",
    placeholder: "¿Qué evento, crianza o pasado dejó esta marca?",
  },
  {
    key: "persona",
    label: "Máscara",
    description: "La identidad que muestra para sobrevivir o ser aceptado.",
    placeholder: "¿Qué fachada presenta ante los demás?",
  },
  {
    key: "expedition",
    label: "Transformación",
    description: "La evolución posible que su arco promete o amenaza.",
    placeholder: "¿En qué podría convertirse si atraviesa su conflicto?",
  },
] as const;

export const ATTRIBUTE_LABELS = {
  physical: {
    title: "Físicos",
    attributes: [
      {
        key: "might",
        label: "Fuerza",
        description: "Potencia corporal, capacidad de carga e impacto físico.",
      },
      {
        key: "dexterity",
        label: "Destreza",
        description: "Agilidad, coordinación, precisión y velocidad manual.",
      },
      {
        key: "stamina",
        label: "Resistencia",
        description: "Aguante, tolerancia al dolor y duración del esfuerzo.",
      },
    ],
  },
  mental: {
    title: "Mentales",
    attributes: [
      {
        key: "intellect",
        label: "Intelecto",
        description: "Capacidad de análisis, comprensión y elaboración de ideas.",
      },
      {
        key: "cunning",
        label: "Astucia",
        description: "Ingenio práctico, lectura estratégica y oportunismo.",
      },
      {
        key: "resolve",
        label: "Determinación",
        description: "Firmeza interna para sostener decisiones y soportar presión.",
      },
    ],
  },
  social: {
    title: "Sociales",
    attributes: [
      {
        key: "presence",
        label: "Presencia",
        description: "Carisma, magnetismo y peso emocional frente a otros.",
      },
      {
        key: "manipulation",
        label: "Manipulación",
        description: "Capacidad para influir, persuadir o torcer voluntades.",
      },
      {
        key: "composure",
        label: "Compostura",
        description: "Control emocional, aplomo y manejo de la imagen pública.",
      },
    ],
  },
} as const;

export const TRAIT_LABELS = {
  direction: {
    title: "Dirección moral",
    leftArchetype: "Amenaza",
    rightArchetype: "Santo",
    sliders: [
      {
        key: "knavish_honest",
        left: "Bribón",
        right: "Honesto",
      },
      {
        key: "haughty_modest",
        left: "Altivo",
        right: "Modesto",
      },
      {
        key: "harsh_gentle",
        left: "Áspero",
        right: "Gentil",
      },
    ],
  },
  energy: {
    title: "Energía vital",
    leftArchetype: "Despreocupado",
    rightArchetype: "Estratega",
    sliders: [
      {
        key: "apathetic_inquisitive",
        left: "Apático",
        right: "Inquisitivo",
      },
      {
        key: "sloppy_meticulous",
        left: "Descuidado",
        right: "Meticuloso",
      },
      {
        key: "impulsive_prudent",
        left: "Impulsivo",
        right: "Prudente",
      },
    ],
  },
  process: {
    title: "Modo de actuar",
    leftArchetype: "Ermitaño",
    rightArchetype: "Pionero",
    sliders: [
      {
        key: "stubborn_cooperative",
        left: "Terco",
        right: "Cooperativo",
      },
      {
        key: "shy_bold",
        left: "Tímido",
        right: "Audaz",
      },
      {
        key: "aloof_spirited",
        left: "Distante",
        right: "Vivaz",
      },
    ],
  },
  boundary: {
    title: "Modo de relacionarse",
    leftArchetype: "Formalista",
    rightArchetype: "Bohemio",
    sliders: [
      {
        key: "detached_sentimental",
        left: "Desapegado",
        right: "Sentimental",
      },
      {
        key: "conventional_eccentric",
        left: "Convencional",
        right: "Excéntrico",
      },
      {
        key: "stoic_anxious",
        left: "Estoico",
        right: "Ansioso",
      },
    ],
  },
} as const;

export const VALUE_SECTORS = [
  {
    name: "Poder",
    color: "#ef4444",
    values: ["Dominio", "Ambición", "Victoria", "Control"],
  },
  {
    name: "Orden",
    color: "#3b82f6",
    values: ["Disciplina", "Deber", "Lealtad", "Justicia"],
  },
  {
    name: "Vínculo",
    color: "#10b981",
    values: ["Amor", "Pertenencia", "Cuidado", "Entrega"],
  },
  {
    name: "Libertad",
    color: "#f59e0b",
    values: ["Autonomía", "Verdad", "Deseo", "Exploración"],
  },
] as const;
