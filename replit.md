# Neocortical Extension Layer

## Overview

This is a web-based MVP of the "Neocortical Extension Layer" - a personal thinking companion app that allows users to have structured conversations with themselves and transform those conversations into organized thoughts and articles. The app follows a progression from conversations to thought bubbles to structured articles, similar to a WeChat-style interface for self-reflection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Design**: RESTful API with structured endpoints
- **Development Server**: Vite development server integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database
- **ORM**: Drizzle ORM with migrations
- **Schema Management**: Drizzle Kit for database operations
- **Session Storage**: Connect-pg-simple for PostgreSQL session storage

## Key Components

### Database Schema
The application uses four main tables:
- **conversations**: Stores conversation metadata (id, name, timestamps)
- **messages**: Individual messages within conversations
- **bubbles**: Spatial positioning and categorization of messages as moveable thought bubbles
- **articles**: Compiled articles that reference specific bubbles

### Core Features
1. **Conversation Management**: Create, edit, and manage self-conversations
2. **Message Threading**: Chat-like interface for adding thoughts to conversations
3. **Bubble Transformation**: Convert messages into draggable thought bubbles with spatial positioning
4. **Article Creation**: Compile bubbles into structured articles with PDF export capability

### UI Components
- **Conversation Cards**: Display conversation overviews with stats
- **Message Bubbles**: Chat-style message display
- **Bubble Cards**: Draggable thought bubbles with categories and colors
- **PDF Preview Modal**: Article preview before export

## Data Flow

1. **Conversation Creation**: Users create named conversations
2. **Message Addition**: Users add messages to conversations in chat format
3. **Bubble Conversion**: Messages are converted to moveable bubbles with positioning data
4. **Article Compilation**: Selected bubbles are compiled into articles
5. **PDF Export**: Articles can be exported as formatted PDFs

### API Endpoints
- `/api/conversations` - CRUD operations for conversations
- `/api/messages` - Message management within conversations
- `/api/bubbles` - Bubble positioning and categorization
- `/api/articles` - Article creation and management

## External Dependencies

### Core Libraries
- **React Ecosystem**: React, React DOM, React Router (Wouter)
- **UI Framework**: Radix UI components, Lucide React icons
- **Database**: Drizzle ORM, Neon Database serverless driver
- **PDF Generation**: jsPDF for client-side PDF creation
- **Date Handling**: date-fns for date formatting
- **Validation**: Zod for schema validation

### Development Tools
- **Build Tool**: Vite with React plugin
- **Type Checking**: TypeScript with strict configuration
- **Styling**: Tailwind CSS with PostCSS
- **Development**: TSX for development server, ESBuild for production builds

## Deployment Strategy

### Development Environment
- **Development Server**: Uses Vite development server with HMR
- **Database**: Connects to Neon Database via environment variables
- **Asset Handling**: Vite handles static assets and bundling

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: ESBuild compiles Express server to `dist/index.js`
- **Database**: Drizzle migrations handle schema updates
- **Environment**: Requires `DATABASE_URL` environment variable for PostgreSQL connection

### Key Architecture Decisions

1. **Monorepo Structure**: Frontend, backend, and shared code in single repository for simplified development
2. **Drizzle ORM**: Chosen for type-safe database operations and excellent TypeScript integration
3. **Shadcn/ui**: Provides consistent, accessible UI components with customizable theming
4. **Client-side PDF Generation**: jsPDF allows offline PDF creation without server dependencies
5. **Memory Storage Fallback**: Includes in-memory storage implementation for development/testing scenarios