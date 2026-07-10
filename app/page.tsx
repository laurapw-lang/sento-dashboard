import { redirect } from "next/navigation";

// La raíz redirige a Reuniones (la métrica central).
// force-dynamic: sin esto, Next prerenderiza "/" como estático y hornea el
// redirect SIN header Location (307 vacío -> el navegador no redirige, parece 404).
// Forzándolo dinámico, el redirect se resuelve en cada request con Location correcto.
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/reuniones");
}
