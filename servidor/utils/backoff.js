/**
 * Define por quanto tempo bloquear, crescendo conforme o número de
 * tentativas erradas seguidas vindas do mesmo IP.
 */
export function calcularBloqueioMs(tentativasFalhas) {
  if (tentativasFalhas < 5) return 0;
  if (tentativasFalhas < 10) return 1 * 60 * 1000; // 1 min
  if (tentativasFalhas < 15) return 5 * 60 * 1000; // 5 min
  if (tentativasFalhas < 20) return 30 * 60 * 1000; // 30 min
  return 24 * 60 * 60 * 1000; // 24h para quem insiste muito
}
