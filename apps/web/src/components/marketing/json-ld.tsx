/**
 * Emits a JSON-LD <script> block. Escapes "<" so structured data can never
 * break out of the script tag. Accepts a single object or an array of them.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
