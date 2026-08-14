# anonymous — frontend

Frontend responsivo de um chatbot privado, criado com Next.js (App Router), CSS Modules e Axios.

O layout ocupa 100% da largura e da altura do navegador. A home usa Three.js para renderizar o cadeado em 3D e GSAP para controlar a sequência de entrada, giro, fechamento, pulso de escala e saída.

## Pré-requisitos

- Node.js 20 ou superior
- Backend rodando em `http://localhost:3001`

## Como executar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

O projeto já inclui o arquivo `.env` com as URLs informadas. Para usar outros endereços, altere esse arquivo e reinicie o servidor do Next.js.

```env
BACKEND_API_URL=http://localhost:3001
AI_WEBHOOK_URL=https://seu-webhook-privado
```

## Rotas do frontend

- `/` — página inicial
- `/cadastro` — gera o código anônimo de 8 dígitos
- `/login` — autenticação pelo código
- `/chat` — conversa e persistência
- `/historico` — busca e ordenação do histórico

## Contrato utilizado do backend

```text
POST /autenticacao/cadastro   body: {}
POST /autenticacao/login      body: { "codigo": "12345678" }
GET  /autenticacao/perfil     Authorization: Bearer <token>
GET  /conversation/           Authorization: Bearer <token>
GET  /conversation/:id        Authorization: Bearer <token>
POST /conversation/           body: {
  "name_conversation": "Título",
  "text_input": "Pergunta",
  "text_output": "Resposta"
}
```

O token retornado pelo login é guardado no `localStorage` e anexado automaticamente pelo interceptor Axios.

## Observação sobre a IA

O navegador envia a pergunta para `POST /api/chat`, uma rota interna do Next.js. Essa rota chama o webhook do n8n usando `AI_WEBHOOK_URL`, envia os campos `message` e `chatInput` e interpreta a resposta no formato informado:

```json
[
  {
    "output": "Resposta do agente de IA"
  }
]
```

Depois, o frontend mostra o valor de `output` no chat e salva pergunta e resposta no backend de conversas.

`AI_WEBHOOK_URL` não usa o prefixo `NEXT_PUBLIC_`, portanto não é incorporada ao JavaScript enviado ao navegador. Em produção, configure essa variável diretamente na plataforma de hospedagem.

O mesmo vale para `BACKEND_API_URL`. O navegador acessa apenas `/api/backend`; uma rota interna do Next.js encaminha a requisição ao servidor verdadeiro e repassa o token de autenticação. Nenhuma das duas URLs é incluída no bundle público.

O `.env` está listado no `.gitignore`. Não publique esse arquivo em GitHub, hospedagens estáticas ou qualquer repositório público. Configure as variáveis secretas diretamente no painel da sua hospedagem.

## CORS no backend

O backend precisa aceitar requisições do frontend. Em Express, uma configuração comum é:

```js
import cors from "cors";

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
```

Se o backend estiver em outro endereço, altere `BACKEND_API_URL` no `.env`.

## Build de produção

```bash
npm run build
npm start
```
