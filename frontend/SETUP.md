# Complete Setup Guide

## 1. PostgreSQL (Terminal)
```bash
brew services start postgresql@16
sleep 3
pg_isready -h localhost -p 5432
```

## 2. Backend (IntelliJ)
1. Open `/spring-boot-backend`
2. File → Project Structure → Set Java 21 SDK
3. Load Gradle project (wait for sync)
4. Run → Edit Configurations → + → Spring Boot
   - Name: `FleetExpenseApplication`
   - Main class: `FleetExpenseApplication`
5. Click green ▶️ button
6. Verify: http://localhost:8080/api/v1

## 3. Frontend (WebStorm)
1. Open `/frontend`
2. Terminal: `pnpm install`
3. Run → Edit Configurations → + → npm
   - Name: `dev`
   - Command: `run`
   - Script: `dev`
4. Click green ▶️ button
5. Opens http://localhost:3000

## 4. Test
http://localhost:3000/register → Fill form → Submit

## Errors?
Message me with the exact error from IDE console.
