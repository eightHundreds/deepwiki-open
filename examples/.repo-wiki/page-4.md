# API Reference

## Base URL

```
https://api.example.com/v1
```

## Authentication

All API requests require authentication using a Bearer token:

```http
Authorization: Bearer YOUR_API_TOKEN
```

## Endpoints

### Users

#### GET /users

Retrieve a list of users.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10)
- `search` (string, optional): Search term

**Example Request:**
```bash
curl -X GET "https://api.example.com/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

#### GET /users/:id

Retrieve a specific user.

**Path Parameters:**
- `id` (string, required): User ID

**Example Request:**
```bash
curl -X GET "https://api.example.com/v1/users/123" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

**Example Response:**
```json
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "profile": {
    "bio": "Software Developer",
    "location": "San Francisco"
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### POST /users

Create a new user.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secure_password"
}
```

**Example Request:**
```bash
curl -X POST "https://api.example.com/v1/users" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"secure_password"}'
```

**Example Response:**
```json
{
  "id": "124",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### PUT /users/:id

Update a user.

**Path Parameters:**
- `id` (string, required): User ID

**Request Body:**
```json
{
  "name": "Jane Smith",
  "profile": {
    "bio": "Senior Developer"
  }
}
```

#### DELETE /users/:id

Delete a user.

**Path Parameters:**
- `id` (string, required): User ID

**Example Response:**
```json
{
  "message": "User deleted successfully"
}
```

### Data Processing

#### POST /process

Submit data for processing.

**Request Body:**
```json
{
  "data": {
    "type": "csv",
    "content": "name,age\nJohn,30\nJane,25"
  },
  "options": {
    "validate": true,
    "transform": true
  }
}
```

**Example Response:**
```json
{
  "jobId": "job-123",
  "status": "processing",
  "estimatedTime": 120
}
```

#### GET /process/:jobId

Check processing status.

**Example Response:**
```json
{
  "jobId": "job-123",
  "status": "completed",
  "result": {
    "recordsProcessed": 2,
    "errors": 0
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'email' field is required",
    "details": {}
  }
}
```

## Rate Limits

- **Standard tier**: 1000 requests per hour
- **Premium tier**: 10000 requests per hour

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

## Related Pages

- [Core Features](page-3.md)
- [Getting Started](page-2.md)
- [Architecture Overview](page-1.md)
