// ================================================================
// EQUIPO MÉXICO — filtros por IDENTIFICADOR ESTABLE (no por nombre).
// Los nombres cambian; los IDs de Pipedrive no. El nombre se usa SOLO como etiqueta.
//
// ⚠️ EQUIPO ACTUAL — EDITAR AQUÍ SI CAMBIA (altas/bajas/reasignaciones):
//   * VENTA: filtra deals por owner_id (Pipedrive user_id.id) ∈ AES_VENTA.
//   * REUNIONES: filtra por agendado_por_option_id (option_id del campo
//     "Quién trajo el lead") ∈ REUNIONES_TEAM.
// ================================================================

// --- VENTA: AEs por owner_id (user_id.id de Pipedrive, ESTABLE) ---
export const AES_VENTA: { ownerId: number; nombre: string }[] = [
  { ownerId: 24943809, nombre: "Andrés Sanjuán" },
  { ownerId: 25734203, nombre: "Edgardo Velasquez" },
  { ownerId: 25734214, nombre: "Michelle Sosa" },
];

// --- REUNIONES: equipo por agendado_por_option_id (option_id ESTABLE) ---
// metaEntidad = cómo se llama esta persona en la tabla `metas` (para unir meta vs real).
// null = no tiene meta de reuniones (ej. Andrés no está en el seed de metas).
export const REUNIONES_TEAM: { optionId: string; nombre: string; metaEntidad: string | null }[] = [
  { optionId: "249", nombre: "Andrés Sanjuán", metaEntidad: null },
  { optionId: "274", nombre: "Laura Peña", metaEntidad: "Laura" },
  { optionId: "275", nombre: "Zalesmachine", metaEntidad: "Zalesmachine" },
  { optionId: "278", nombre: "Edgardo Velasquez", metaEntidad: "Edgardo" },
  { optionId: "279", nombre: "Michelle Sosa", metaEntidad: "Michelle" },
];

// --- Índices para lookup O(1) (derivados de las listas de arriba) ---
const AE_OWNER_IDS = new Set(AES_VENTA.map((a) => a.ownerId));
const AE_NAME = new Map(AES_VENTA.map((a) => [a.ownerId, a.nombre]));

const REU_OPTION_IDS = new Set(REUNIONES_TEAM.map((r) => r.optionId));
const REU_NAME = new Map(REUNIONES_TEAM.map((r) => [r.optionId, r.nombre]));

// --- VENTA helpers ---
/** ¿el deal pertenece a un AE del equipo? (registros fuera del equipo → excluidos) */
export function isAeVenta(ownerId: number | null | undefined): boolean {
  return ownerId != null && AE_OWNER_IDS.has(Number(ownerId));
}
/** Etiqueta bonita del AE por owner_id; cae al nombre del CRM si no está en la lista. */
export function aeLabel(ownerId: number | null | undefined, fallback?: string | null): string {
  if (ownerId != null && AE_NAME.has(Number(ownerId))) return AE_NAME.get(Number(ownerId))!;
  return fallback || "—";
}

// --- REUNIONES helpers ---
/** ¿la reunión fue traída por alguien del equipo? (option_id llega como texto, ej "274") */
export function isReunionesTeam(optionId: string | null | undefined): boolean {
  return optionId != null && REU_OPTION_IDS.has(String(optionId));
}
/** Etiqueta bonita por option_id; cae al label del CRM si no está en la lista. */
export function reunionesLabel(optionId: string | null | undefined, fallback?: string | null): string {
  if (optionId != null && REU_NAME.has(String(optionId))) return REU_NAME.get(String(optionId))!;
  return fallback || "—";
}
