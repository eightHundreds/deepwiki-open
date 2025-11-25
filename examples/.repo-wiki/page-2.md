# Getting Started

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional, for caching)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourorg/yourproject.git
cd yourproject
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=postgres
DB_PASSWORD=your_password

# API Configuration
API_PORT=3000
API_KEY=your_api_key

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. Database Setup

Run the database migrations:

```bash
npm run migrate
```

Seed the database with initial data:

```bash
npm run seed
```

### 5. Start the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Quick Test

Once the application is running, you can test it:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Next Steps

- Read the [Core Features](page-3.md) documentation
- Check out the [API Reference](page-4.md)
- Explore the [Architecture Overview](page-1.md)

## Troubleshooting

### Port Already in Use

If you get an error about port 3000 being in use:

```bash
# Find the process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database Connection Issues

- Verify PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
- Check your `.env` file for correct credentials
- Ensure the database exists: `createdb myapp`

### Module Not Found Errors

Clear the node_modules and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Related Pages

- [Architecture Overview](page-1.md)
- [Core Features](page-3.md)
