/**
 * Configuracion compartida de control de acceso al dashboard.
 * Importado por middleware.ts y por /api/permissions.
 *
 * - ALLOWED_DOMAINS: dominios del grupo (acceso automatico, sin fila en dashboard_permissions).
 * - ALLOWED_EMAILS: excepciones individuales (emails fuera de los dominios del grupo).
 */
export const ALLOWED_DOMAINS = ["@revolutia.ai", "@noctorial.com", "@hypeleadsad.com"];
export const ALLOWED_EMAILS: string[] = [];

// Excepciones bloqueadas: aunque el email este en un dominio del grupo,
// estos usuarios NO pueden entrar al dashboard.
export const BLOCKED_EMAILS: string[] = [
  "victor@hypeleadsad.com",
];

export function isEmailAllowed(email: string): boolean {
  const lower = email.toLowerCase();
  if (BLOCKED_EMAILS.includes(lower)) return false;
  if (ALLOWED_EMAILS.includes(lower)) return true;
  return ALLOWED_DOMAINS.some((d) => lower.endsWith(d));
}

export function isTrustedDomain(email: string): boolean {
  const lower = email.toLowerCase();
  return ALLOWED_DOMAINS.some((d) => lower.endsWith(d));
}
