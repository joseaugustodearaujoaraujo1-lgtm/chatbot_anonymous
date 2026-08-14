import crypto from "crypto";
import bcrypt from "bcrypt";

// ============================================================
// Parte 1 — hashing usado na autenticação (já existia, mantido)
// ============================================================

/**
 * Hash determinístico (HMAC-SHA256) usado só para LOCALIZAR a linha no
 * banco rapidamente (é indexado). Não é a proteção contra força bruta —
 * essa vem do bcrypt em `hashCodigo`. Serve tanto para o código quanto
 * para o IP de quem está tentando logar.
 */
export function hashLookup(valor) {
  const secret = process.env.HASH_SECRET;
  if (!secret) throw new Error("HASH_SECRET não definido no .env");
  return crypto.createHmac("sha256", secret).update(String(valor)).digest("hex");
}

/**
 * Hash lento e salgado do código (equivalente a uma senha).
 * É essa comparação que decide se o login é válido.
 */
export async function hashCodigo(codigo) {
  const custo = Number(process.env.BCRYPT_COST || 12);
  return bcrypt.hash(codigo, custo);
}

export async function verificarCodigo(codigo, hash) {
  return bcrypt.compare(codigo, hash);
}

export function ultimosDoisDigitos(codigo) {
  return codigo.slice(-2);
}

export function mascararCodigo(ultimosDois) {
  return "******" + ultimosDois;
}

// ============================================================
// Parte 2 — criptografia simétrica do conteúdo das conversas
// (isto estava sendo IMPORTADO em services/conversation.js mas
// nunca existia neste arquivo — por isso o back não subia)
// ============================================================

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12; // 96 bits — tamanho recomendado para GCM

function obterChaveEncriptacao() {
  const chaveHex = process.env.ENCRYPTION_KEY;
  if (!chaveHex) {
    throw new Error("ENCRYPTION_KEY não definido no .env");
  }
  const chave = Buffer.from(chaveHex, "hex");
  if (chave.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY precisa ter 32 bytes (64 caracteres hex). Gere com: openssl rand -hex 32"
    );
  }
  return chave;
}

/**
 * Criptografa um texto com AES-256-GCM (autenticado: qualquer
 * alteração no dado guardado faz a descriptografia falhar em vez
 * de devolver lixo silenciosamente).
 * Guarda tudo num único campo TEXT no formato:
 *   <iv base64>.<tag base64>.<dados base64>
 */
export function criptografar(textoPlano) {
  const chave = obterChaveEncriptacao();
  const iv = crypto.randomBytes(TAMANHO_IV);
  const cifra = crypto.createCipheriv(ALGORITMO, chave, iv);

  const dadosCriptografados = Buffer.concat([
    cifra.update(String(textoPlano), "utf8"),
    cifra.final(),
  ]);
  const tag = cifra.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${dadosCriptografados.toString("base64")}`;
}

/**
 * Reverte criptografar(). Lança erro se o dado foi corrompido ou
 * adulterado (auth tag não bate) ou se a chave estiver errada.
 */
export function descriptografar(valorCriptografado) {
  const chave = obterChaveEncriptacao();
  const partes = String(valorCriptografado).split(".");
  if (partes.length !== 3) {
    throw new Error("Formato de dado criptografado inválido.");
  }
  const [ivB64, tagB64, dadosB64] = partes;

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const dados = Buffer.from(dadosB64, "base64");

  const decifra = crypto.createDecipheriv(ALGORITMO, chave, iv);
  decifra.setAuthTag(tag);

  const textoPlano = Buffer.concat([decifra.update(dados), decifra.final()]);
  return textoPlano.toString("utf8");
}
