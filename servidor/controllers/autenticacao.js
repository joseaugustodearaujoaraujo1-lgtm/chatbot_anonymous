import jwt from "jsonwebtoken";
// FIX: services/autenticacao.js exporta funções nomeadas soltas
// (export async function criarConta...), não um objeto default
// chamado "autenticacaoService". O import antigo (`{ autenticacaoService }`)
// resultava em undefined e quebrava em runtime na primeira chamada.
import * as autenticacaoService from "../services/autenticacao.js";

function assinarToken(usuarioId) {
  return jwt.sign({ sub: usuarioId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export async function cadastrar(req, res, next) {
  try {
    const resultado = await autenticacaoService.criarConta();
    return res.status(201).json({
      usuarioId: resultado.usuarioId,
      codigo: resultado.codigo, // front deve mostrar uma única vez e orientar o usuário a salvar
      codigoMascarado: resultado.codigoMascarado
    });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { codigo } = req.body;

    if (!codigo || typeof codigo !== "string" || !/^\d{8}$/.test(codigo)) {
      return res.status(400).json({ Resposta: "Código inválido." });
    }

    const resultado = await autenticacaoService.autenticar(codigo, req.ip);
    const token = assinarToken(resultado.usuario.id);

    return res.json({ token, codigoMascarado: resultado.codigoMascarado });
  } catch (err) {
    if (err.statusCode === 429) {
      return res.status(429).json({
        Resposta: err.message,
        tentarNovamenteEmSegundos: err.retryInSeconds,
      });
    }
    return next(err);
  }
}

export async function perfil(req, res, next) {
  try {
    const usuario = await autenticacaoService.buscarPerfil(req.usuarioId);
    if (!usuario) return res.status(404).json({ Resposta: "Usuário não encontrado." });

    return res.json({
      usuarioId: usuario.id,
      codigoMascarado: "******" + usuario.code_last_two,
      ultimoLogin: usuario.last_login_at,
    });
  } catch (err) {
    return next(err);
  }
}
