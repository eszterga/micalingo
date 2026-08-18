function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (!/^https?:\/\//.test(part)) {
      return part;
    }
    const trailing = part.match(/[.,;:)]+$/)?.[0] ?? '';
    const href = trailing ? part.slice(0, -trailing.length) : part;
    return (
      <span key={`${href}-${index}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 font-bold underline underline-offset-2 break-all"
        >
          {href}
        </a>
        {trailing}
      </span>
    );
  });
}

export function LegalParagraph({ text, className = '' }: { text: string; className?: string }) {
  return (
    <p className={`text-gray-700 leading-relaxed whitespace-pre-line ${className}`.trim()}>
      {linkify(text)}
    </p>
  );
}
