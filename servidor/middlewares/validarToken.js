import jwt from "jsonwebtoken";

export default function validarToken(req, res, next) {
  const header = req.headers.authorization || "";
  const [esquema, token] = header.split(" ");

  if (esquema !== "Bearer" || !token) {
    return res.status(401).json({ Resposta: "Não autenticado." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // FIX: valida que o token tem o claim esperado antes de confiar
    // nele — um token malformado (mas assinado com outra chave que
    // por engano bateu, ou payload manipulado antes de assinar) não
    // deve virar um req.usuarioId inválido usado em queries depois.
    if (!payload || (typeof payload.sub !== "number" && typeof payload.sub !== "string")) {
      return res.status(401).json({ Resposta: "Sessão inválida ou expirada." });
    }

    req.usuarioId = payload.sub;
    return next();
  } catch (err) {
    return res.status(401).json({ Resposta: "Sessão inválida ou expirada." });
  }
}
