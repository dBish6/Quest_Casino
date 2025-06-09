export default function parsePathWithLocale(path: string) {
  return path.match(/^\/([a-z]{2})(\/.*)?$/);
}
