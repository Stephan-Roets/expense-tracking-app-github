# Start and Stop Guide

## Starting the Project

### Backend (Spring Boot)
```bash
cd spring-boot-backend
./gradlew bootRun
```
The backend will start on port 8080.

### Frontend (Next.js)
```bash
cd frontend
pnpm dev
```
The frontend will start on port 3000 at http://localhost:3000

## Stopping the Project

### Stop Backend and Frontend (Windows)
```bash
taskkill /F /IM java.exe
taskkill /F /IM node.exe
```

### Or stop specific processes by PID
1. Find the process IDs:
```bash
netstat -ano | findstr ":8080 :3000"
```
2. Kill the processes:
```bash
taskkill /F /PID <backend_pid>
taskkill /F /PID <frontend_pid>
```

## Notes
- The backend requires Java and Gradle to be installed
- The frontend requires Node.js and pnpm to be installed
- Both servers must be running for the application to work properly
