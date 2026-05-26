import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { buildServerClient } from "@/lib/supabase";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = buildServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <PageWrapper user={user}>{children}</PageWrapper>;
}
