import Link from "next/link";

import { logoutAction } from "../../actions/auth.actions";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <header className="border-b">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <span className="font-label">CrossVal</span>
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
        </div>
      </header>
      <main className="max-w-[1280px] mx-auto px-6">{children}</main>
    </div>
  );
}
