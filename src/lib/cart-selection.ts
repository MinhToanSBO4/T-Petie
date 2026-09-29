export function reconcileCartSelection(previousKeys: string[], currentKeys: string[], selected: Set<string>): Set<string> {
  const previous = new Set(previousKeys);
  const current = new Set(currentKeys);
  return new Set(currentKeys.filter((key) => selected.has(key) || !previous.has(key)).filter((key) => current.has(key)));
}
