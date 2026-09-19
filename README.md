# Vehicle Expenses & Tax Compliance System

A full-stack application for tracking vehicle expenses, managing trips, and maintaining SARS-compliant tax records for South African businesses and individuals.

## Tech Stack

### Backend
- **Java 21** with Spring Boot 3.3.5
- **Gradle** build system
- **PostgreSQL 16** database
- **JWT** authentication
- **Brevo** email service

### Frontend
- **Next.js 16.2.6** with React 19
- **TypeScript**
- **TailwindCSS** for styling
- **shadcn/ui** components
- **pnpm** package manager

## Project Structure

```
expense-tracking-app/
├── spring-boot-backend/     # Spring Boot API
│   ├── src/main/java/       # Java source code
│   ├── src/main/resources/  # Configuration files
│   ├── build.gradle         # Gradle build config
│   └── .env.example         # Environment variables template
├── frontend/                # Next.js frontend
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   ├── lib/                 # Utilities and API client
│   ├── next.config.mjs      # Next.js configuration
│   └── .env.example         # Environment variables template
└── README.md               # This file
```

## Environment Variables

### Backend (.env.example)
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_tracking_app
DB_USERNAME=your_username
DB_PASSWORD=your_password
JWT_SECRET=your-jwt-secret
CORS_ALLOWED_ORIGINS=http://localhost:3000
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=your-sender-email@your-domain.com
```

### Frontend (.env.example)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

## Getting Started

### Prerequisites
- Java 21
- PostgreSQL 16
- Node.js 18+
- pnpm

### Backend Setup
```bash
cd spring-boot-backend
cp .env.example .env
# Edit .env with your database credentials
./gradlew bootRun
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

## Development

- Backend runs on `http://localhost:8080`
- Frontend runs on `http://localhost:3000`
- Health check: `http://localhost:8080/api/v1/health`

## Production Deployment

See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for detailed deployment instructions.

## License

Proprietary
