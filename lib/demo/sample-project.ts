import { makeBookPath } from "@/lib/routing";
import type { Character, Chapter, Scenario } from "@/lib/types";

export const SAMPLE_PROJECT_TITLE = "La balada del faro de ceniza";
const SAMPLE_PROJECT_MARKER = "[demo-seed:faro-ceniza-v1]";

type StoreState = {
  projects: Array<{
    id: string;
    title: string;
    aiInstructions: string;
  }>;
  createProject: (data: Record<string, unknown>) => {
    id: string;
    title: string;
  };
  createBook: (projectId: string, data?: Record<string, unknown>) => {
    id: string;
    title: string;
  };
  createChapter: (bookId: string, projectId: string, data?: Partial<Chapter>) => Chapter;
  createCharacter: (projectId: string, data?: Partial<Character>) => Character;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  createScenario: (projectId: string, data?: Partial<Scenario>) => Scenario;
  createEditorialDraftFromChapter: (chapter: Chapter) => {
    id: string;
  };
  updateEditorialDraft: (
    id: string,
    data: {
      content?: string;
      wordCount?: number;
    }
  ) => void;
  getBooksByProject: (projectId: string) => Array<{
    id: string;
    title: string;
  }>;
  setCurrentProject: (id: string | null) => void;
};

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function toHtmlParagraphs(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function buildChapter(text: string) {
  return {
    content: toHtmlParagraphs(text),
    wordCount: countWords(text),
  };
}

export function seedSampleProject(store: StoreState) {
  const existingProject = store.projects.find(
    (project) =>
      project.title === SAMPLE_PROJECT_TITLE &&
      project.aiInstructions.includes(SAMPLE_PROJECT_MARKER)
  );

  if (existingProject) {
    const existingBook = store.getBooksByProject(existingProject.id)[0];
    store.setCurrentProject(existingProject.id);

    return {
      project: existingProject,
      book: existingBook,
      href: existingBook ? makeBookPath(existingProject, existingBook) : null,
      created: false,
    };
  }

  const project = store.createProject({
    title: SAMPLE_PROJECT_TITLE,
    type: "novela",
    genre: "fantasia de aventuras",
    premise:
      "En un archipielago cubierto por niebla viva, una farera descubre que el mar esta borrando los nombres de pueblos enteros. Para reencender el faro mayor y devolverle memoria a la costa, tendra que reunir aliados improbables antes del proximo equinoccio.",
    theme: "La memoria compartida puede vencer al olvido impuesto.",
    antiTheme: "El poder prospera cuando nadie recuerda de donde viene.",
    creativeProfile:
      "Fantasia luminosa, aventura coral, misterio maritimo y prosa sensorial.",
    aiInstructions:
      `${SAMPLE_PROJECT_MARKER} Proyecto demo original para validar personajes, escenarios, capitulos y flujo editorial. No esta basado en texto protegido; usa una aventura fantastica original.`,
    editorialInstructions:
      "En Editorial, aplica ortografia, puntuacion, claridad y ritmo con criterio RAE practico. Conserva la musicalidad y la voz del texto salvo cuando haya errores claros.",
    coverColor: "#0F6E56",
    status: "revisando",
  });

  const book = store.createBook(project.id, {
    title: "Libro I - Marea de recuerdos",
    synopsis:
      "Mara Vela y su compania recorren islas, mercados hundidos y torres antiguas para devolverle voz al faro mayor antes de que la niebla viva termine de tragarse la costa.",
    status: "revision",
  });

  const chapterOneText = `La niebla llego antes del amanecer, cuando el faro menor de Ceniza todavia exhalaba el calor cansado de la noche. Mara Vela estaba en la galeria alta, limpiando con un pano de sal el cristal de la linterna, cuando vio que el banco blanco no avanzaba como las otras veces. No corria ni reptaba: escuchaba. Se detuvo a unos metros del acantilado, y el mar, que a esa hora solia gruñir contra las rocas, guardo un silencio reverencial.

Abajo, en el muelle, los pescadores dejaron de remendar redes. Uno de ellos intento llamar a su hijo, pero el nombre se le deshizo en la boca como si hubiera mordido ceniza. Otro se llevo las manos al pecho, espantado, y pregunto a quien pertenecia la barca atada al poste central. Era suya. La habia tallado con sus propias manos. Sin embargo, la niebla le habia arrancado el recuerdo igual que el agua arranca la pintura vieja.

Mara bajo las escaleras de piedra con la llave del deposito tintineando contra la cadera. Su hermano menor, Elian, la esperaba junto a la puerta del aceite, con una libreta abierta y los ojos demasiado atentos para alguien de once anos. En la pagina habia escrito los nombres de todas las casas del puerto. La tinta aun estaba fresca.

"Empieza por el norte", dijo el nino. "A Dona Brisa ya se le olvido la calle."

Mara no pregunto como lo sabia. Elian llevaba semanas despertando antes que las gaviotas, como si oyera en suenos una campana que nadie mas escuchaba. Juntos recorrieron el pueblo anotando nombres en puertas, barriles y tablones. La gente miraba aquellas palabras como quien encuentra una fotografia de si mismo en el bolsillo de un desconocido. Algunos lloraban. Otros se reian por puro alivio.

Al mediodia llego Teo Brin, aprendiz de cartografo, empapado hasta los codos y con un mapa arrugado bajo la camisa. Juraba que los islotes del oeste habian cambiado de sitio durante la noche. Mara penso que estaba delirando hasta que el muchacho desplego el papel sobre una caja de sardinas: donde antes habia tres nombres, ahora solo quedaban manchas de tinta corrida. En el margen, escrito con otra mano, alguien habia dejado una frase breve: cuando la luz mayor calla, el mar aprende a borrar.

Mara guardo el mapa, miro hacia la linea blanca que seguia inmovil frente al acantilado y comprendio que la niebla no venia por el puerto. Venia por la memoria de toda la costa. Y si el faro mayor llevaba veinte anos apagado, tal vez habia llegado la hora de subir hasta el promontorio que nadie se atrevia a nombrar.`;

  const chapterTwoText = `La compania alcanzo Lur con la marea del crepusculo. La ciudad parecia hundida a medias por decision propia: tenderetes de cobre colgaban sobre canales estrechos, puentes de cuerda unian terrazas inclinadas y, bajo las tablas del mercado, se oia pasar el agua como un animal grande respirando en la oscuridad. Teo caminaba pegado a Mara, fascinado y asustado a la vez, mientras Ines del Junco avanzaba delante de ellos con la soltura de quien conoce tres formas distintas de desaparecer.

Ines habia jurado no volver nunca a Lur. Aun asi, al llegar al mercado sumergido saludo a dos mercaderes, insulto a un tercero y se detuvo frente a una anciana que vendia campanas sin badajo. La mujer no ofrecio precio ni regateo. Solo pregunto si la farera venia a comprar sonido o recuerdo.

Mara saco el mapa alterado y lo puso sobre la mesa. La anciana lo rocio con agua de una botella opaca. Bajo las manchas aparecio una escalera dibujada en espiral y, al pie, una anotacion antigua: el faro mayor no se enciende con fuego, sino con voces que aun se reconozcan entre si.

La respuesta parecia una adivinanza, pero Abad Nilo, que habia insistido en acompanarlos desde el monasterio de las campanas, se puso palido al leerla. Explico que las primeras fareras cantaban un nombre por cada aldea de la costa. Esa letania mantenia a raya la niebla viva. Cuando las guerras partieron los puertos y los linajes empezaron a ocultar su origen, el coro se quebro. El faro callo despues.

Antes de que Mara pudiera ordenar las piezas, una cuadrilla de guardias de marea irrumpio en el mercado. Llevaban cascos barnizados y faroles negros, luz de autoridad sin calor. Buscaban a cualquiera que traficara con mapas viejos, campanas o memorias heredadas. Ines sonrio con cansancio, como si el pasado le hubiera confirmado una deuda largamente anunciada.

La huida atraveso pasarelas resbaladizas, puestos volcados y escaleras que subian hacia patios anegados. Teo perdio un zapato, Mara casi el mapa, y Nilo la paciencia. Al final se refugiaron en una bodega de sal donde las paredes estaban cubiertas de nombres grabados con navaja. Ines acaricio una inscripcion casi borrada y admitio que ella misma habia entregado anos atras la ruta del faro mayor a los guardias de marea, creyendo que asi salvaria a su hermana.

Nadie dijo nada durante varios segundos. Luego Mara apoyo la mano sobre el nombre tallado, aun tibio por el roce de Ines, y contesto que una traicion antigua no servia de nada si no se convertia en un camino de regreso. Afuera, sobre la ciudad, la niebla empezo a bajar como una marea al reves.`;

  const chapterThreeText = `Subieron al promontorio durante la noche para evitar los vigias de la costa. El sendero hacia el faro mayor estaba cubierto de hierbas plateadas que devolvian un brillo tenue bajo la luna, como si la tierra hubiera aprendido a guardar luz en secreto. Nadie hablaba. Cada uno parecia ocuparse de escuchar sus propios pasos, temiendo que el siguiente pudiera sonar con otra memoria.

La torre surgio entre riscos negros poco antes del alba. Era mas alta de lo que Mara habia imaginado y, al mismo tiempo, mas triste: balcones sin baranda, ventanas cegadas por sal endurecida y una puerta de bronce con cuatro ranuras verticales, una por cada coro que antiguamente cuidaba la costa. Sobre el arco, casi borradas, persistian palabras que Teo logro leer al tacto: ninguna luz vive sola.

Abad Nilo encontro el mecanismo oculto al introducir en las ranuras cuatro pequenas laminas de campana que habia cargado en silencio desde el monasterio. La puerta cedio con un gemido profundo. Dentro, la escalera giraba alrededor de un eje hueco que dejaba subir el ruido del mar hasta lo mas alto, amplificado como si toda la torre fuera un instrumento dormido.

Cada rellano exigia algo distinto. En el primero, la niebla susurro nombres equivocados y Teo tuvo que corregirlos uno por uno con ayuda de su mapa rehecho. En el segundo, una corriente helada intento convencer a Ines de que nadie la perdonaria y que volver atras era mas seguro que seguir subiendo. En el tercero, Mara oyo la voz de su madre, muerta hacia doce inviernos, pidiendole que regresara al faro menor y protegiera solo lo que aun podia tocar con las manos.

Fue Elian, que los habia seguido a escondidas cargando la libreta del puerto, quien rompio el hechizo final. Abrio el cuaderno y empezo a leer en voz alta los nombres que habia salvado durante los ultimos dias. Cada nombre pronunciado encendia una delgada hebra de luz en el eje central. Nilo se sumo con las respuestas antiguas del coro. Teo marco el ritmo golpeando una baranda con su hebilla. Ines, temblando, aporto los nombres que habia intentado olvidar.

Cuando alcanzaron la linterna superior, el sol estaba saliendo detras de la niebla. Mara comprendio entonces que la torre no esperaba aceite ni yesca. Esperaba reconocimiento. Se adelanto hasta el cuenco de cristal agrietado y pronuncio el nombre completo del archipielago, no el de los mapas nuevos, sino el de las viejas canciones de puerto. El faro desperto con una llamarada clara, verde y dorada a la vez.

La niebla retrocedio primero un paso, luego otro. A lo lejos, sobre el agua, reaparecieron campanarios, embarcaderos y casas que llevaban semanas borrandose de la memoria comun. Mara no penso en victoria. Penso en trabajo. Habia que reconstruir la letania, volver a ensenar los nombres, decidir quien cuidaria la luz cuando ella no estuviera. Pero por primera vez en mucho tiempo el mar dejo de sonar hambriento.`;

  const chapterOne = store.createChapter(book.id, project.id, {
    title: "Capitulo 1 - La niebla que aprendio nombres",
    status: "completo",
    order: 1,
    ...buildChapter(chapterOneText),
  });

  const chapterTwo = store.createChapter(book.id, project.id, {
    title: "Capitulo 2 - El mercado sumergido",
    status: "aprobado",
    order: 2,
    ...buildChapter(chapterTwoText),
  });

  store.createChapter(book.id, project.id, {
    title: "Capitulo 3 - Las escaleras del faro mayor",
    status: "revision",
    order: 3,
    ...buildChapter(chapterThreeText),
  });

  const mara = store.createCharacter(project.id, {
    name: "Mara Vela",
    age: 29,
    physicalDescription:
      "Farera de hombros fibrosos, manos curtidas por sal y viento, cabello oscuro casi siempre recogido a toda prisa.",
    drive: "Mantener viva la memoria de la costa y evitar que la niebla borre otro puerto.",
    wish: "Reencender el faro mayor y devolverle nombre a cada aldea perdida.",
    void: "Teme no estar a la altura del legado de las antiguas guardianas.",
    vice: "Carga sola con demasiado y tarda en pedir ayuda.",
    origin:
      "Nacio en el faro menor de Ceniza, hija de una linaje de fareras venidas a menos tras la guerra de puertos.",
    persona: "Serena, util y practicamente inflexible cuando una vida depende de ella.",
    expedition:
      "Acepta que proteger no es encerrar: necesita confiar en una compania, no solo en su disciplina.",
    attributes: {
      physical: { might: 3, dexterity: 4, stamina: 5 },
      mental: { intellect: 4, cunning: 3, resolve: 5 },
      social: { presence: 4, manipulation: 2, composure: 5 },
    },
    traits: {
      direction: { knavish_honest: 84, haughty_modest: 62, harsh_gentle: 71 },
      energy: { apathetic_inquisitive: 78, sloppy_meticulous: 73, impulsive_prudent: 68 },
      process: { stubborn_cooperative: 43, shy_bold: 69, aloof_spirited: 57 },
      boundary: { detached_sentimental: 61, conventional_eccentric: 38, stoic_anxious: 63 },
    },
    archetypes: {
      direction: "Santo",
      energy: "Estratega",
      process: "Pionero",
      boundary: "Bohemio",
    },
    valueSector: "Trascendencia",
    dominantValue: "Legado",
    notes:
      "Funciona muy bien para probar la ficha profunda del personaje porque tiene impulso, falta interna, historia familiar y transformacion clara.",
  });

  const teo = store.createCharacter(project.id, {
    name: "Teo Brin",
    age: 17,
    physicalDescription:
      "Aprendiz alto y desgarbado, con rodillas raspadas, ojos atentos y dedos manchados de tinta marina.",
    drive: "Comprender por que los mapas cambian y demostrar que su memoria sirve para algo mas que copiar rutas.",
    wish: "Trazar el mapa verdadero del archipielago antes de que desaparezca.",
    void: "Le aterra ser siempre el muchacho al que nadie toma en serio.",
    vice: "Habla cuando deberia escuchar y corre riesgos para impresionar.",
    origin:
      "Criado por una casa de cartografos menores que documenta las rutas de pesca de la costa oeste.",
    persona: "Curioso, insolente sin malicia y emocionalmente transparente.",
    expedition:
      "Pasa de querer reconocimiento a entender que mapear tambien puede ser un acto de servicio.",
    attributes: {
      physical: { might: 2, dexterity: 3, stamina: 3 },
      mental: { intellect: 5, cunning: 4, resolve: 3 },
      social: { presence: 3, manipulation: 1, composure: 2 },
    },
    traits: {
      direction: { knavish_honest: 76, haughty_modest: 58, harsh_gentle: 74 },
      energy: { apathetic_inquisitive: 90, sloppy_meticulous: 44, impulsive_prudent: 39 },
      process: { stubborn_cooperative: 55, shy_bold: 61, aloof_spirited: 73 },
      boundary: { detached_sentimental: 37, conventional_eccentric: 64, stoic_anxious: 29 },
    },
    archetypes: {
      direction: "Santo",
      energy: "Despreocupado",
      process: "Pionero",
      boundary: "Bohemio",
    },
    valueSector: "Conocimiento",
    dominantValue: "Verdad",
    notes: "Buen personaje para probar contrastes entre curiosidad, miedo y crecimiento.",
  });

  const ines = store.createCharacter(project.id, {
    name: "Ines del Junco",
    age: 42,
    physicalDescription:
      "Ex contrabandista de paso felino, voz grave y una cicatriz fina junto a la boca que no intenta ocultar.",
    drive: "Pagar la deuda moral que dejo en Lur y sacar a su hermana del control de los guardias de marea.",
    wish: "Encontrar una forma de reparar la traicion que cometio anos atras.",
    void: "No cree merecer una segunda pertenencia.",
    vice: "Convierte la culpa en sarcasmo y distancia.",
    origin:
      "Paso media vida moviendo carga ilegal entre muelles inundados hasta vender por error una ruta sagrada.",
    persona: "Afilada, eficaz y mas protectora de lo que admite.",
    expedition:
      "Aprende a quedarse cuando la confianza deja de ser una amenaza.",
    attributes: {
      physical: { might: 4, dexterity: 5, stamina: 4 },
      mental: { intellect: 3, cunning: 5, resolve: 4 },
      social: { presence: 4, manipulation: 4, composure: 4 },
    },
    traits: {
      direction: { knavish_honest: 41, haughty_modest: 52, harsh_gentle: 48 },
      energy: { apathetic_inquisitive: 67, sloppy_meticulous: 71, impulsive_prudent: 80 },
      process: { stubborn_cooperative: 29, shy_bold: 84, aloof_spirited: 34 },
      boundary: { detached_sentimental: 72, conventional_eccentric: 57, stoic_anxious: 58 },
    },
    archetypes: {
      direction: "Amenaza",
      energy: "Estratega",
      process: "Ermitaño",
      boundary: "Bohemio",
    },
    valueSector: "Pertenencia",
    dominantValue: "Lealtad",
    notes: "Sirve para probar un arco de culpa, secretos y alianza inestable.",
  });

  const nilo = store.createCharacter(project.id, {
    name: "Abad Nilo",
    age: 61,
    physicalDescription:
      "Monje campanero de espalda encorvada, manos delicadas y mirada clara de quien ha pasado anos escuchando ecos.",
    drive: "Restituir la letania original del faro antes de morir sin transmitirla.",
    wish: "Dejar un archivo vivo, no solo pergaminos, para la siguiente generacion.",
    void: "Su prudencia se parece demasiado a la cobardia.",
    vice: "Tiende a refugiarse en la teoria cuando la accion exige exponerse.",
    origin:
      "Custodio del monasterio de campanas, heredero de fragmentos incompletos de la antigua liturgia costera.",
    persona: "Paciente, observador y capaz de una firmeza sorprendente cuando el momento lo exige.",
    expedition:
      "Acepta que la memoria no se conserva solo archivandola, sino poniendola otra vez en voz de la gente.",
    attributes: {
      physical: { might: 1, dexterity: 2, stamina: 3 },
      mental: { intellect: 5, cunning: 4, resolve: 4 },
      social: { presence: 3, manipulation: 2, composure: 5 },
    },
    traits: {
      direction: { knavish_honest: 82, haughty_modest: 77, harsh_gentle: 88 },
      energy: { apathetic_inquisitive: 74, sloppy_meticulous: 81, impulsive_prudent: 85 },
      process: { stubborn_cooperative: 68, shy_bold: 33, aloof_spirited: 41 },
      boundary: { detached_sentimental: 46, conventional_eccentric: 42, stoic_anxious: 70 },
    },
    archetypes: {
      direction: "Santo",
      energy: "Estratega",
      process: "Ermitaño",
      boundary: "Formalista",
    },
    valueSector: "Servicio",
    dominantValue: "Responsabilidad",
    notes: "Aporta contraste generacional y conocimiento del sistema del mundo.",
  });

  store.updateCharacter(mara.id, {
    relationships: [
      { characterId: teo.id, label: "Protege a" },
      { characterId: ines.id, label: "Desconfia de" },
      { characterId: nilo.id, label: "Escucha a" },
    ],
  });
  store.updateCharacter(teo.id, {
    relationships: [
      { characterId: mara.id, label: "Admira a" },
      { characterId: ines.id, label: "Teme y sigue a" },
    ],
  });
  store.updateCharacter(ines.id, {
    relationships: [
      { characterId: mara.id, label: "Se gana la confianza de" },
      { characterId: nilo.id, label: "Cuestiona a" },
    ],
  });
  store.updateCharacter(nilo.id, {
    relationships: [
      { characterId: mara.id, label: "Guia a" },
      { characterId: teo.id, label: "Instruye a" },
      { characterId: ines.id, label: "Tolera a" },
    ],
  });

  store.createScenario(project.id, {
    name: "Faro menor de Ceniza",
    type: "interior",
    description:
      "Torre costera austera, con escalones humedos, deposito de aceite y una linterna que todavia resiste al viento salado.",
    atmosphere: "Vigilia, sal, herrumbre y calor de trabajo persistente.",
    narrativeImportance:
      "Punto de partida emocional de Mara y primer lugar donde la niebla empieza a robar nombres.",
    associatedCharacterIds: [mara.id, teo.id],
    notes: "Buen escenario para probar atmosfera, funcion narrativa y personajes asociados.",
  });

  store.createScenario(project.id, {
    name: "Mercado sumergido de Lur",
    type: "fantastico",
    description:
      "Red de puestos, pasarelas y bodegas sobre canales oscuros donde se comercian campanas, mapas viejos y recuerdos heredados.",
    atmosphere: "Bullicio anfibio, peligro politico y secretos vendiendose a media voz.",
    narrativeImportance:
      "Aqui se revela la naturaleza coral del faro mayor y la culpa de Ines.",
    associatedCharacterIds: [mara.id, teo.id, ines.id, nilo.id],
    notes: "Sirve para probar escenarios con elenco amplio y conflicto activo.",
  });

  store.createScenario(project.id, {
    name: "Escaleras del faro mayor",
    type: "exterior",
    description:
      "Ascenso ritual por una torre antigua donde cada rellano enfrenta a la compania con recuerdos y voces falseadas.",
    atmosphere: "Sublime, vertical, ceremonial y al borde del derrumbe.",
    narrativeImportance:
      "Climax del libro y lugar donde la memoria vuelve a convertirse en luz.",
    associatedCharacterIds: [mara.id, teo.id, ines.id, nilo.id],
    notes: "Ideal para probar la estructura narrativa y el cierre de arco de varios personajes.",
  });

  const editorialText = `La compania llego a Lur con la marea del crepusculo. La ciudad parecia hundida por voluntad propia: tenderetes de cobre sobre canales estrechos, puentes de cuerda entre terrazas inclinadas y, bajo las tablas del mercado, el agua respirando como un animal enorme. Ines del Junco avanzaba delante del grupo con la incomoda naturalidad de quien vuelve a una culpa conocida.

En el mercado sumergido, una anciana que vendia campanas sin badajo mojo el mapa de Teo y revelo una anotacion antigua: el faro mayor no despierta con fuego, sino con voces capaces de reconocerse entre si. Abad Nilo palidecio al leerla. Explico que las primeras fareras sostenian la costa cantando el nombre de cada aldea; cuando los puertos ocultaron su origen, el coro se rompio y la niebla encontro entrada.

La revelacion apenas tuvo tiempo de asentarse. Los guardias de marea irrumpieron entre los puestos con faroles negros, buscando mapas viejos y memorias heredadas. La huida termino en una bodega de sal, rodeados de nombres grabados con navaja. Alli Ines confeso que anos atras habia vendido la ruta del faro mayor para salvar a su hermana. Mara no la absolvio, pero tampoco la aparto. Le dijo que una culpa solo sirve si se convierte en regreso.

Afuera, la niebla empezo a descender sobre Lur como una marea invertida.`;

  const editorialDraft = store.createEditorialDraftFromChapter(chapterTwo);
  store.updateEditorialDraft(editorialDraft.id, {
    content: toHtmlParagraphs(editorialText),
    wordCount: countWords(editorialText),
  });

  store.setCurrentProject(project.id);

  return {
    project,
    book,
    href: makeBookPath(project, book),
    created: true,
    firstChapterId: chapterOne.id,
  };
}
