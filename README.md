# KDK INDUCTION QUIZ 2026

**Presented by Rotaract Club of KDKCE**  
**KDK College of Engineering, Nagpur**

A production-ready full-stack live college quiz platform engineered for high-stakes auditorium arenas, inter-departmental inductions, and live stage competitions.

---

## ⚡ Key Highlights & Architecture

- **Zero-PIN Dynamic Entry**: Students join strictly via dynamic QR code and join URL. No 6-digit PIN system or input fields exist anywhere.
- **Server-Authoritative Gameplay**: Timer, scoring, answer locking, question visibility, and leaderboard rankings are strictly validated and managed on the server.
- **Live 60 FPS Canvas Physics**: Student waiting lobby features organic team bubbles with circular collision detection, overlap correction, elastic bouncing, center gravity, join pulses, and ripple effects.
- **Separated Production Deployment**: Static frontend is Vercel-ready; real-time Socket.IO and Express backend is built for persistent Node.js hosts (Railway, Render, Fly.io, Docker).
- **PostgreSQL & Prisma ORM**: Robust schema with transactional answer submissions, speed-bonus scoring, audit logging, and foreign key integrity.
- **1080p 16:9 Projector Mode**: Fullscreen arena display featuring giant timers, synchronized answer reveals, and dynamic champion podiums without admin clutter.

---

## 🎨 Official Branding & Color Palette

- **Primary Brand**: Rotaract Club of KDKCE (`/public/assets/rotaract-logo.svg`, `/public/assets/rotaract-logo.png`)
- **Secondary Brand**: KDK College of Engineering (`/public/assets/kdk-logo.svg`, `/public/assets/kdk-logo.png`)

| Color | Hex | Role |
| :--- | :--- | :--- |
| **Arena Dark** | `#0c0e13` | Deep Background |
| **Surface** | `#111319` | Secondary Panels & Headers |
| **Cards** | `#191c21` | Interactive Elements |
| **Cyber Cyan** | `#00e5ff` | Primary Glow & Active State |
| **Rotaract Magenta** | `#d91b5c` | Club Accent & Timer Expiration |
| **Cyber Amber** | `#ffb703` | 1st Place Podium & Alerts |
| **Emerald Green** | `#00f59b` | Correct Answer & Success |

---

## 📁 Project Structure

```
kdk-induction-quiz-2026/
├── Dockerfile                  # Multi-stage production container
├── vercel.json                 # Vercel static hosting configuration
├── railway.json                # Railway persistent service specification
├── render.yaml                 # Render blueprint for backend & PostgreSQL
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── prisma/
│   ├── schema.prisma           # Authoritative PostgreSQL schema
│   ├── seed.js                 # 3 empty rounds, 1 GameState, default admin
│   └── migrations/
│       └── 0_init/
│           └── migration.sql   # Clean PostgreSQL DDL migration
├── server/
│   ├── server.js               # HTTP & Socket.IO server entrypoint
│   ├── app.js                  # Express app, Helmet, CORS, Rate Limiters
│   ├── config/
│   │   ├── env.js              # Zod environment variable parsing
│   │   └── db.js               # Prisma Client singleton
│   ├── middleware/
│   │   ├── auth.middleware.js  # JWT & HTTP-only cookie admin verification
│   │   ├── rateLimiter.js      # Login and registration rate limits
│   │   └── validate.js         # Zod request body validation
│   ├── services/
│   │   ├── game.service.js     # Authoritative state machine & audit logger
│   │   └── scoring.service.js  # Server timer verification & speed bonus
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── teams.controller.js
│   │   ├── questions.controller.js
│   │   ├── game.controller.js
│   │   ├── answers.controller.js
│   │   └── leaderboard.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── teams.routes.js
│   │   ├── questions.routes.js
│   │   ├── game.routes.js
│   │   ├── answers.routes.js
│   │   └── leaderboard.routes.js
│   ├── socket/
│   │   ├── index.js            # Socket.IO instance & CORS
│   │   └── handlers.js         # Real-time event broadcasting
│   └── utils/
│       └── logger.js
└── public/
    ├── index.html              # Landing Page with dynamic QR Code
    ├── register.html           # Team & Leader Registration
    ├── lobby.html              # Canvas 60 FPS Bubble Waiting Arena
    ├── quiz.html               # Student Live Quiz screen
    ├── admin-login.html        # Secure Host Authentication
    ├── admin.html              # Full Host Command Center & Controls
    ├── question-bank.html      # 3-Round Question Bank CRUD
    ├── projector.html          # 1080p 16:9 Fullscreen Stage Display
    ├── leaderboard.html        # Final Leaderboard & Champion Podium
    ├── assets/                 # Rotaract & KDK logos
    ├── css/
    │   └── style.css           # Collegiate Cyber Theme styles
    └── js/
        ├── config.js           # Client runtime configuration loader
        ├── socket-client.js    # Reconnection & status badge wrapper
        ├── landing.js          # QR code generator & arena state
        ├── register.js         # Avatar picker & team registration
        ├── lobby.js            # 60 FPS Canvas physics engine
        ├── quiz.js             # Live answering & state machine
        ├── admin-login.js      # Host login & session storage
        ├── admin.js            # Game controls, navigation & audit log
        ├── question-bank.js    # Round tabs & question management
        ├── projector.js        # Stage view, giant timer & sync
        └── leaderboard.js      # Real rankings & podium generator
```

---

## 🚀 Local Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (Local, Docker, or hosted like Neon/Supabase/Railway)

### 2. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd kdk-induction-quiz-2026
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the required values:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/kdk_induction_quiz?schema=public"
JWT_SECRET="generate-a-strong-32-character-secret-key"
ADMIN_EMAIL="admin@kdkce.edu"
ADMIN_PASSWORD="YourSecureAdminPassword123"
PUBLIC_JOIN_URL="http://localhost:3000/register.html"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3000"
SOCKET_URL="http://localhost:3000"
ALLOWED_ORIGINS="*"
NODE_ENV="development"
PORT=3000
```

### 4. Initialize Database with Prisma
Generate Prisma Client:
```bash
npm run prisma:generate
```

Run PostgreSQL migrations:
```bash
npm run prisma:migrate
```
*(Or use `npm run prisma:migrate:dev` in development)*

Seed the database (creates 3 empty rounds, 1 initial GameState, and the host admin; strictly 0 teams and 0 questions):
```bash
npm run prisma:seed
```

### 5. Start the Application
For development with auto-reload:
```bash
npm run dev
```
For production:
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Production (Vercel + Supabase)

The entire full-stack application (frontend, API routes, database ORM, and real-time polling fallback) is engineered to deploy seamlessly on **Vercel** with a **Supabase PostgreSQL** database.

### 1. Database Setup (Supabase)
1. Create a project on [Supabase](https://supabase.com).
2. Copy your PostgreSQL connection string from **Project Settings > Database > Connection String (URI / Prisma)**.
3. Push your Prisma schema & seed questions:
   ```bash
   npx prisma db push
   node prisma/seed.js
   ```

### 2. Full-Stack Deployment on Vercel
1. Import your GitHub repository (`dev-anuj12/quiz-2026`) into [Vercel](https://vercel.com).
2. Set the following Environment Variables in your Vercel Project Settings:
   - `DATABASE_URL`: Your Supabase connection string (Pooler or direct URI)
   - `DIRECT_URL`: Your Supabase direct connection string
   - `JWT_SECRET`: A secure random secret key
   - `ADMIN_EMAIL`: `admin@kdkce.edu` (or your host admin email)
   - `ADMIN_PASSWORD`: Your secure admin password
   - `NODE_ENV`: `production`
3. Click **Deploy**. Vercel will automatically build and host the complete quiz platform with zero additional server configuration.

---

## 🎮 Game Management Workflow (Host Flow)

1. **Host Login**:
   Navigate to `/admin-login.html` and log in with your configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
2. **Open Registration & Arena**:
   From `/admin.html`, ensure the state is set to **LOBBY** and registration is open.
3. **Display Join QR**:
   Display `/index.html` on stage or projector. Students scan the QR code to register their team name, leader name, and select their cyber avatar.
4. **Waiting Lobby**:
   As teams join, their bubbles appear in real-time in `/lobby.html` using the 60 FPS Canvas physics engine.
5. **Start Quiz**:
   Click **Start Quiz** on the dashboard. All connected student devices automatically transition into the live quiz view (`/quiz.html`).
6. **Show & Timer**:
   Select a question, click **Toggle Show/Hide** to display it on student screens and the projector (`/projector.html`), then click **Start (20s)** to begin the authoritative server timer countdown.
7. **Lock & Reveal**:
   When the timer expires or when host clicks **Lock Answers**, no more submissions are accepted. Click **Reveal Answer** to show the correct option on all screens.
8. **Leaderboard & Podium**:
   Click **Show Leaderboard** to display real database rankings and the final 1st, 2nd, and 3rd place champion podium.

---

## 🛡️ Security & Integrity

- **Strict Server Authoritative Scoring**: Points, response times, and correctness are computed strictly by `scoring.service.js` based on server clocks.
- **Duplicate Prevention**: Database enforces `@@unique([teamId, questionId])` on both `Answer` and `Score` tables. Duplicate team names are rejected.
- **Helmet Security Headers**: Content Security Policy tuned for WebSockets, CDN assets, and modern web protections.
- **Rate Limiting**: `express-rate-limit` guards login endpoints against brute-force attacks and regulates team registrations.
- **Protected Endpoints**: Admin actions require validated JWT credentials via HTTP-only secure cookies or `Authorization: Bearer` headers.
- **Host Audit Trail**: Crucial actions (round switch, question reveals, answer locks, timer resets) are recorded in the `AuditLog` table with admin IDs and timestamps.

---

## 📜 License & Credits

Developed with precision for the **KDK Induction Quiz 2026**.  
Presented by **Rotaract Club of KDKCE**, KDK College of Engineering, Nagpur.
Licensed under the [MIT License](LICENSE).
