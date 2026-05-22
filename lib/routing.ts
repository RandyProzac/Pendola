export function slugifySegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function shortenId(id: string) {
  return id.slice(0, 8);
}

export function makeEntitySegment(label: string, id: string) {
  const slug = slugifySegment(label);
  const shortId = shortenId(id);
  return slug ? `${slug}--${shortId}` : shortId;
}

export function parseEntityToken(segment: string) {
  const parts = segment.split("--");
  return parts[parts.length - 1] || segment;
}

export function resolveEntityId(segment: string, candidateIds: string[]) {
  const token = parseEntityToken(segment);
  return (
    candidateIds.find((id) => id === token || id.startsWith(token)) || token
  );
}

export function makeProjectPath(project: { id: string; title: string }) {
  return `/proyecto/${makeEntitySegment(project.title, project.id)}`;
}

export function makeBookPath(
  project: { id: string; title: string },
  book: { id: string; title: string }
) {
  return `${makeProjectPath(project)}/libro/${makeEntitySegment(book.title, book.id)}`;
}

export function makeEditorialBookPath(
  project: { id: string; title: string },
  book: { id: string; title: string }
) {
  return `${makeProjectPath(project)}/editorial/${makeEntitySegment(book.title, book.id)}`;
}

export function makeCharacterPath(
  project: { id: string; title: string },
  character: { id: string; name: string }
) {
  return `${makeProjectPath(project)}/personaje/${makeEntitySegment(
    character.name,
    character.id
  )}`;
}
