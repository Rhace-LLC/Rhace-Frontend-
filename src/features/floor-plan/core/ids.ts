let counter = 0;

/** Client-side id for entities created before the server assigns one. */
export function uid(prefix = 'entity'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}
