// Vitest runs outside Next.js's bundler, which is what normally turns
// "server-only" into a no-op for server code paths. Stub it out here so
// route handlers / services that import it can be exercised directly.
export {};
