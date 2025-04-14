export default function injectElementInText(
  message: string,
  sequence: string | undefined | null,
  element: (text: string) => React.ReactNode,
  options?: {
    localeMarker?: boolean
    injectAll?: boolean;
  }
): React.ReactNode {
  let text = sequence, msg = message;

  if (options?.localeMarker) {
    const match = message.match(/{{(.*?)}}|{(.*?)}/);
    if (!match) return message;

    text = match[0].replace(/[{}]/g, "");
    msg = message.replace(match[0], text);
  }
  let parts: string[] = [];

  if (text) parts = msg.split(text);
  if (parts.length < 2) return message;

  if (options?.injectAll) {
    const result: React.ReactNode[] = [];

    parts.forEach((part, i) => {
      result.push(part);
      if (i < parts.length - 1) result.push(element(text!));
    });

    return <>{result}</>;
  }

  const [before, ...after] = parts;
  return (
    <>
      {before}
      {element(text!.trim())}
      {after.join(text!)}
    </>
  );
}
