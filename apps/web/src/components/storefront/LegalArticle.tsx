/** Renders a store's legal/policy content as readable paragraphs. */
export function LegalArticle({ title, content }: { title: string; content: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-heading text-2xl font-semibold">{title}</h1>
      <div className="space-y-3 leading-relaxed text-[rgb(var(--color-fg))]/90">
        {content.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
