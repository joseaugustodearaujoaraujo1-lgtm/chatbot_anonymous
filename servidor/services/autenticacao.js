import pool from "../configs/pool.js";
import { gerarCodigo } from "../utils/gerarCodigo.js";
import {
  hashLookup,
  hashCodigo,
  verificarCodigo,
  ultimosDoisDigitos,
  mascararCodigo,
} from "../utils/criptografia.js";
import { calcularBloqueioMs } from "../utils/backoff.js";
import jwt from "jsonwebtoken"

const MAX_TENTATIVAS_GERAR = 5;

// Hash bcrypt inválido, só para gastar um tempo de CPU parecido com uma
// verificação real quando o código não existe — dificulta descobrir por
// timing se aquele código está cadastrado ou não.
const HASH_INVALIDO = "$2b$12$invalidinvalidinvalidinvalidinvalidinva";

async function buscarUsuarioPorLookup(lookupHash) {
  const [linhas] = await pool.query(
    "SELECT * FROM usuarios WHERE lookup_hash = ? LIMIT 1",
    [lookupHash]
  );
  return linhas[0] || null;
}

/**
 * Cria uma nova conta com um código gerado no servidor.
 * O código em texto puro só existe nesta função — depois disso,
 * só o hash dele fica salvo.
 */
export async function criarConta() {
  let codigo = null;
  let lookupHash = null;
  let tentativas = 0;

  // Colisão é extremamente improvável (1 em 100 milhões), mas o código
  // trata o caso mesmo assim em vez de assumir que nunca vai acontecer.
  while (tentativas < MAX_TENTATIVAS_GERAR) {
    const candidato = gerarCodigo();
    const hashCandidato = hashLookup(candidato);
    const existente = await buscarUsuarioPorLookup(hashCandidato);
    if (!existente) {
      codigo = candidato;
      lookupHash = hashCandidato;
      break;
    }
    tentativas += 1;
  }

  if (!codigo) {
    const erro = new Error("Não foi possível gerar um código único agora. Tente novamente.");
    erro.statusCode = 503;
    throw erro;
  }

  const codeHash = await hashCodigo(codigo);
  const codeLastTwo = ultimosDoisDigitos(codigo);

  const [resultado] = await pool.query(
    "INSERT INTO usuarios (lookup_hash, code_hash, code_last_two) VALUES (?, ?, ?)",
    [lookupHash, codeHash, codeLastTwo]
  );

  return {
    usuarioId: resultado.insertId,
    codigo, // devolvido em texto puro só aqui, uma única vez
    codigoMascarado: mascararCodigo(codeLastTwo)
  };
}

async function buscarTentativaPorIp(ipHash) {
  const [linhas] = await pool.query(
    "SELECT * FROM login_attempts WHERE ip_hash = ? LIMIT 1",
    [ipHash]
  );
  return linhas[0] || null;
}

/**
 * IMPORTANTE SOBRE O DESIGN DO BLOQUEIO:
 * Como o próprio código é usado para localizar a conta (lookup_hash),
 * um bloqueio "por conta" não funciona contra força bruta: um código
 * ERRADO praticamente nunca bate com o hash de uma conta existente,
 * então a tentativa cai sempre no ramo "não encontrado" — nenhuma
 * conta real chega a acumular tentativas falhas.
 * Por isso o controle de força bruta é feito por IP, na tabela
 * `login_attempts`, junto com o rate limit da rota (rateLimiters.js).
 */
export async function autenticar(codigo, ip) {
  const ipHash = hashLookup(ip);
  const tentativa = await buscarTentativaPorIp(ipHash);

  if (tentativa && tentativa.lock_until && new Date(tentativa.lock_until) > new Date()) {
    const esperaMs = new Date(tentativa.lock_until).getTime() - Date.now();
    const erro = new Error("Muitas tentativas erradas a partir deste endereço. Tente novamente mais tarde.");
    erro.statusCode = 429;
    erro.retryInSeconds = Math.ceil(esperaMs / 1000);
    throw erro;
  }

  const lookupHash = hashLookup(codigo);
  const usuario = await buscarUsuarioPorLookup(lookupHash);

  const valido = usuario
    ? await verificarCodigo(codigo, usuario.code_hash)
    : await verificarCodigo(codigo, HASH_INVALIDO).then(() => false);

  if (!valido) {
    const novoCount = (tentativa ? tentativa.failed_count : 0) + 1;
    const bloqueioMs = calcularBloqueioMs(novoCount);
    const lockUntil = bloqueioMs > 0 ? new Date(Date.now() + bloqueioMs) : null;

    if (tentativa) {
      await pool.query(
        "UPDATE login_attempts SET failed_count = ?, lock_until = ? WHERE ip_hash = ?",
        [novoCount, lockUntil, ipHash]
      );
    } else {
      await pool.query(
        "INSERT INTO login_attempts (ip_hash, failed_count, lock_until) VALUES (?, ?, ?)",
        [ipHash, novoCount, lockUntil]
      );
    }

    const erro = new Error("Código inválido.");
    erro.statusCode = 401;
    throw erro;
  }

  // Sucesso: reseta o contador de tentativas deste IP e registra o login
  if (tentativa) {
    await pool.query(
      "UPDATE login_attempts SET failed_count = 0, lock_until = NULL WHERE ip_hash = ?",
      [ipHash]
    );
  }
  await pool.query("UPDATE usuarios SET last_login_at = NOW() WHERE id = ?", [usuario.id]);

  return {
    usuario,
    codigoMascarado: mascararCodigo(usuario.code_last_two)  
  };
}

export async function buscarPerfil(usuarioId) {
  const [linhas] = await pool.query("SELECT * FROM usuarios WHERE id = ? LIMIT 1", [usuarioId]);
  return linhas[0] || null;
}
