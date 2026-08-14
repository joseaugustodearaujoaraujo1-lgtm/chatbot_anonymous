import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import pool from "./configs/pool.js";
import rotasAutenticacao from "./routes/autenticacao.js";
import rotasConversation from "./routes/conversation.js";

dotenv.config();

const app = express();
const porta = process.env.PORTA_SERVIDOR || 3001;

export default async function VerificarConexao() {
  try {
    const pegarConexao = await pool.getConnection();
    console.log("Sucesso ao conectar!");
    pegarConexao.release();
  } catch (error) {
    console.log("Erro ao conectar!", error);
  }
}

VerificarConexao();

// FIX/IMPORTANTE: seu bloqueio por força bruta depende de req.ip
// estar correto (services/autenticacao.js usa hashLookup(ip)).
// Se o Node rodar atrás de um proxy reverso (Nginx, Render, Railway,
// Cloudflare etc.), sem isso req.ip vira sempre o IP do proxy —
// e aí um único usuário errando o código bloquearia TODO MUNDO.
// Ajuste o número conforme quantos proxies existem na frente do seu
// servidor (1 é o caso comum de um único reverse proxy). Se você
// expõe o Node diretamente para a internet (sem proxy), REMOVA esta
// linha — do contrário, um cliente poderia forjar o header
// X-Forwarded-For e burlar o próprio rate limit.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
// Limite de tamanho do corpo da requisição: evita que alguém mande
// payloads gigantes para tentar derrubar o servidor (DoS simples).
app.use(express.json({ limit: "100kb" }));

app.use("/autenticacao", rotasAutenticacao);
app.use("/conversation", rotasConversation);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ Resposta: "Rota não encontrada" });
});

// Middleware de erro global — sempre por último, sempre 4 parâmetros
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({ Resposta: err.message || "Erro interno do servidor" });
});

app.listen(porta, () => {
  console.log(`http://localhost:${porta}`);
});
