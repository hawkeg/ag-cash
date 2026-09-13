# Supabase Authentication Setup

This document describes the Supabase authentication configuration for the AG-Cash backend.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### How to get these values:

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the values from the "Project API keys" section:
   - `Project URL` → `SUPABASE_URL`
   - `anon / public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## File Structure

```
backend/src/
├── services/
│   ├── supabase.ts          # Supabase client initialization and auth helpers
│   └── auth.service.ts      # High-level authentication service
├── middleware/
│   └── auth.ts              # JWT validation and authorization middleware
├── controllers/
│   └── auth.controller.ts   # HTTP request handlers for auth operations
└── routes/
    └── auth.routes.ts       # Auth route definitions
```

## Key Components

### 1. Supabase Client (`src/services/supabase.ts`)

- Initializes two Supabase clients:
  - `supabase`: For client-side operations (uses anon key)
  - `supabaseAdmin`: For server-side operations (uses service role key)
- Provides auth helper functions:
  - `signIn(email, password)`: Authenticate user
  - `signUp(email, password, metadata)`: Register new user
  - `signOut(accessToken)`: Logout user
  - `getCurrentUser(accessToken)`: Get user from token
  - `refreshAccessToken(refreshToken)`: Refresh expired tokens
  - `verifyToken(accessToken)`: Validate JWT token

### 2. Auth Service (`src/services/auth.service.ts`)

High-level service that wraps Supabase auth functions with:
- Consistent error handling
- ApiResponse wrapper for consistent responses
- Helper methods for role checking and email verification

### 3. Auth Middleware (`src/middleware/auth.ts`)

- `authMiddleware`: Required authentication (validates Bearer token)
- `optionalAuthMiddleware`: Optional authentication (attaches user if token present)
- `requireRole(...roles)`: Role-based authorization
- `requireEmailVerification`: Email verification check

### 4. Auth Controller (`src/controllers/auth.controller.ts`)

HTTP request handlers:
- `login(req, res)`: POST /api/auth/login
- `register(req, res)`: POST /api/auth/register
- `logout(req, res)`: POST /api/auth/logout
- `me(req, res)`: GET /api/auth/me
- `refresh(req, res)`: POST /api/auth/refresh

### 5. Auth Routes (`src/routes/auth.routes.ts`)

Route definitions:
- Public routes (no auth required):
  - POST /api/auth/login
  - POST /api/auth/register
  - POST /api/auth/refresh
- Protected routes (auth required):
  - POST /api/auth/logout
  - GET /api/auth/me

## Usage Examples

### Using the Auth Service

```typescript
import { AuthService } from '../services/auth.service';

// Login
const result = await AuthService.login({
  email: 'user@example.com',
  password: 'password123'
});

if (result.success) {
  const { user, session } = result.data;
  console.log('User:', user);
  console.log('Access Token:', session.accessToken);
}
```

### Using Auth Middleware

```typescript
import { authMiddleware } from '../middleware/auth';

// Protect a route
router.get('/protected', authMiddleware, (req, res) => {
  // req.user is available here
  res.json({ user: req.user });
});

// Require specific role
router.get('/admin', authMiddleware, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});
```

### Making Authenticated Requests

```bash
# Login
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Access protected route
curl -X GET http://localhost:4001/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

## Type Safety

All auth-related types are defined in `shared/types/index.ts`:

- `AuthUser`: User information
- `SignInCredentials`: Login credentials
- `SignUpCredentials`: Registration credentials
- `AuthSession`: Session information (tokens)
- `AuthResponse`: Auth operation response

## Security Notes

1. **Never expose the service role key** to client-side code
2. **Always use the anon key** for client-side operations
3. **Use the service role key** only in server-side code for privileged operations
4. **JWT tokens are validated** on every protected request
5. **Role-based access control** is enforced via middleware

## Testing

To test the authentication:

1. Set up your `.env` file with Supabase credentials
2. Start the backend server: `npm run dev`
3. Test the endpoints:
   - Register a new user
   - Login to get tokens
   - Access protected routes with the token
   - Refresh expired tokens
   - Logout

## Troubleshooting

### "Missing required Supabase environment variables"
- Ensure all three Supabase environment variables are set in `.env`
- Restart the server after adding environment variables

### "Invalid or expired token"
- The JWT token has expired (default 1 hour)
- Use the refresh endpoint to get a new access token
- Ensure the Authorization header format is: `Bearer <token>`

### "Insufficient permissions"
- The user doesn't have the required role
- Check the user's `user_metadata.role` in Supabase
- Use the `requireRole` middleware appropriately
