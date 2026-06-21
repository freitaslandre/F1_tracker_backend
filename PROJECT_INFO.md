# Project Information

## Group Members

- Student 1:
- Student 2:
- Student 3:

## Project Theme

F1 Tracker / F1 Race Manager Pessoal

## Project Description

API backend para uma aplicacao de Formula 1. A API fornece autenticacao, dados reais de corridas e classificacoes, perfil do utilizador, favoritos, votos de Piloto do Dia e funcionalidades Fantasy F1.

## External API Used

- API name: Jolpica F1 Results Scraper via Apify
- API link: https://apify.com/jungle_synthesizer/jolpica-f1-results-scraper/api/openapi
- Requires API key? Yes, `APIFY_TOKEN`

## Frontend Repository

- Link: ../F1_tracker_frontend

## Backend Technologies

- Node.js 20+
- Express
- Firebase Admin SDK
- Firestore
- bcryptjs
- JSON Web Tokens
- Swagger / OpenAPI

## Entities

1. User
2. Favorite Circuit
3. Driver of the Day Vote
4. Fantasy Team
5. Fantasy Score

## Main Features

1. User registration, login, session check and logout.
2. Password hashing and authenticated routes.
3. Formula 1 races and standings through the Apify Actor, with in-memory cache.
4. Favorite circuits and Driver of the Day votes per user.
5. Fantasy F1 team persistence, race scoring and leaderboard.
6. Swagger documentation.

## Endpoints

- `GET /api/`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/f1/races`
- `GET /api/f1/standings`
- `POST /api/f1/vote`
- `DELETE /api/f1/vote/:season/:round`
- `POST /api/f1/favorites`
- `DELETE /api/f1/favorites/:circuitId`
- `GET /api/fantasy/leaderboard`
- `GET /api/fantasy/team`
- `PUT /api/fantasy/team`
- `DELETE /api/fantasy/team`
- `GET /api/fantasy/scores`
- `POST /api/fantasy/score-race`
- `GET /api/user/profile`

## Data Stored in the Backend

- Users and email index
- Favorite circuits
- Driver of the Day votes
- Fantasy teams
- Fantasy scores
- User counter for numeric IDs

## Notes

Firestore is used as the database. The frontend development server is allowed through CORS at `http://localhost:4200` by default. The API documentation is available at `/api-docs` when the backend is running.
