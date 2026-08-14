import rateLimit from "express-rate-limit";

/**
 * Primeira camada de defesa (por IP, na própria rota). A camada que
 * realmente decide o bloqueio é a tabela `login_attempts`, tratada em
 * services/autenticacao.js — esta aqui é só para aliviar carga do
 * servidor contra scripts batendo direto na API.
 */
export const limiteLogin = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { Resposta: "Muitas tentativas de login a partir deste IP. Tente novamente mais tarde." },
});

export const limiteCadastro = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { Resposta: "Muitas tentativas de cadastro a partir deste IP. Tente novamente mais tarde." },
});

// FIX: routes/conversation.js importa limiteGeral, mas esse limiter
// nunca existia neste arquivo — quebrava o import assim que o
// servidor tentava carregar as rotas de conversa.
export const limiteGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { Resposta: "Muitas requisições a partir deste IP. Tente novamente mais tarde." },
});
