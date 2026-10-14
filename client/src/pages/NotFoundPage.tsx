import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-accent">404 · Page not found</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-primary-text">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 text-sm leading-6 text-secondary-text">
        The page may have moved or the address may be incorrect.
      </p>
      <Link
        className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        to="/dashboard"
      >
        Back to dashboard
      </Link>
    </section>
  );
}
