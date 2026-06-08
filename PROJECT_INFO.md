# Project Information

## Group Members

- Student 1:
- Student 2:
- Student 3 (if applicable):

## Project Theme

F1 Race Manager Pessoal

## External API Used

- API name: Jolpica F1 Results Scraper (Apify)
- API link: https://apify.com/jungle_synthesizer/jolpica-f1-results-scraper/api/openapi
- Requires API key? Yes

## Frontend Repository

- Link: ../F1_tracker_frontend

## Entities

1. User
2. Driver of the Day Vote
3. Favorite Circuit

## Main Features

1. JWT authentication with hashed passwords
2. Real Formula 1 results through Apify with in-memory cache
3. Personal votes, favorite circuits and user profile

## Endpoints

- GET /api/
- POST /api/auth/register
- POST /api/auth/login
- GET /api/f1/races
- POST /api/f1/vote
- POST /api/f1/favorites
- GET /api/user/profile

## Notes

SQLite is used as the local relational database. The Angular development
server is allowed through CORS at http://localhost:4200.
