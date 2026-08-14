import pool from "../configs/pool.js";
import { criptografar, descriptografar } from "../utils/criptografia.js";

export async function criarConversa(idUsuario, nomeConversa, textoInput, textoOutput) {
  const inputCriptografado = criptografar(textoInput);
  const outputCriptografado = criptografar(textoOutput);

  const [resultado] = await pool.query(
    `INSERT INTO conversation (name_conversation, text_input, FK_id_user, text_output)
     VALUES (?, ?, ?, ?)`,
    [nomeConversa, inputCriptografado, idUsuario, outputCriptografado]
  );

  return { id_conversation: resultado.insertId };
}

export async function listarConversasPorUsuario(idUsuario) {
  const [linhas] = await pool.query(
    `SELECT id_conversation, name_conversation, text_input, text_output, create_at, update_at
     FROM conversation WHERE FK_id_user = ? ORDER BY create_at DESC`,
    [idUsuario]
  );

  return linhas.map((linha) => ({
    ...linha,
    text_input: descriptografar(linha.text_input),
    text_output: descriptografar(linha.text_output),
  }));
}

export async function buscarConversaPorId(idConversa, idUsuario) {
  const [linhas] = await pool.query(
    `SELECT id_conversation, name_conversation, text_input, text_output, create_at, update_at
     FROM conversation WHERE id_conversation = ? AND FK_id_user = ?`,
    [idConversa, idUsuario]
  );

  // idUsuario entra no WHERE, não só no filtro depois — assim uma
  // conversa de outra conta nunca é nem lida do banco (proteção
  // contra IDOR: ninguém adivinha um id e lê conversa alheia).
  if (linhas.length === 0) {
    const erro = new Error("Conversa não encontrada");
    erro.statusCode = 404;
    throw erro;
  }

  const conversa = linhas[0];
  return {
    ...conversa,
    text_input: descriptografar(conversa.text_input),
    text_output: descriptografar(conversa.text_output),
  };
}
