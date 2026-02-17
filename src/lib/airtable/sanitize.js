/**
 * Escapes a string value for safe interpolation into Airtable formula strings.
 * Prevents formula injection by escaping backslashes and single quotes.
 */
export function escapeAirtableValue(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
