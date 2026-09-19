# Run Guide

## PostgreSQL (Terminal - I run this)
```bash
brew services start postgresql@16
pg_isready -h localhost -p 5432
```

## Backend (IntelliJ)
1. Open `/spring-boot-backend`
2. Set Java 21 SDK
3. Load Gradle project
4. Run `FleetExpenseApplication`
5. Verify: http://localhost:8080/api/v1

## Frontend (WebStorm)
1. Open `/frontend`
2. Terminal: `pnpm install`
3. Run: `pnpm dev`
4. Open: http://localhost:3000

## Test
http://localhost:3000/register → Fill form → Submit

## Errors?
Tell me the error message from IDE console.
