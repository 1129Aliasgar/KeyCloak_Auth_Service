# Keycloak User Service

A production-ready, full-stack user service application built with Keycloak for authentication, Node.js/Express backend, React frontend with Redux Toolkit, and MongoDB for data storage.

## 🏗️ Architecture Overview

### Clean Architecture Principles

This project follows clean architecture with clear separation of concerns:

- **Frontend**: React + Vite + Redux Toolkit + Keycloak JS
- **Backend**: Node.js + Express + MongoDB
- **Authentication**: Keycloak (Identity & Access Management)
- **Containerization**: Docker Compose

### How Frontend & Backend Communicate

1. **User Login Flow**:
   - User clicks login → Frontend redirects to Keycloak login page
   - User authenticates with Keycloak → Keycloak issues JWT token
   - Frontend receives token → Stores in Redux state
   - Frontend includes token in `Authorization: Bearer <token>` header for all API calls

2. **API Request Flow**:
   ```
   Frontend (React) 
   → Axios Interceptor adds token to headers
   → Backend receives request with token
   → Keycloak middleware validates token signature
   → Controller processes request
   → Service layer handles database operations
   → Response sent back to frontend
   ```

3. **Token Validation**:
   - Backend uses Keycloak's public key (JWKS) to verify token signature
   - Validates token expiration, issuer, and audience
   - Extracts user information from token claims
   - Attaches user info to `req.user` for use in controllers

### How Keycloak Fits Into the Flow

**Keycloak Role**:
- **Authentication Provider**: Handles user login/logout
- **Token Issuer**: Issues JWT tokens with user claims
- **Identity Management**: Manages users, roles, and permissions
- **Single Sign-On (SSO)**: Enables SSO across applications

**Integration Points**:
1. **Frontend**: Uses `keycloak-js` library to initiate login and manage tokens
2. **Backend**: Validates tokens using Keycloak's public key from JWKS endpoint
3. **Database**: Syncs user data from Keycloak to MongoDB for extended attributes

## 📁 Project Structure

```
KeyCloak/
├── backend/
│   ├── server.js                # Express server entry point
│   ├── models/
│   │   └── user.js             # MongoDB user model
│   ├── middleware/
│   │   └── keycloak.js         # JWT token validation middleware
│   ├── routes/
│   │   └── userRoutes.js       # API route definitions
│   ├── controller/
│   │   └── userController.js   # Request handlers
│   ├── service/
│   │   └── userService.js      # Business logic & DB operations
│   ├── validator/
│   │   └── userValidator.js    # Input validation rules
│   ├── package.json
│   └── env.example             # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx            # React entry point
│   │   ├── routes/             # (Future: route definitions)
│   │   ├── screens/
│   │   │   ├── Login.jsx       # Login page
│   │   │   ├── Dashboard.jsx   # Dashboard page
│   │   │   └── Profile.jsx     # User profile page
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   └── redux/
│   │       ├── store.js        # Redux store configuration
│   │       └── features/
│   │           └── authSlice.js # Authentication state management
│   ├── package.json
│   └── .env.example            # Frontend environment variables
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Docker (for Keycloak)
- MongoDB (local installation or Docker)
- npm or yarn

### Step 1: Start Keycloak with Docker

Pull and run Keycloak using Docker:

```bash
docker run -d \
  --name keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

This will start:
- **Keycloak** on `http://localhost:8080`

**Keycloak Admin Credentials**:
- Username: `admin`
- Password: `admin`

**Note**: Make sure MongoDB is running locally on `mongodb://localhost:27017` or configure your MongoDB connection in the backend `.env` file.

### Step 2: Configure Keycloak

1. **Access Keycloak Admin Console**:
   - Open `http://localhost:8080`
   - Click "Administration Console"
   - Login with `admin` / `admin`

2. **Create a Realm**:
   - Hover over "Master" realm → Click "Create Realm"
   - Name: `your-realm-name` (e.g., `user-service`)
   - Click "Create"

3. **Create a Client**:
   - Go to "Clients" → "Create client"
   - Client ID: `your-client-id` (e.g., `user-service-client`)
   - Client authentication: **OFF** (Public client)
   - Click "Next"
   - Valid redirect URIs: `http://localhost:3000/*`
   - Web origins: `http://localhost:3000`
   - Click "Save"

4. **Get Public Key** (Optional - for manual validation):
   - Go to "Realm settings" → "Keys" → "RS256" → Copy public key
   - Or use JWKS URL: `http://localhost:8080/realms/your-realm-name/protocol/openid-connect/certs`

5. **Create a Test User**:
   - Go to "Users" → "Create new user"
   - Username: `testuser`
   - Email: `test@example.com`
   - Email verified: **ON**
   - Click "Create"
   - Go to "Credentials" tab → Set password → Save

### Step 3: Configure Backend

```bash
cd backend
npm install
cp env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/user-service
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=your-realm-name
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_REALM_PUBLIC_KEY_URL=http://localhost:8080/realms/your-realm-name/protocol/openid-connect/certs
JWT_ALGORITHM=RS256
FRONTEND_URL=http://localhost:3000
```

**Note**: Adjust `MONGODB_URL` if your MongoDB requires authentication or uses a different port.

Start backend:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Step 4: Configure Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=your-realm-name
VITE_KEYCLOAK_CLIENT_ID=your-client-id
```

Start frontend:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## 🔐 Security Best Practices Implemented

1. **JWT Token Validation**: Backend validates token signature using Keycloak's public key
2. **Helmet.js**: Security headers for Express
3. **CORS**: Configured to allow only frontend origin
4. **Input Validation**: Express-validator for request validation
5. **Environment Variables**: Sensitive data stored in .env files
6. **Token in Headers**: Tokens sent via Authorization header (not cookies/URL)
7. **PKCE**: Frontend uses PKCE for enhanced security
8. **HTTPS Ready**: Configuration supports HTTPS in production

## 📡 API Endpoints

### Public Endpoints

- `GET /health` - Server health check
- `GET /api/users/health` - User service health check

### Protected Endpoints (Require Keycloak Token)

- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `DELETE /api/users/me` - Soft delete current user
- `GET /api/users/:id` - Get user by ID
- `GET /api/users` - Get all users (with pagination)

**Request Format**:
```bash
curl -H "Authorization: Bearer <your-token>" http://localhost:5000/api/users/me
```

## 🎨 UI Framework Integration

The current implementation uses custom CSS for a modern, clean UI. To integrate a CSS framework:

### Option 1: Shadcn UI
```bash
cd frontend
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input
```

### Option 2: Ant Design
```bash
cd frontend
npm install antd
```
Then import components in your files:
```jsx
import { Button, Card, Input } from 'antd';
```

### Option 3: Shoelace
```bash
cd frontend
npm install @shoelace-style/shoelace
```

## 🧪 Testing the Flow

1. **Start Keycloak** using Docker command above
2. **Ensure MongoDB is running** locally
3. **Start backend**: `cd backend && npm run dev`
4. **Start frontend**: `cd frontend && npm run dev`
5. **Open** `http://localhost:3000`
6. **Login** will automatically redirect to Keycloak login page
7. **Enter** test user credentials
8. **View** dashboard with user information
9. **Check** browser DevTools → Network tab to see API calls with token

## 📝 Why Each Part is Needed

### Backend Components

- **server.js**: Express server setup, middleware configuration, MongoDB connection
- **models/user.js**: MongoDB schema for user data, extends Keycloak user info
- **middleware/keycloak.js**: Validates JWT tokens, extracts user info, protects routes
- **routes/userRoutes.js**: Defines API endpoints, applies middleware
- **controller/userController.js**: Handles HTTP requests/responses, coordinates flow
- **service/userService.js**: Database operations, business logic, reusable functions
- **validator/userValidator.js**: Input validation, prevents invalid data, security

### Frontend Components

- **App.jsx**: Main routing, Keycloak initialization, global state management
- **redux/store.js**: Centralized state, token storage, user data
- **redux/features/authSlice.js**: Authentication logic, Keycloak integration, API calls
- **screens/Login.jsx**: Login entry point, Keycloak redirect
- **screens/Dashboard.jsx**: Protected content, user info display
- **screens/Profile.jsx**: User profile management, API integration example
- **components/ProtectedRoute.jsx**: Route protection, authentication checks

## 🐛 Troubleshooting

### Keycloak Connection Issues
- Verify Keycloak is running: `docker ps`
- Check Keycloak logs: `docker logs keycloak`
- Verify realm and client ID in .env files
- Ensure Keycloak is accessible at `http://localhost:8080`

### Token Validation Errors
- Ensure `KEYCLOAK_REALM_PUBLIC_KEY_URL` is correct
- Check token expiration (tokens expire after 5 minutes by default)
- Verify client ID matches in frontend and backend
- Test JWKS endpoint: `curl http://localhost:8080/realms/your-realm/protocol/openid-connect/certs`

### MongoDB Connection Issues
- Verify MongoDB is running locally or check your connection string
- Check connection string in backend/.env
- Ensure MongoDB is accessible on the configured port

### CORS Errors
- Verify `FRONTEND_URL` in backend/.env matches frontend URL
- Check browser console for specific CORS error

## 🚢 Production Deployment

1. **Environment Variables**: Use secure secrets management
2. **HTTPS**: Enable HTTPS for Keycloak, frontend, and backend
3. **Database**: Use managed MongoDB (Atlas) or production MongoDB instance
4. **Keycloak**: Use production database (PostgreSQL) instead of H2 file storage
5. **Monitoring**: Add logging and monitoring tools
6. **Rate Limiting**: Implement rate limiting on API endpoints

## 🐳 Docker Commands Reference

### Start Keycloak
```bash
docker run -d \
  --name keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

### Stop Keycloak
```bash
docker stop keycloak
```

### Remove Keycloak Container
```bash
docker rm keycloak
```

### View Keycloak Logs
```bash
docker logs keycloak
```

### Pull Latest Keycloak Image
```bash
docker pull quay.io/keycloak/keycloak:latest
```

## 📚 Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak JS Adapter](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter)
- [JWT.io](https://jwt.io/) - Debug JWT tokens
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## 📄 License

ISC

