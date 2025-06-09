/**
 * For custom errors.
 * 
 * Errors that don't need to be localized, the name is the message.
 */
export default function errorNotLocalized(name: string) {
  return /\s/.test(name);
}
