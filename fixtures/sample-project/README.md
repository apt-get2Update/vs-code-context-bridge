# Sample API Project

A sample REST API built with Express and TypeScript.

## Architecture

This project follows a layered architecture:

- **Routes Layer** - Express route definitions
- **Controller Layer** - Request/response handling
- **Service Layer** - Business logic
- **Repository Layer** - Data access

## Endpoints

- GET /api/users - List all users
- GET /api/users/:id - Get user by ID
- POST /api/users - Create new user
- PUT /api/users/:id - Update user
- DELETE /api/users/:id - Delete user
- POST /api/auth/login - User login
- POST /api/auth/register - User registration

## Tech Stack

- Runtime: Node.js 20
- Language: TypeScript
- Framework: Express
- Database: PostgreSQL
- ORM: Prisma
