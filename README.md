# School Management System

A comprehensive school management system with role-based access for students, teachers, school heads, and parents.

## Features

- Multi-tenant architecture supporting multiple schools
- Role-based access control (RBAC)
- Academic progress tracking (grades, attendance)
- Payment management
- Assignment and work management
- Timetable scheduling
- Real-time notifications
- Audit logging and data security

## Project Structure

```
src/
├── models/         # Data models and enums
├── interfaces/     # TypeScript interfaces
├── services/       # Business logic services
├── utils/          # Utility functions
├── middleware/     # Middleware functions
└── index.ts        # Main entry point
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Run tests:
```bash
npm test
```

## Development

- `npm run build` - Compile TypeScript to JavaScript
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code with ESLint
- `npm run format` - Format code with Prettier

## Testing

The project uses a dual testing approach:
- **Unit tests** with Jest for specific examples and edge cases
- **Property-based tests** with fast-check for universal correctness properties

## Architecture

The system follows a layered architecture:
- **Presentation Layer**: Role-specific views
- **Application Layer**: Services (Auth, User, School, Academic, Payment, Assignment, Timetable, Notification)
- **Data Layer**: Database, audit logs, file storage

## License

MIT
