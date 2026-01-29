# Community Knowledge Validation and Preservation System (CKVPS)

A web-based system that captures community agricultural practices and validates them using outcome-based feedback. The system preserves local knowledge while ranking practices and contributors based on real results over time.

## Key Features
- User registration and login (JWT authentication)
- Submit agricultural practices with full context (crop, problem type, season, location)
- Outcome reporting (Effective / Partially Effective / Ineffective)
- Automatic practice effectiveness scoring + confidence levels
- Contributor credibility scoring
- Discussion/comments per practice (with replies)
- Content flagging and moderation (Moderator/Validator role)
- Admin management (users, categories, locations, seasons) and analytics

## Tech Stack
- Frontend: React (Vite)
- Backend: Node.js (Express)
- Database: MySQL
- Authentication: JWT

## Project Structure
kvs/
├── clients/ # React frontend
└── server/ # Node.js backend API


## Setup Instructions

### Backend
````bash````
cd server
npm install
npm run dev

### Frontend
````bash````
cd clients
npm install
npm run dev


## Author
Ndong Ghislain Che
HND Software Engineering