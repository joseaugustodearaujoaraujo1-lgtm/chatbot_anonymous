// FIX: estava "import crypt from 'crypto'" mas o código usava a
// variável "crypto" — ReferenceError toda vez que criarConta() rodava.
import crypto from "crypto";

const CODE_LENGTH = 8;
const CODE_MAX = 10 ** CODE_LENGTH; // 100.000.000 combinações possíveis

/**
 * Gera um código numérico de 8 dígitos usando um gerador
 * criptograficamente seguro (nunca Math.random()).
 */
function gerarCodigo() {
  const n = crypto.randomInt(0, CODE_MAX);
  return String(n).padStart(CODE_LENGTH, "0");
}

export { gerarCodigo, CODE_LENGTH };
