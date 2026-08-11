import Link from "next/link";

import { logoutAction } from "../../actions/auth.actions";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">CrossVal</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/documents">Documents</Link>
            <Link href="/reports">Reports</Link>
          </nav>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm">
            Log out
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
