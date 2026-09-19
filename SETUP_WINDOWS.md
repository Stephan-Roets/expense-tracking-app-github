# Windows Setup Guide - Fleet Expense Tracking App

Complete setup instructions for running the Fleet Expense Tracking Application on Windows 10/11.

---

## Prerequisites

| Software | Version | Download Link |
|----------|---------|---------------|
| PostgreSQL | 16 | https://www.postgresql.org/download/windows/ |
| Java | 21 (JDK) | https://www.oracle.com/java/technologies/downloads/#java21 |
| Gradle | 8.14.5+ | https://gradle.org/install/ |
| Node.js | 18+ | https://nodejs.org/ |
| pnpm | Latest | `npm install -g pnpm` |
| IntelliJ IDEA | Latest (Community or Ultimate) | https://www.jetbrains.com/idea/download/ |
| WebStorm | Latest (optional, or use VS Code) | https://www.jetbrains.com/webstorm/download/ |

---

## 1. PostgreSQL 16 Setup

### Install PostgreSQL
1. Download PostgreSQL 16 for Windows from the official site
2. Run the installer
3. During installation, set these values:
   - **Password**: `test123` (or your preferred password)
   - **Port**: `5432`
   - **Components**: Keep defaults (pgAdmin 4, Command Line Tools)

### Verify Installation
Open **Command Prompt** or **PowerShell** as Administrator:

```cmd
psql --version
```

### Create Database
Open **pgAdmin 4** or use Command Prompt:

**Using Command Prompt:**
```cmd
psql -U postgres -c "CREATE DATABASE expense_tracking_app;"
psql -U postgres -c "CREATE USER stefan WITH PASSWORD 'test123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE expense_tracking_app TO stefan;"
```

**Or using pgAdmin 4:**
1. Open pgAdmin 4
2. Right-click on Databases → Create → Database
3. Name: `expense_tracking_app`
4. Click Save
5. Right-click on Login/Group Roles → Create → Login/Group Role
6. Name: `stefan`, Password: `test123`
7. Go to Privileges tab and grant all privileges on `expense_tracking_app`

### Import Schema
1. Open Command Prompt in the project directory
2. Navigate to the database folder:
   ```cmd
   cd C:\path\to\1expense-tracking-app\database
   ```
3. Import the schema:
   ```cmd
   psql -h localhost -U stefan -d expense_tracking_app -f schema.sql
   ```
4. When prompted, enter password: `test123`

### Verify Database
```cmd
psql -h localhost -U stefan -d expense_tracking_app -c "\dt"
```

---

## 2. Java 21 Setup

### Install JDK
1. Download Oracle JDK 21 or OpenJDK 21
2. Run the installer
3. Follow the installation wizard

### Set JAVA_HOME (Windows 10/11)
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab → **Environment Variables**
3. Under **System variables**, click **New**:
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Java\jdk-21` (adjust to your installation path)
4. Edit **Path** variable:
   - Add: `%JAVA_HOME%\bin`
5. Click OK on all dialogs

### Verify Installation
Open new Command Prompt:
```cmd
java -version
javac -version
echo %JAVA_HOME%
```

---

## 3. Gradle Setup

### Option 1: Use Gradle Wrapper (Recommended)
The project includes Gradle Wrapper - no separate installation needed!

### Option 2: Install Gradle Manually
1. Download Gradle from https://gradle.org/install/
2. Extract to: `C:\gradle\gradle-8.14.5`
3. Set **GRADLE_HOME** environment variable:
   - Variable name: `GRADLE_HOME`
   - Variable value: `C:\gradle\gradle-8.14.5`
4. Add to **Path**: `%GRADLE_HOME%\bin`

### Verify Installation
```cmd
gradle --version
```

---

## 4. Node.js and pnpm Setup

### Install Node.js
1. Download Node.js LTS from https://nodejs.org/
2. Run the installer (include npm)
3. Restart Command Prompt

### Install pnpm
```cmd
npm install -g pnpm
```

### Verify Installation
```cmd
node --version
npm --version
pnpm --version
```

---

## 5. Project Setup

### Clone/Extract Project
Extract the project to a location without spaces in the path, e.g.:
```
C:\projects\1expense-tracking-app
```

### Backend Configuration (IntelliJ IDEA)
1. Open IntelliJ IDEA
2. **File** → **Open** → Select `spring-boot-backend` folder
3. Wait for Gradle sync to complete
4. **File** → **Project Structure** → **Project**:
   - SDK: Select Java 21
   - Language level: 21
5. Open `src/main/resources/application.properties` or `application.yml`
6. Verify database configuration:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/expense_tracking_app
   spring.datasource.username=stefan
   spring.datasource.password=test123
   ```

### Frontend Configuration
1. Open **WebStorm** or **VS Code**
2. Open the `frontend` folder
3. Create `.env.local` file in the frontend root:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
   ```
4. Open terminal in frontend folder:
   ```cmd
   cd C:\projects\1expense-tracking-app\frontend
   pnpm install
   ```

---

## 6. Run the Application

### Step 1: Start PostgreSQL
Open **Services** (Win + R, type `services.msc`):
- Find `postgresql-x64-16`
- Right-click → **Start**

Or use Command Prompt:
```cmd
net start postgresql-x64-16
```

### Step 2: Start Backend (IntelliJ IDEA)
1. In IntelliJ, open `FleetExpenseApplication.java`
2. Right-click on the file → **Run 'FleetExpenseApplication'**
3. Or use the green ▶️ button in the toolbar
4. Wait for: `Started FleetExpenseApplication in X.XXX seconds`
5. Verify: Open browser to http://localhost:8080/api/v1

### Step 3: Start Frontend
**Using WebStorm:**
1. Open terminal in WebStorm (frontend folder)
2. Run:
   ```cmd
   pnpm dev
   ```

**Using VS Code:**
1. Open terminal (Ctrl + `)
2. Run:
   ```cmd
   pnpm dev
   ```

**Using Command Prompt:**
```cmd
cd C:\projects\1expense-tracking-app\frontend
pnpm dev
```

3. Wait for: `Ready in X.Xs`
4. Open browser to http://localhost:3000

---

## 7. Test the Application

### Register a New User
1. Go to http://localhost:3000/register
2. Fill in the form:
   - **Email**: `test@example.com`
   - **Password**: `test1234`
   - **First Name**: `Test`
   - **Last Name**: `User`
   - **Organization Name**: `Test Org`
   - **Organization Mode**: `SOLO`
3. Click **Register**
4. You should be redirected to the dashboard

### Login
1. Go to http://localhost:3000/login
2. Enter your credentials
3. Click **Login**

---

## 8. Troubleshooting

### PostgreSQL Issues

**"psql: command not found"**
- Add PostgreSQL bin folder to PATH:
  - `C:\Program Files\PostgreSQL\16\bin`

**"Connection refused"**
- Ensure PostgreSQL service is running:
  ```cmd
  net start postgresql-x64-16
  ```

**"password authentication failed"**
- Reset postgres password:
  ```cmd
  psql -U postgres
  ALTER USER postgres WITH PASSWORD 'your_password';
  ```

### Java Issues

**"java is not recognized"**
- Verify JAVA_HOME is set correctly
- Restart Command Prompt after setting environment variables

**"Unsupported class file major version"**
- Ensure Java 21 is being used:
  ```cmd
  java -version
  ```

### Backend Issues

**"Port 8080 already in use"**
- Find and kill the process:
  ```cmd
  netstat -ano | findstr :8080
  taskkill /PID <PID> /F
  ```

**"Connection to database failed"**
- Verify PostgreSQL is running
- Check `application.properties` credentials
- Test connection:
  ```cmd
  psql -h localhost -U stefan -d expense_tracking_app
  ```

### Frontend Issues

**"pnpm: command not found"**
- Install pnpm:
  ```cmd
  npm install -g pnpm
  ```

**"Port 3000 already in use"**
- Kill the process:
  ```cmd
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```
- Or use a different port:
  ```cmd
  pnpm dev -- -p 3001
  ```

**"Module not found"**
- Delete `node_modules` and reinstall:
  ```cmd
  rmdir /s /q node_modules
  pnpm install
  ```

---

## 9. Development Workflow

### Backend Development (IntelliJ IDEA)
1. Make changes to Java code
2. Spring Boot will auto-reload with Spring DevTools
3. Check the IntelliJ console for errors

### Frontend Development (WebStorm/VS Code)
1. Make changes to React/Next.js code
2. Next.js will auto-reload in browser
3. Check the terminal for errors

### Database Changes
1. Edit SQL files in `database/` folder
2. Apply changes:
   ```cmd
   psql -h localhost -U stefan -d expense_tracking_app -f database/your_file.sql
   ```

---

## 10. Useful Commands

### PostgreSQL
```cmd
# Start service
net start postgresql-x64-16

# Stop service
net stop postgresql-x64-16

# Connect to database
psql -h localhost -U stefan -d expense_tracking_app

# List tables
psql -h localhost -U stefan -d expense_tracking_app -c "\dt"

# List users
psql -h localhost -U stefan -d expense_tracking_app -c "SELECT * FROM users;"
```

### Backend
```cmd
# Using Gradle wrapper (from spring-boot-backend folder)
gradlew.bat clean build
gradlew.bat bootRun

# Using IntelliJ
# Use the Run Configuration
```

### Frontend
```cmd
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

---

## 11. Firewall Configuration

If you encounter connection issues:

1. Open **Windows Defender Firewall**
2. **Advanced Settings** → **Inbound Rules**
3. **New Rule**:
   - **Port**: 5432 (PostgreSQL), 8080 (Backend), 3000 (Frontend)
   - **Allow the connection**
   - Select all profiles (Domain, Private, Public)
   - Name: `Fleet Expense App`

---

## 12. Quick Reference

| Service | Port | Command |
|---------|------|---------|
| PostgreSQL | 5432 | `net start postgresql-x64-16` |
| Backend | 8080 | Run from IntelliJ |
| Frontend | 3000 | `pnpm dev` |

**Database Credentials:**
- Database: `expense_tracking_app`
- User: `stefan`
- Password: `test123`
- Host: `localhost`
- Port: `5432`

**Default Test User** (if exists in database):
- Email: `stefan1@test.com`
- Password: `test1234`

---

## Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Check IntelliJ console for backend errors
3. Check terminal for frontend errors
4. Check PostgreSQL logs in pgAdmin or Event Viewer

---

## Architecture Overview

```
┌─────────────────┐
│   Browser       │
│  localhost:3000 │
└────────┬────────┘
         │
┌────────▼────────┐
│   Frontend      │
│   Next.js       │
│   pnpm          │
└────────┬────────┘
         │
┌────────▼────────┐
│   Backend       │
│   Spring Boot   │
│   Java 21       │
│   Gradle        │
└────────┬────────┘
         │
┌────────▼────────┐
│   PostgreSQL 16 │
│   Port 5432     │
└─────────────────┘
```

---

**Last Updated:** June 2026
