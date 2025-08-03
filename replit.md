# Neocortical Extension Layer

## Overview
This project is a web-based MVP of the "Neocortical Extension Layer," a personal thinking companion application. Its core purpose is to facilitate structured self-conversations, transforming these discussions into organized thoughts and ultimately into coherent articles. The application aims to provide a WeChat-style interface for personal reflection, guiding users from initial conversational input through thought organization to final article generation. Key capabilities include conversation management, message threading, transformation of messages into draggable thought bubbles, and compilation of these bubbles into structured articles with PDF export functionality.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite build tool)
- **UI Library**: Shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS (with CSS variables for theming)
- **Routing**: Wouter
- **State Management**: TanStack React Query (server state)
- **Forms**: React Hook Form (with Zod validation)

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (via Drizzle ORM and Neon Database)
- **API Design**: RESTful API
- **Development Server**: Vite integration

### Data Storage & Schema
- **Primary Database**: PostgreSQL (Neon Database for serverless hosting)
- **ORM**: Drizzle ORM (with Drizzle Kit for migrations)
- **Session Storage**: Connect-pg-simple
- **Core Tables**: `conversations`, `messages`, `bubbles`, `articles`

### Core Features & Design Decisions
- **Conversation Management**: Create, edit, and manage self-conversations within a chat-like interface.
- **Bubble Transformation**: Convert messages into movable, spatially positioned thought bubbles.
  - Features dynamic sizing (normal/compact), hover effects, and columnar layout.
  - Supports connecting bubbles with visual lines and double-click selection/disconnection.
  - "Align" function prioritizes connected bubbles and maintains spatial arrangement sequence.
- **Article Creation**: Compile selected bubbles into structured articles.
  - Bubble ordering in articles respects connection flow.
  - Supports connection-based tags for adding groups of bubbles.
  - Comprehensive editing features: formatting (bold, italic, underline), headings (H1-H3), lists, dividers, undo/redo, real-time word count, auto-save.
- **PDF Export**: Client-side PDF generation using jsPDF.
- **Keyword System**: In-place editing of keywords directly on message bubbles, replacing previous category/tag system for simplified organization.
- **Message Selection**: Allows selection of messages, assignment of keywords, and movement/copying between conversations.
- **"Today Talk"**: Quick conversation creation for daily journaling.
- **Monorepo Structure**: Facilitates unified development of frontend, backend, and shared code.
- **Persistent Storage**: Migration from in-memory storage to PostgreSQL for data persistence.

## External Dependencies

### Core Libraries
- **React Ecosystem**: React, React DOM, Wouter
- **UI Framework**: Radix UI components, Lucide React icons
- **Database**: Drizzle ORM, Neon Database (PostgreSQL serverless driver)
- **PDF Generation**: jsPDF
- **Date Handling**: date-fns
- **Validation**: Zod

### Development Tools
- **Build Tool**: Vite
- **Type Checking**: TypeScript
- **Styling**: Tailwind CSS, PostCSS
- **Development Server**: TSX
- **Production Build**: ESBuild
- **Google Translate API**: Integrated for bilingual translation, supporting 11 languages with intelligent detection and metadata handling.