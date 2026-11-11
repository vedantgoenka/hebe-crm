import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md p-10">
      <h1 className="mb-2 text-2xl font-bold">Not found</h1>
      <p className="mb-4 text-muted">This record doesn&apos;t exist, was archived, or you don&apos;t have access to it.</p>
      <Link href="/">Go to My work</Link>
    </div>
  );
}
