/** Section 16/27 - SEO structured data (schema.org). Escaping "<" prevents a
 * `</script>`-breakout if any embedded string (course title, teacher bio,
 * etc.) ever contained it - JSON.stringify alone doesn't escape that. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
