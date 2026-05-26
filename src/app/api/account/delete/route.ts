import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildServerClient, createAdminClient } from "@/lib/supabase";

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const supabase = buildServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
