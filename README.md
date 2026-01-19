# Q&A Session Management Platform

A real-time question management system for panel discussions, conferences, and live Q&A sessions.

## Features

### For Moderators
- **Session Management**: Create and manage multiple Q&A sessions
- **Question Moderation**: Review and update question status (submitted → approved/ignored/asked)
- **Voting System**: Participants can upvote approved questions
- **Shareable URLs**: Generate unique URLs for each session that participants can access
- **CSV Export**: Download all session questions with complete status information
- **Real-time Updates**: Live synchronization of questions and status changes

### For Participants
- **Easy Access**: Join sessions via shared URL without authentication
- **Question Submission**: Submit questions with optional name
- **Live Feed**: See approved and asked questions in real-time
- **Session Status**: View active, paused, or ended session states

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for database and authentication)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd qa-session-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

## Usage

### As a Moderator

1. **Sign Up/Login**: Create an account or login with existing credentials
2. **Create Session**: Click "Create Session" and enter a session name
3. **Share URL**: Copy the session URL and share with participants
4. **Manage Questions**: 
   - Review incoming questions in the "Submitted" tab
   - Change status to "Approved" (visible to audience), "Ignored" (hidden), or "Asked" (marked as addressed)
   - View vote counts to see which questions are most popular

### As a Participant

1. **Access Session**: Open the shared URL in your browser
2. **Submit Questions**: Enter your question and optionally provide your name
3. **View Questions**: See approved and asked questions in real-time

## Question Status Flow

```
Submitted (initial) → Approved (visible to audience)
                   → Ignored (hidden from audience)
                   → Asked (marked as addressed)
```

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Polling for live updates
- **Routing**: React Router v6

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
The application is configured for easy deployment to modern hosting platforms.

## Database Schema

### Sessions Table
- `id`: UUID (primary key)
- `name`: Session name
- `status`: active/paused/ended
- `moderator_id`: Reference to user
- `created_at`: Timestamp

### Questions Table
- `id`: UUID (primary key)
- `session_id`: Reference to session
- `content`: Question content
- `submitter_name`: Optional name
- `status`: submitted/approved/ignore/asked
- `vote_count`: Number of upvotes
- `created_at`: Timestamp

### Question Votes Table
- `id`: UUID (primary key)
- `question_id`: Reference to question
- `voter_id`: Anonymous voter identifier
- `session_id`: Reference to session
- `created_at`: Timestamp
## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your events and conferences.