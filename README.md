# Conspire: Hidden Agenda - Coup Online

An online implementation of the popular card game "Coup" with optional expansions. Built with React, TypeScript, and Supabase for real-time multiplayer gameplay.

## Features

- **Anonymous Authentication**: Quick sign-in with just a username
- **Lobby System**: Create and join game lobbies
- **Game Expansions**: Optional Reformation, Inquisitor, and Anarchy expansions
- **Real-time Gameplay**: Live updates using Supabase's real-time subscriptions
- **Responsive Design**: Play on any device with a mobile-friendly UI

## Technologies Used

- React 19 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Framer Motion for animations
- Supabase for backend (authentication, database, and real-time functionality)
- React Router for navigation

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/conspire-hidden-agenda.git
   cd conspire-hidden-agenda
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Deployment

The application can be easily deployed to Vercel or any other platform that supports Vite applications.

## Game Rules

Coup is a game of deception and bluffing where players attempt to eliminate each other through clever use of character abilities and strategic actions. The last player standing wins.

### Expansions

- **Reformation**: Adds team play mechanics with Loyalists vs Reformists
- **Inquisitor**: Replaces the Ambassador with the more powerful Inquisitor role
- **Anarchy**: Adds special events and unpredictable game elements

## License

MIT License
