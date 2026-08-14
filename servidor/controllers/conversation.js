import {
  criarConversa,
  listarConversasPorUsuario,
  buscarConversaPorId,
} from "../services/conversation.js";

// Limites simples para não deixar qualquer payload gigante entrar
// no banco (alinhado ao limite de body configurado no server.js).
const TAMANHO_MAX_NOME = 255;
const TAMANHO_MAX_TEXTO = 20000;

function validarCampoTexto(valor, nomeCampo, tamanhoMax) {
  if (typeof valor !== "string" || valor.trim().length === 0) {
    return `${nomeCampo} é obrigatório e deve ser um texto não vazio.`;
  }
  if (valor.length > tamanhoMax) {
    return `${nomeCampo} excede o tamanho máximo de ${tamanhoMax} caracteres.`;
  }
  return null;
}

export async function criarConversaController(req, res, next) {
  try {
    const { name_conversation, text_input, text_output } = req.body;
    // FIX: validarToken grava req.usuarioId (número), não
    // req.usuario.id_user — esse objeto "req.usuario" nunca existiu,
    // então toda chamada aqui quebrava com "Cannot read properties
    // of undefined".
    const idUsuario = req.usuarioId;

    const erros = [
      validarCampoTexto(name_conversation, "name_conversation", TAMANHO_MAX_NOME),
      validarCampoTexto(text_input, "text_input", TAMANHO_MAX_TEXTO),
      validarCampoTexto(text_output, "text_output", TAMANHO_MAX_TEXTO),
    ].filter(Boolean);

    if (erros.length > 0) {
      const erro = new Error(erros.join(" "));
      erro.statusCode = 400;
      throw erro;
    }

    const resultado = await criarConversa(idUsuario, name_conversation, text_input, text_output);
    res.status(201).json({ Resposta: "Conversa salva com sucesso", ...resultado });
  } catch (error) {
    next(error);
  }
}

export async function listarConversasController(req, res, next) {
  try {
    const idUsuario = req.usuarioId;
    const conversas = await listarConversasPorUsuario(idUsuario);
    res.status(200).json({ Resposta: "Conversas encontradas", conversas });
  } catch (error) {
    next(error);
  }
}

export async function buscarConversaController(req, res, next) {
  try {
    const idUsuario = req.usuarioId;
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      const erro = new Error("Id de conversa inválido.");
      erro.statusCode = 400;
      throw erro;
    }

    const conversa = await buscarConversaPorId(id, idUsuario);
    res.status(200).json({ Resposta: "Conversa encontrada", conversa });
  } catch (error) {
    next(error);
  }
}
