# Hasura Image Gallery API

This service provides a GraphQL API for managing image collections, with support for user authentication, image uploads, and collection management.

## Prerequisites

- Docker and Docker Compose
- Imgur API credentials (for image uploads)

## Setup

1. Start the application:

```bash
docker-compose up --build -d
```

2. Add environmental variables

```bash
DATABASE_URL=postgres://postgres:postgrespassword@localhost:5432/hasuradb
ACTIONS_BASE_URL=http://localhost:3000
IMGUR_CLIENT_ID=e8dd5529c714f57
```

3. Initialize the database and metadata:

```bash
pnpm db:migrate    # Apply database migrations
pnpm db:seed      # Populate initial data
pnpm hasura:apply # Apply Hasura metadata
```

## Authentication

To get started, authenticate using the default admin account:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com"}'
```

This will return a JWT token needed for GraphQL requests.

## Actions

Actions are imported into hassura dashboard which is accessible at `http://localhost:8080/`.

## Image Upload

Visit `http://localhost:3000/test/upload` in your browser to use the image upload interface:

1. Upload form usage:
   - Select collection id
   - Choose an image file (max 5MB)
   - Add tags (comma-separated)
   - Add admin secret
   - Add JWT token received from /auth/login
   - Click "Upload" to submit

## Authorization

- Queries and mutations are protected by Hasura's permission system
- Authors can only access collections they're assigned to
- Admin operations require admin role
- JWT tokens contain user roles and permissions

## Development

1. Set up environment variables:

   - `HASURA_GRAPHQL_ADMIN_SECRET`
   - `IMGUR_CLIENT_ID`
   - `JWT_SECRET`

2. Run development server:

```bash
pnpm dev
```

## Error Handling

GraphQL errors include:

- Error message
- Error code
- Path to the error
- Additional details in extensions field
