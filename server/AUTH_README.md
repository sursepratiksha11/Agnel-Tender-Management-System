# Authentication System - Phase 2

## Implementation Complete ✅

### Features Implemented

1. **User Signup** - Creates organization and user with role-based access
2. **User Login** - Validates credentials and issues JWT
3. **JWT Authentication** - Token-based authentication for protected routes
4. **Role-based Authorization** - Middleware to enforce AUTHORITY/BIDDER roles

---

## API Endpoints

### 1. POST `/api/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "AUTHORITY",
  "organizationName": "City Council"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "authority",
    "organization": "City Council",
    "organizationId": "uuid"
  }
}
```

---

### 2. POST `/api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "authority",
    "organization": "City Council",
    "organizationId": "uuid"
  }
}
```

---

### 3. GET `/api/auth/me` 🔒

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "AUTHORITY",
    "organization": "City Council",
    "organizationId": "uuid"
  }
}
```

---

## Testing

### 1. Start the server
```bash
npm run dev
```

### 2. Run automated tests
```bash
node src/db/testAuth.js
```

### 3. Manual testing with curl

**Signup as AUTHORITY:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@authority.com",
    "password": "admin123",
    "role": "AUTHORITY",
    "organizationName": "City Municipal Corporation"
  }'
```

**Signup as BIDDER:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bidder User",
    "email": "bidder@company.com",
    "password": "bidder123",
    "role": "BIDDER",
    "organizationName": "Tech Solutions Pvt Ltd"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@authority.com",
    "password": "admin123"
  }'
```

**Get Current User (replace {TOKEN} with actual token):**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer {TOKEN}"
```

---

## Middleware Usage

### Protecting Routes

```javascript
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

// Require authentication
router.get('/protected', requireAuth, handler);

// Require specific role
router.post('/tender', requireAuth, requireRole('AUTHORITY'), handler);

// Multiple roles
router.get('/data', requireAuth, (req, res, next) => {
  if (!['AUTHORITY', 'BIDDER'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}, handler);
```

---

## JWT Configuration

- **Algorithm:** HS256
- **Expiry:** 24 hours
- **Payload:**
  ```json
  {
    "userId": "uuid",
    "role": "AUTHORITY",
    "organizationId": "uuid",
    "iat": 1234567890,
    "exp": 1234654290
  }
  ```

---

## Security Features

✅ Passwords hashed with bcryptjs (10 salt rounds)  
✅ Email uniqueness enforced  
✅ JWT token verification on protected routes  
✅ Role validation (AUTHORITY/BIDDER only)  
✅ Organization-user relationship enforced  
✅ Input validation on all endpoints  
✅ Proper error handling with meaningful messages  

---

## Database Schema

### User Table
- Links to organization via `organization_id`
- Role matches organization type
- Password stored as bcrypt hash

### Organization Table
- Created during signup
- Type must match user role (AUTHORITY/BIDDER)

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (signup) |
| 400 | Bad Request (validation error, duplicate email) |
| 401 | Unauthorized (invalid credentials, missing/invalid token) |
| 403 | Forbidden (insufficient role permissions) |
| 500 | Internal Server Error |

---

## Environment Variables Required

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tms
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_min_32_chars
```

---

## Next Steps

- Implement tender CRUD operations
- Add proposal management
- Integrate AI features
- Add password reset functionality
- Implement change password endpoint
