# AquaPulse Frontend

**React client for the Smart Rainwater Harvesting Monitoring System**

This is the frontend for AquaPulse, a full-stack platform that helps residential societies digitally track and manage their rainwater harvesting (RWH) infrastructure. It connects to the AquaPulse backend (Spring Boot + PostgreSQL) to provide a real-time dashboard for monitoring water collection, storage levels, and maintenance schedules.

Backend repository: [aquapulse](https://github.com/Sumeet-Y1/aquapulse)

## Features

- Email/password authentication and Google Sign-In, with role selection (Admin/Resident) for new Google accounts
- Multi-society support — admins can manage multiple societies, residents can join multiple societies via invite codes
- Society and RWH unit management
- Water reading logs with historical trends
- Maintenance tracking and scheduling
- Live rainfall data integration
- AI-generated performance insights
- Role-based UI — admin and resident views reflect their actual permissions
- Fully responsive, mobile-first design

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router

## Project Structure

src/
├── components/ → Reusable UI components
├── context/ → React context providers (auth, society state)
├── pages/ → Route-level page components
├── services/ → API service layer
└── types/ → TypeScript interfaces matching backend DTOs


## Getting Started

### Prerequisites
- Node.js
- The AquaPulse backend running locally (see backend repository for setup)
- A Google OAuth Client ID (for Google Sign-In)

### Setup

```bash
git clone https://github.com/Sumeet-Y1/aquapulse-frontend.git
cd aquapulse-frontend
npm install
```

Create a `.env` file in the project root:

VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com


Run the development server:

```bash
npm run dev
```

## License

This project is developed for academic purposes.