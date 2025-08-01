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
5. **PostgreSQL Database**: Migrated from memory storage to persistent PostgreSQL database with Neon Database

### Recent Changes

- **January 20, 2025**: Enhanced bilingual translation system with Google Translate integration
  - Removed language prefixes from message content and moved to metadata for cleaner display
  - Added originalLanguage and translatedFrom fields to messages schema for proper translation tracking
  - Fixed duplicate translation issue by filtering to only original messages (no language prefixes AND no translatedFrom metadata)
  - Translation language displayed as subtle badges below message content
  - Smart detection prevents translating already translated messages
  - Each translation creates clean message text with metadata references
  - Google Translate API integration without requiring API keys
  - Support for 11 languages: Chinese, English, French, German, Italian, Spanish, Portuguese, Russian, Japanese, Korean, Arabic
  - Added intelligent language detection for new user messages with originalLanguage field storage
  - Enhanced Italian language detection with common word patterns and accent recognition
  - Language badges only shown for translations, original messages show language when explicitly detected

- **January 16, 2025**: Implemented adaptive bubble sizing system with align functionality
  - All bubbles now display within visible space without scrolling
  - Smart sizing: uses normal size when space allows, shrinks to compact when needed
  - Compact mode shows only keywords, full content on hover with z-index overlay
  - Hover effects: enlarges to normal size and appears above other bubbles
  - Dynamic size calculation based on available screen space and bubble count
  - Layout flows in columns: fill top to bottom, then move to next column
  - Bubbles with same keywords grouped together first, then conversation sequence
  - Applied to both "Create Bubbles" and "Recreate Bubbles" functionality
  - Replaced floating "+" button with Grid align button for organizing manually moved bubbles
  - Align function preserves current spatial arrangement sequence instead of reverting to keyword grouping
  - Spatial sorting maintains user's manual layout decisions while applying clean grid positioning
  - Implemented connect bubbles functionality with visual connection lines
  - Click link button to enter connection mode, then click two bubbles to connect them
  - Visual connections shown as purple dashed lines with connection points
  - Selected bubbles highlighted with purple ring in connection mode

- **January 16, 2025**: Enhanced connection UX with double-click selection and arrow connections
  - Double-click bubbles to select/deselect with darker color feedback
  - Selected bubbles show darker background colors for clear visual feedback
  - Single click connected bubbles to disconnect and remove connection lines
  - Arrow connections with purple lines and triangle arrow heads pointing to target bubble
  - Smooth interaction flow: double-click to select → double-click second bubble to connect → single click to disconnect
  - Connection mode disables dragging to prevent accidental movement during selection
  - Fixed click behavior: single click only disconnects, double click only creates connections
  - Clear separation between connection creation (double-click) and disconnection (single click)
  - Fixed connection persistence by storing connections in localStorage instead of component state
  - Connections now survive component re-renders and page reloads
  - Multiple connections allowed between same bubbles using unique timestamps
  - Fixed double-click event handling using flag-based approach to prevent accidental disconnections
  - Resolved setTimeout/clearTimeout timing issues with more robust double-click detection

- **January 19, 2025**: Implemented connection-aware align functionality
  - Align button now prioritizes connected bubbles, placing them at the top in connection order
  - Connection chains are followed from starting points (bubbles with outgoing but no incoming connections)
  - Creates logical flow diagrams when align is used after creating connections
  - Unconnected bubbles are placed after connected chains
  - Falls back to spatial sorting when no connections exist

- **January 19, 2025**: Enhanced article creation with connection-aware bubble ordering and tags
  - Article page now displays bubbles in same sequence as bubble page (connection order first)
  - Added connection-based tags using the first non-empty keyword from each connection chain
  - Connection tags allow one-click addition of entire connected bubble groups to articles
  - Default sorting mode changed to "Connection Order" to prioritize connected bubbles
  - Tag badges show connection group names and bubble count with color coding
  - Tags fallback to generic names "Group No.1", "Group No.2" if no keywords found in chain

- **January 19, 2025**: Removed category/tag system and simplified to keywords-only
  - Eliminated "Sort by Tag" functionality from Article page
  - Removed all category/tag references from both Bubble and Article pages
  - Bubbles now only display keywords (titles) without category tags
  - Simplified BubbleCard component by removing category dropdown menus
  - Cleaned up unused category helper functions (getCategoryColor, getCategoryLabel)
  - Streamlined UI to focus on keyword-based organization instead of category system

- **January 19, 2025**: Implemented comprehensive article editing features
  - Added formatting toolbar with bold, italic, underline text formatting options
  - Implemented heading insertion (H1, H2, H3) with proper styling and spacing
  - Added bullet lists and numbered lists functionality
  - Integrated divider insertion for content organization
  - Added undo/redo functionality for content editing
  - Implemented real-time word count display in toolbar
  - Enhanced article content area with better padding, borders, and typography
  - Added auto-save functionality with visual status indicators (saved/saving/unsaved)
  - Auto-save triggers 2 seconds after content changes with loading spinner feedback
  - All formatting preserves consistent spacing and typography throughout the article

- **January 16, 2025**: Moved category selection dropdown to keyword area
  - Category selection dropdown now positioned next to keyword input for better workflow
  - Gray tag icon for empty categories opens full category selection menu
  - Existing categories can be clicked to change or remove
  - Removed duplicate category dropdown from right-side controls
  - Fixed "Remove Category" functionality by correcting undefined vs falsy value handling
  - Optimistic updates now properly handle empty string category values
  - Streamlined bubble editing interface with logical control grouping

- **January 16, 2025**: Removed default category assignment for new bubbles
  - Bubbles now created without automatic category tags
  - Users can manually add categories using the tag dropdown or leave them empty
  - Added small gray tag icon for empty categories that opens category selection
  - Gives users full control over bubble organization and categorization

- **January 16, 2025**: Unified keyword input styling across chat and bubbles
  - Changed bubble "Add keyword..." placeholder to match chat interface style
  - Now shows small purple circle with "+" icon instead of text placeholder
  - Consistent visual language between chat messages and bubble cards
  - Maintains all existing keyword editing functionality with improved UI

- **January 16, 2025**: Added "Recreate Bubbles" one-click functionality
  - Added "Recreate Bubbles" button in header (left of "Save Layout")
  - One-click operation: deletes all existing bubbles then creates fresh ones from latest chat messages
  - Preserves any new keywords added to messages since bubbles were last created
  - Uses sequential deletion with proper callback chaining for reliable operation
  - Maintains grid layout positioning for newly created bubbles

- **January 16, 2025**: Enhanced bubble creation to preserve chat keywords
  - Bubbles now inherit keywords from their source messages when created
  - Messages with keywords: bubble shows the keyword as title immediately
  - Messages without keywords: bubble shows "Add keyword..." placeholder
  - Maintains seamless transition from chat messages to visual bubbles
  - Fixed scroll position preservation during keyword editing

- **January 16, 2025**: Implemented in-place keyword editing system
  - Moved keyword inputs directly onto each message bubble for better UX
  - Existing keywords show as clickable purple tags that can be edited in-place
  - Selected messages without keywords show a small purple "+" circle to add keywords
  - Click-to-edit functionality with Enter to save, Escape to cancel
  - Multiple messages can have keywords edited simultaneously
  - Removed separate keyword input area to reduce UI clutter

- **January 16, 2025**: Changed selection indicators from checkboxes to purple light bulb icons
  - Updated both message-level selection indicators and header selection toggle button
  - Selected state: Bright purple filled bulb with glow effect  
  - Unselected state: Light purple outline bulb
  - Provides more intuitive visual metaphor for "lighting up" ideas during selection
  - Maintains all existing selection functionality with improved user experience

- **January 16, 2025**: Added message selection and movement functionality
  - Added selection mode toggle button in chat header
  - Messages become selectable with checkboxes when selection mode is enabled
  - Each selected message can have a keyword/title assigned via input field
  - Selection toolbar shows count and provides Select All/Clear options
  - Move dialog allows creating new conversations or moving to existing ones
  - Option to copy or move messages (remove from original conversation)
  - Added title field to messages database schema to support keywords
  - Multi-select functionality for organizing conversations efficiently

- **January 16, 2025**: Added "Today Talk" quick conversation creation
  - Added "Today Talk" button on conversations page alongside existing "New" button
  - Automatically generates conversation title with format "16 July 2025 Brain talk"
  - Pre-fills the prompt with today's date but allows user to edit the title
  - Supports customization like "16 July 2025 Brain talk cloudy"
  - Streamlines daily journaling and brain dump creation process

- **January 15, 2025**: Added keyword input functionality to bubble cards
  - Added title field to bubbles database schema with automatic migration
  - Implemented editable keyword input displayed on left of category tags
  - Keywords share the same color styling as bubble categories for visual consistency
  - Added click-to-edit functionality with keyboard shortcuts (Enter to save, Escape to cancel)
  - Keyword inputs auto-resize based on content length
  - Implemented optimistic updates for smooth real-time editing experience

- **January 15, 2025**: Fixed bubble drag functionality and layout persistence
  - Resolved bubble dragging issues by optimizing useEffect dependencies in BubbleCard component
  - Fixed position synchronization between component state and database
  - Added proper event propagation handling to prevent conflicts with dropdown menus
  - Bubble positions now save automatically during drag and restore properly on page reload
  - Enhanced Save Layout button with meaningful user feedback

- **January 15, 2025**: Enhanced bubble color functionality and PDF filename defaulting
  - Fixed bubble color changes by replacing dynamic Tailwind classes with static color mappings
  - Added proper color class generation to ensure all CSS classes are included in build
  - Updated PDF filename to default to conversation name instead of article title
  - Color changes now persist properly in database and update UI immediately

- **January 15, 2025**: Migrated from memory storage to PostgreSQL database
  - Added database connection with Neon Database serverless PostgreSQL
  - Implemented DatabaseStorage class replacing MemStorage
  - Added proper database relations using Drizzle ORM
  - Created database tables: conversations, messages, bubbles, articles
  - All data is now persisted across application restarts