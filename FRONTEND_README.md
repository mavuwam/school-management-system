# School Management System - Frontend Demo

## Overview

A visual demonstration of the School Management System with role-based dashboards for Students, Teachers, School Heads, and Parents.

## Running the Frontend

The development server is already running at: **http://localhost:5173/**

Open this URL in your browser to see the application.

## Features

### Login Page
- Select from 4 different user roles to see their respective dashboards
- Demo users are pre-configured for easy testing

### Student Dashboard
- View grades across all subjects with trends
- Check attendance statistics
- See pending assignments with due dates
- Monitor payment balance
- View today's timetable

### Teacher Dashboard
- Manage multiple classes
- View class averages and student counts
- Enter and review grades
- Track pending grading work
- View teaching schedule

### School Head Dashboard
- School-wide statistics (students, teachers, attendance)
- Academic performance overview
- Financial reports and outstanding fees
- Staff management
- Recent activity log

### Parent Dashboard
- Monitor multiple children's progress
- View each child's GPA and attendance
- Track upcoming assignments
- Manage payment balances for all children

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Custom CSS with modern design
- **Backend**: TypeScript services (already implemented)

## Demo Data

All data shown is mock data for demonstration purposes. The actual backend services are fully implemented and tested with 305 passing tests.

## Commands

```bash
# Start development server (already running)
npm run dev

# Build for production
npm run build:frontend

# Run backend tests
npm test
```

## Next Steps

To connect this frontend to the backend:
1. Implement REST API endpoints (Task 19 in tasks.md)
2. Add API client to fetch real data
3. Implement authentication flow
4. Add state management (Redux/Zustand)
5. Connect forms to backend services

## Design Features

- Clean, modern UI with gradient accents
- Responsive grid layouts
- Role-specific color schemes
- Interactive cards and buttons
- Real-time statistics display
- Intuitive navigation
