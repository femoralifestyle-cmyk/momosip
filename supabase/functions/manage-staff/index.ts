import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) throw new Error("Not authenticated.");

    const admin = createClient(url, service);
    const { data: callerProfile, error: profileError } = await admin
      .from("profiles").select("role,is_active").eq("id", callerData.user.id).single();
    if (profileError || callerProfile?.role !== "super_admin" || !callerProfile?.is_active) {
      throw new Error("Only an active Super Admin can manage staff accounts.");
    }

    const body = await req.json();
    if (body.action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const full_name = String(body.full_name || "").trim();
      if (!email || password.length < 8 || !full_name) throw new Error("Name, valid email and password (at least 8 characters) are required.");
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name }
      });
      if (error) throw error;
      const { error: insertError } = await admin.from("profiles").upsert({
        id: data.user.id, email, full_name, role: "staff", is_active: true
      });
      if (insertError) throw insertError;
      return new Response(JSON.stringify({ message: "Staff account created." }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (body.action === "toggle") {
      const user_id = String(body.user_id || "");
      const is_active = Boolean(body.is_active);
      const { data: target, error: targetError } = await admin.from("profiles").select("role").eq("id", user_id).single();
      if (targetError) throw targetError;
      if (target.role === "super_admin") throw new Error("Super Admin accounts cannot be disabled here.");
      const { error } = await admin.from("profiles").update({ is_active }).eq("id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ message: is_active ? "Staff account enabled." : "Staff account disabled." }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    throw new Error("Unsupported action.");
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Request failed." }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
