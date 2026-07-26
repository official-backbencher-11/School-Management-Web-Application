# EduSphere - School Management System (MERN Monorepo)

A comprehensive School Management System featuring JWT authentication, Role-Based Access Control (RBAC), and modules for student administration, course section management, daily attendance logging, and billing ledger logs.

Designed with a premium Glassmorphism & Neon Glow visual interface in React using Vanilla CSS.

---

## Technology Stack
- **Database**: MongoDB (Mongoose Object Relations)
- **Backend API**: Node.js & Express.js
- **Frontend SPA**: React.js (Vite compiler)
- **Styling**: Premium custom Vanilla CSS
- **Security**: JSON Web Tokens (JWT) + Bcrypt password hashing

---

## Directory Architecture
```
school-management-system/
├── backend/                  # Node.js API server
│   ├── config/               # DB connection
│   ├── controllers/          # Business logic
│   ├── middlewares/          # Auth & RBAC
│   ├── models/               # Mongoose schemas
│   ├── routes/               # API endpoints
│   ├── utils/                # Helper files
│   └── server.js             # API entrypoint
└── frontend/                 # React frontend client (Vite)
    ├── src/
    │   ├── components/       # Reusable components (Sidebar, Navbar...)
    │   ├── context/          # Global session (AuthContext)
    │   ├── pages/            # Page layouts
    │   └── services/         # Axios client
    └── index.html            # Main template
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v16+)
- [MongoDB](https://www.mongodb.com) (Local server or MongoDB Atlas cluster)

### Backend Installation & Startup
1. Navigate to `/backend`:
   ```bash
   cd backend
   ```
2. Install dependency libraries:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/school_management
   JWT_SECRET=your_jwt_secret_key_here
   ```
4. Boot API server:
   - For development (with hot reload):
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm start
     ```

### Frontend Installation & Startup
1. Navigate to `/frontend`:
   ```bash
   cd ../frontend
   ```
2. Install dependency libraries:
   ```bash
   npm install
   ```
3. Configure environment variable inside `.env` or let it fallback:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
4. Start React development server:
   ```bash
   npm run dev
   ```

---

## System Access Roles
1. **System Administrator**: Can manage classes, register/update faculty members, admit students, and record payments in the billing ledger.
2. **Teacher**: Can access student registers, view class lists, and record/log daily roll-call attendance sheets.
3. **Student/Parent**: Can view personal profiles, check attendance logs, and inspect outstanding fees statements.
