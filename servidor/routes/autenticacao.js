import express from "express";
import * as controller from "../controllers/autenticacao.js";
import validarToken from "../middlewares/validarToken.js";
import { limiteLogin, limiteCadastro } from "../middlewares/rateLimiters.js";

const router = express.Router();

router.post("/cadastro", limiteCadastro, controller.cadastrar);
router.post("/login", limiteLogin, controller.login);
router.get("/perfil", validarToken, controller.perfil);

export default router;
