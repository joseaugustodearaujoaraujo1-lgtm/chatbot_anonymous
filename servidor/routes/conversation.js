import { Router } from "express";
import validarToken from "../middlewares/validarToken.js";
import { limiteGeral } from "../middlewares/rateLimiters.js";
import {
  criarConversaController,
  listarConversasController,
  buscarConversaController,
} from "../controllers/conversation.js";

const router = Router();

router.use(validarToken);
router.use(limiteGeral);

router.post("/", criarConversaController);
router.get("/", listarConversasController);
router.get("/:id", buscarConversaController);

export default router;
