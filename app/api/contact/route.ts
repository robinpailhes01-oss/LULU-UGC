import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ContactPayload = {
  nom?: string;
  lieu?: string;
  email?: string;
  message?: string;
};

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = payload.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Indiquez un email pour qu'on puisse vous répondre." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Sans configuration Supabase, le client bascule sur un mailto prérempli.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ ok: true, fallback: "mailto" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase.from("contact_requests").insert({
    nom: payload.nom?.trim() ?? "",
    lieu: payload.lieu?.trim() ?? "",
    email,
    message: payload.message?.trim() ?? "",
  });

  if (error) {
    console.error("Supabase insert error:", error.message);
    return NextResponse.json(
      { error: "L'envoi n'a pas fonctionné. Réessayez dans un instant." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
