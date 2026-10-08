import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ContactPayload = {
  nom?: string;
  email?: string;
  etablissement?: string;
  lieu?: string;
  site?: string;
  prestation?: string;
  periode?: string;
  message?: string;
  website?: string;
  elapsed?: number;
};

const clean = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  /* antispam : pot de miel rempli ou envoi en moins de 3 secondes */
  if (clean(payload.website) || (typeof payload.elapsed === "number" && payload.elapsed < 3000)) {
    return NextResponse.json({ ok: true });
  }

  const email = clean(payload.email, 200);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Indiquez un email pour qu'on puisse vous répondre." }, { status: 400 });
  }
  const message = clean(payload.message, 5000);
  if (!message) {
    return NextResponse.json({ error: "Décrivez votre projet en quelques phrases." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Sans configuration Supabase, le client bascule sur un mailto prérempli.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ ok: true, fallback: "mailto" });
  }

  const lieu = clean(payload.etablissement) || clean(payload.lieu);
  const details = [payload.prestation && `Prestation : ${clean(payload.prestation)}`, payload.site && `Site / Instagram : ${clean(payload.site)}`, payload.periode && `Période : ${clean(payload.periode)}`].filter(Boolean).join("\n");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase.from("contact_requests").insert({
    nom: clean(payload.nom),
    lieu,
    email,
    message: details ? `${details}\n\n${message}` : message,
  });

  if (error) {
    console.error("Supabase insert error:", error.message);
    return NextResponse.json({ error: "L'envoi n'a pas fonctionné. Réessayez dans un instant." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
