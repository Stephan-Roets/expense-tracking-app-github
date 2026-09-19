# GitHub-ready project

This directory contains the application source needed to develop and build the project:

- `frontend/` - Next.js frontend
- `spring-boot-backend/` - Spring Boot API, migrations, and tests
- Tax Summary implementation documentation

Excluded intentionally:

- Database exports and local SQL dumps containing application data
- OCI keys, credentials, and environment files
- Uploaded images and runtime storage
- Generated JARs, Gradle/Next.js build output, dependencies, logs, and IDE files
- Production deployment, backup, and server-maintenance scripts
- Local test helpers containing credentials

## Before first push

1. Review the source for any organization-specific or private information.
2. Copy `frontend/.env.example` to `frontend/.env.local` locally and fill in values; never commit it.
3. Create `spring-boot-backend/.env` locally with database, JWT, CORS, and email settings; never commit it.
4. Install dependencies and run the frontend build:

```bash
cd frontend
npm ci
npm run build
```

5. Run backend tests/build:

```bash
cd spring-boot-backend
./gradlew test
./gradlew build
```

## Creating the repository

From this directory:

```bash
git init
git add .
git status
git commit -m "Prepare application for GitHub"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

Use a private GitHub repository unless you have completed a separate privacy and license review.
