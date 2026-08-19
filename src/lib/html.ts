/**
 * Escaping for HTML built by string concatenation.
 *
 * The notification emails interpolate submitted values straight into markup.
 * Anything a stranger can type on a public form reaches an officer's inbox, so
 * unescaped input means a submitter can inject links or markup into a message
 * that appears to come from TSA.
 */

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value for use in HTML text or a quoted attribute. */
export function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

/**
 * Tagged template that escapes every interpolated value.
 *
 *   html`<td>${userInput}</td>`
 *
 * Use `raw()` for markup that is deliberately composed, such as joined rows.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, str, i) => {
    if (i === 0) return str;
    const value = values[i - 1];
    const rendered = value instanceof RawHtml ? value.value : esc(value);
    return acc + rendered + str;
  }, '');
}

class RawHtml {
  constructor(readonly value: string) {}
}

/** Mark already-safe markup so `html` does not escape it again. */
export function raw(value: string): RawHtml {
  return new RawHtml(value);
}

/**
 * Escape every string in a nested structure, preserving its shape.
 *
 * For templates that interpolate many fields: escape the whole payload once and
 * build the markup from the escaped copy, rather than remembering to wrap each
 * of two dozen interpolations.
 */
export function escapeDeep<T>(value: T): T {
  if (typeof value === 'string') return esc(value) as unknown as T;
  if (Array.isArray(value)) return value.map(escapeDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = escapeDeep(item);
    return out as T;
  }
  return value;
}
