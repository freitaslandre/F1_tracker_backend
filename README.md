# F1 Tracker Backend

Backend Node.js + Express do projeto F1 Tracker. A API gere autenticacao, perfil do utilizador, favoritos, votos, equipas Fantasy F1 e a integracao com dados reais de Formula 1 atraves do Actor Jolpica F1 Results Scraper na Apify.

## Tecnologias

- Node.js 20+
- Express
- Firebase Admin SDK
- Firestore
- bcryptjs
- JSON Web Tokens
- Swagger / OpenAPI
- Apify Actor API

## Funcionalidades

- Registo e login de utilizadores com passwords encriptadas.
- Sessao autenticada por cookie HTTP.
- Middleware de autenticacao para rotas protegidas.
- Consulta de corridas e standings de Formula 1 por epoca.
- Cache em memoria para reduzir chamadas ao Actor da Apify.
- Guardar e remover circuitos favoritos.
- Criar, atualizar e remover votos de Piloto do Dia.
- Guardar, carregar e apagar equipas Fantasy F1.
- Pontuar corridas fantasy e consultar leaderboard.
- Documentacao interativa em Swagger.

## Instalar dependencias

```bash
npm install
```

## Configurar variaveis de ambiente

Copiar o ficheiro de exemplo:

```bash
cp .env.example .env
```

Variaveis principais:

```text
PORT=3000
FRONTEND_URL=http://localhost:4200
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
APIFY_TOKEN=your-apify-token
APIFY_ACTOR_URL=https://api.apify.com/v2/acts/jungle_synthesizer~jolpica-f1-results-scraper/run-sync-get-dataset-items
APIFY_MAX_ITEMS=600
APIFY_TIMEOUT_MS=120000
F1_CACHE_HOURS=3
FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/to/firebase-service-account.json
FIREBASE_PROJECT_ID=f1-race-manager
```

Em producao, tambem pode ser usado `FIREBASE_SERVICE_ACCOUNT_JSON` com o JSON da service account numa unica linha.
As variaveis opcionais `COOKIE_SECURE`, `COOKIE_SAMESITE` e `SESSION_COOKIE_MAX_AGE_MS` permitem ajustar o cookie de sessao em deploy.

## Executar localmente

```bash
npm run dev
```

Ou em modo de producao:

```bash
npm start
```

A API fica disponivel em:

```text
http://localhost:3000/api
```

A documentacao Swagger fica disponivel em:

```text
http://localhost:3000/api-docs
```

## Scripts disponiveis

```bash
npm start
npm run dev
npm run lint
npm run syntax
npm run validate
npm run quality
npm run grade
```

- `start`: executa `src/server.js`.
- `dev`: executa com `nodemon`.
- `lint`: valida codigo com ESLint.
- `syntax`: verifica sintaxe dos ficheiros principais.
- `validate`: verifica a estrutura minima exigida pelo projeto.
- `quality`: executa validacao, lint e syntax check.
- `grade`: gera a avaliacao automatica do template.

No Windows, o npm run grade original da template pode dar falso por erro ao chamar npm.cmd; os comandos individuais passam.

## Endpoints principais

### Geral

- `GET /api/`: health check da API.

### Autenticacao

- `POST /api/auth/register`: cria uma conta.
- `POST /api/auth/login`: autentica um utilizador.
- `GET /api/auth/me`: devolve o utilizador autenticado.
- `POST /api/auth/logout`: termina a sessao.

### Formula 1

- `GET /api/f1/races?season=2026`: devolve corridas/resultados de uma epoca.
- `GET /api/f1/standings?season=2026`: devolve classificacoes de uma epoca.
- `POST /api/f1/vote`: guarda ou atualiza o voto no Piloto do Dia.
- `DELETE /api/f1/vote/:season/:round`: remove um voto.
- `POST /api/f1/favorites`: guarda um circuito favorito.
- `DELETE /api/f1/favorites/:circuitId`: remove um circuito favorito.

### Fantasy

- `GET /api/fantasy/leaderboard`: devolve o ranking fantasy.
- `GET /api/fantasy/team`: devolve a equipa fantasy do utilizador.
- `PUT /api/fantasy/team`: cria ou atualiza a equipa fantasy.
- `DELETE /api/fantasy/team`: apaga a equipa fantasy.
- `GET /api/fantasy/scores`: devolve as pontuacoes fantasy do utilizador.
- `POST /api/fantasy/score-race`: calcula pontuacao para uma corrida.

### Utilizador

- `GET /api/user/profile`: devolve perfil, favoritos, votos e equipa fantasy.

## Autenticacao

As rotas protegidas usam o middleware `requireAuth`. Depois do login ou registo, o backend cria a sessao em cookie HTTP, e o frontend deve fazer pedidos com `withCredentials: true`.

## Persistencia de dados

Os dados sao guardados no Firestore, nas colecoes principais:

- `users`
- `user_emails`
- `favorites`
- `votes`
- `fantasy_teams`
- `fantasy_scores`
- `counters`

## Estrutura principal

```text
src/
+-- app.js              # configuracao Express, CORS, Swagger e rotas
+-- server.js           # entry point
+-- config/             # Firebase/Firestore e Swagger
+-- controllers/        # logica dos endpoints
+-- middleware/         # autenticacao e tratamento de erros
+-- models/             # acesso a dados no Firestore
+-- routes/             # definicao das rotas
+-- services/           # Apify e pontuacao fantasy
+-- utils/              # validacao e erros HTTP
```

## Notas

- `FRONTEND_URL` deve incluir a origem do frontend para o CORS aceitar cookies.
- `APIFY_TOKEN` e obrigatorio para consultar dados reais de Formula 1.
- O header `X-Cache` indica se a resposta de F1 veio da cache ou de uma nova chamada externa.
