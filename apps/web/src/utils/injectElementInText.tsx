/**
 * @param options.localeMarker If true, will extract locale markers `{...}` or `{{...}}` automatically from the `message`.
 * @param options.injectAll If true, all markers/sequences will be replaced, and the `element`'s `text` callback returns an 
 * array of strings instead, but that's only if the callback is a array of elements.
 */
export default function injectElementInText(
  message: string,
  sequence: string | undefined | null,
  element: (text: string | string[]) => React.ReactNode | React.ReactNode[],
  options?: {
    localeMarker?: boolean
    injectAll?: boolean;
  }
): React.ReactNode {
  if (options?.injectAll) {
    const matches: { match: string; index: number }[] = [];

    if (options.localeMarker) {
      for (const match of message.matchAll(/{{(.*?)}}|{(.*?)}/g)) {
        matches.push({ match: match[0], index: match.index! });
      }
    } else if (sequence) {
      let i = 0;
      while ((i = message.indexOf(sequence, i)) !== -1) {
        matches.push({ match: sequence, index: i });
        i += sequence.length;
      }
    }
    if (!matches.length) return message;

    const inserts = matches.map((m) => m.match.replace(/[{}]/g, "")),
      parts: React.ReactNode[] = [];

    let lastIndex = 0;
    for (const [i, { match, index }] of matches.entries()) {
      parts.push(message.slice(lastIndex, index));
      parts.push(
        Array.isArray(element(inserts))
          ? (element(inserts) as React.ReactNode[])[i]
          : element(inserts[i])
      );
      lastIndex = index + match.length;
    }

    parts.push(message.slice(lastIndex));
    return <>{parts}</>;
  }

  let text = sequence, 
    msg = message;

  if (options?.localeMarker) {
    const match = message.match(/{{(.*?)}}|{(.*?)}/);
    if (!match) return message;

    text = match[0].replace(/[{}]/g, "");
    msg = message.replace(match[0], text);
  }

  let parts: string[] = [];
  if (text) parts = msg.split(text);
  if (parts.length < 2) return message;

  const [before, ...after] = parts;
  return (
    <>
      {before}
      {element(text!.trim())}
      {after.join(text!)}
    </>
  );
}
