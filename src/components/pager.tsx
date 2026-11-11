import Link from "next/link";

export function Pager({ page, total, size, params, base }: {
  page: number; total: number; size: number; params: Record<string, string | undefined>; base: string;
}) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;

  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter((e): e is [string, string] => Boolean(e[1])));
    return `${base}?${q}`;
  };

  return (
    <nav aria-label="Pages" className="mt-4 flex items-center gap-3">
      {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span className="text-muted">Previous</span>}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span className="text-muted">Next</span>}
    </nav>
  );
}
