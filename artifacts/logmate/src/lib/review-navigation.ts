import type { Decision, Note } from './logbook';

export function timelineFiltersHideTarget(
  hash: string,
  notes: Note[],
  decisions: Decision[],
  search: string,
  category: string,
): boolean {
  let target: string;
  try {
    target = decodeURIComponent(hash.slice(1));
  } catch {
    return false;
  }
  const query = search.trim().toLocaleLowerCase();
  if (target.startsWith('note-')) {
    const note = notes.find(item => `note-${item.id}` === target);
    return !!note && ((!!category && note.category !== category) ||
      (!!query && !`${note.body} ${note.category}`.toLocaleLowerCase().includes(query)));
  }
  if (target.startsWith('decision-')) {
    const decision = decisions.find(item => `decision-${item.id}` === target);
    return !!decision && (!!category ||
      (!!query && !`${decision.title} ${decision.reason} ${decision.outcome}`.toLocaleLowerCase().includes(query)));
  }
  return false;
}