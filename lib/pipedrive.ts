// URL de un deal en Pipedrive. Subdominio de Sento = "sento".
// Centralizado: si cambia el subdominio, se ajusta SOLO aquí.
export const PIPEDRIVE_BASE = "https://sento.pipedrive.com";

export const pipedriveDealUrl = (dealId: string | number) => `${PIPEDRIVE_BASE}/deal/${dealId}`;
