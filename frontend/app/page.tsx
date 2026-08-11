import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "session";

export default async function RootPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (session) {
    redirect("/documents");
  }

  redirect("/login");
}
