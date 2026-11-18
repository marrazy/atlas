// The app has no Node types, and only backend-rules.test.ts needs one Node function, so it is declared here.
declare module 'node:fs' {
  export function readFileSync(path: URL, encoding: 'utf8'): string
}
