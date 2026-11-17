# AquaPulse Frontend

**React client for the Smart Rainwater Harvesting Monitoring System**

This is the frontend for AquaPulse, a full-stack platform that helps residential societies digitally track and manage their rainwater harvesting (RWH) infrastructure. It connects to the AquaPulse backend (Spring Boot + PostgreSQL) to provide a real-time dashboard for monitoring water collection, storage levels, and maintenance schedules. Societies can also hold video and voice meetings without leaving the app.

Backend repository: [aquapulse](https://github.com/Sumeet-Y1/aquapulse)

## Features

- Email/password authentication and Google Sign-In, with role selection (Admin/Resident) for new Google accounts
- Multi-society support — admins can manage multiple societies, residents can join multiple societies via invite codes
- Society and RWH unit management
- Water reading logs with historical trends
- Maintenance tracking and scheduling
- Live rainfall data integration
- AI-generated performance insights
- **Society meetings** — admins schedule video or voice meetings, residents join in-app with no extra login, with live status (Scheduled, Live, Ended) and auto-refreshing meeting lists
- **Screen sharing** — present dashboards and reports during meetings, with sharing sessions logged by the backend
- Role-based UI — admin and resident views reflect their actual permissions
- Fully responsive, mobile-first design

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router
- JaaS (Jitsi as a Service) embed for video, voice, and screen sharing

## Project Structure

```
src/
├── components/   → Reusable UI components
├── context/      → React context providers (auth, society state)
├── pages/        → Route-level pages (dashboard, society, unit, meetings, meeting room)
├── services/     → API service layer
└── types/        → TypeScript interfaces matching backend DTOs (plus Jitsi typings)
```

## Getting Started

### Prerequisites
- Node.js
- The AquaPulse backend running locally (see backend repository for setup)
- A Google OAuth Client ID (for Google Sign-In)
- A camera and microphone for meetings (browsers allow them only on `localhost` or `https`)

### Setup

```bash
git clone https://github.com/Sumeet-Y1/aquapulse-frontend.git
cd aquapulse-frontend
npm install
```

Create a `.env` file in the project root:

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_API_URL=http://localhost:8080
```

Run the development server:

```bash
npm run dev
```

## Meetings

Meetings are backed by the AquaPulse backend, which issues a signed token for each user when they join. The frontend only needs the join response, so no video-service keys are required here.

- Admins schedule a meeting from a society's **Meetings** page and start it by joining
- Residents see a meeting once it is live and join with one click
- Screen sharing is available when the admin allows it for that meeting
- Screen sharing and camera access need a desktop browser on `localhost` or `https`

## License

This project is developed for academic purposes.