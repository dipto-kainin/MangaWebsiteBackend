# IronVine — Backend Specification

## Stack Recommendation

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 20 LTS | |
| Framework | Express.js or Fastify | Fastify preferred for performance |
| Language | TypeScript | |
| ORM | Prisma | Type-safe, works great with Next.js |
| Database | PostgreSQL | Primary store |
| Auth | JWT (access + refresh tokens) | Stored in httpOnly cookies |
| File Storage | Cloudinary / AWS S3 | Cover images, chapter pages |
| Caching | Redis | Chapter page URLs, rate limiting |
| API Style | REST | Prefix: `/api/v1` |

---

## Database Schema

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(READER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  sessions     Session[]
}

enum Role {
  READER
  MODERATOR
  ADMIN
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}

model Manga {
  id             String      @id @default(uuid())
  slug           String      @unique   // used in URL e.g. "iron-vine"
  title          String
  description    String      @db.Text
  coverImage     String      // storage URL
  status         MangaStatus @default(ONGOING)
  rating         Float       @default(0)
  views          Int         @default(0)
  author         String
  artist         String
  publishedYear  Int
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  genres         MangaGenre[]
  tags           MangaTag[]
  chapters       Chapter[]
}

enum MangaStatus {
  ONGOING
  COMPLETED
  HIATUS
}

model Genre {
  id     String       @id @default(uuid())
  name   String       @unique
  manga  MangaGenre[]
}

model MangaGenre {
  mangaId String
  genreId String
  manga   Manga  @relation(fields: [mangaId], references: [id], onDelete: Cascade)
  genre   Genre  @relation(fields: [genreId], references: [id])
  @@id([mangaId, genreId])
}

model Tag {
  id    String     @id @default(uuid())
  name  String     @unique
  manga MangaTag[]
}

model MangaTag {
  mangaId String
  tagId   String
  manga   Manga  @relation(fields: [mangaId], references: [id], onDelete: Cascade)
  tag     Tag    @relation(fields: [tagId], references: [id])
  @@id([mangaId, tagId])
}

model Chapter {
  id          String   @id @default(uuid())
  mangaId     String
  manga       Manga    @relation(fields: [mangaId], references: [id], onDelete: Cascade)
  number      Int
  title       String
  publishedAt DateTime @default(now())
  views       Int      @default(0)
  pages       Page[]
  @@unique([mangaId, number])
}

model Page {
  id        String  @id @default(uuid())
  chapterId String
  chapter   Chapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  number    Int
  imageUrl  String
  @@unique([chapterId, number])
}
```

---

## Authentication

### Flow

```
POST /api/v1/auth/login
  → validate credentials
  → return { accessToken } in JSON body  (expires 15 min)
  → set refreshToken in httpOnly cookie  (expires 7 days)

Any protected request
  → Authorization: Bearer <accessToken>
  → if expired → POST /api/v1/auth/refresh (uses cookie)

POST /api/v1/auth/logout
  → delete session from DB
  → clear cookie
```

### Token Strategy

- **Access token**: short-lived JWT (15 min), contains `{ sub: userId, role }`
- **Refresh token**: opaque UUID stored in DB + set as `httpOnly; Secure; SameSite=Strict` cookie
- Refresh token rotation: each `/refresh` call invalidates the old token and issues a new one
- Brute-force protection: max 5 failed login attempts per 15 min per IP (Redis)

---

## API Reference

> Base URL: `https://api.ironvine.io/api/v1`  
> All responses are JSON. Errors follow `{ error: string, code: string }`.

---

### Auth

#### `POST /auth/login`
Authenticate an admin user.

**Body**
```json
{
  "email": "admin@ironvine.io",
  "password": "secret"
}
```

**Response `200`**
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "admin@ironvine.io",
    "role": "ADMIN"
  }
}
```

**Errors**
| Code | Meaning |
|---|---|
| `401` | Invalid credentials |
| `429` | Too many attempts |

---

#### `POST /auth/refresh`
Exchange the httpOnly refresh cookie for a new access token.

**Response `200`**
```json
{
  "accessToken": "<new_jwt>"
}
```

---

#### `POST /auth/logout`
Invalidate the current session.

**Auth**: Bearer token required

**Response `204`** No content.

---

#### `GET /auth/me`
Return the currently authenticated user.

**Auth**: Bearer token required

**Response `200`**
```json
{
  "id": "uuid",
  "email": "admin@ironvine.io",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### Manga (Public)

#### `GET /manga`
List manga with filtering, sorting, and pagination.

**Query Params**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Page number |
| `limit` | int | `20` | Items per page (max 100) |
| `sort` | `latest` \| `trending` \| `rating` | `latest` | Sort order |
| `genre` | string | — | Filter by genre name |
| `status` | `ongoing` \| `completed` \| `hiatus` | — | Filter by status |
| `q` | string | — | Search title, description, tags |

**Response `200`**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "iron-vine",
      "title": "Iron Vine Chronicles",
      "description": "...",
      "coverImage": "https://cdn.../cover.jpg",
      "status": "ONGOING",
      "rating": 4.8,
      "views": 1240000,
      "author": "Kira Nakamura",
      "artist": "Sho Tanaka",
      "publishedYear": 2023,
      "chapterCount": 48,
      "latestChapter": 48,
      "genres": ["Action", "Sci-Fi"],
      "tags": ["biopunk", "adventure"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

---

#### `GET /manga/:slug`
Get a single manga's full details.

**Response `200`** — same shape as a single item above, plus full `chapters` array:
```json
{
  ...mangaFields,
  "chapters": [
    {
      "id": "uuid",
      "number": 1,
      "title": "The First Tendril",
      "publishedAt": "2023-01-10T00:00:00Z",
      "views": 312000,
      "pageCount": 24
    }
  ]
}
```

**Errors**: `404` if slug not found.

---

#### `POST /manga/:slug/view`
Increment the view counter for a manga. Fire-and-forget from the client.

**Response `204`** No content.

---

### Chapters (Public)

#### `GET /chapters/:chapterId`
Get a chapter with all page URLs.

**Response `200`**
```json
{
  "id": "uuid",
  "mangaId": "uuid",
  "number": 3,
  "title": "Deep Root Access",
  "publishedAt": "2023-02-07T00:00:00Z",
  "views": 278000,
  "pages": [
    { "number": 1, "imageUrl": "https://cdn.../page-1.jpg" },
    { "number": 2, "imageUrl": "https://cdn.../page-2.jpg" }
  ],
  "prev": { "id": "uuid", "number": 2 },
  "next": { "id": "uuid", "number": 4 }
}
```

---

#### `POST /chapters/:chapterId/view`
Increment chapter view counter.

**Response `204`** No content.

---

### Genres (Public)

#### `GET /genres`
List all available genre names.

**Response `200`**
```json
{
  "data": ["Action", "Adventure", "Fantasy", "Romance", "Sci-Fi"]
}
```

---

### Admin — Manga

> All admin routes require `Authorization: Bearer <token>` and `role: ADMIN | MODERATOR`.

#### `POST /admin/manga`
Create a new manga entry.

**Body** (multipart/form-data)
```
title         string  required
description   string  required
author        string  required
artist        string  required
publishedYear int     required
status        string  required  (ongoing|completed|hiatus)
genres[]      string  required  (array)
tags[]        string
coverImage    file    required
```

**Response `201`**
```json
{ "id": "uuid", "slug": "iron-vine" }
```

---

#### `PATCH /admin/manga/:slug`
Update manga metadata or cover image.

**Body** (multipart/form-data, all fields optional)

**Response `200`** — updated manga object.

---

#### `DELETE /admin/manga/:slug`
Delete manga and all associated chapters/pages.

**Auth**: `ADMIN` only.

**Response `204`** No content.

---

### Admin — Chapters

#### `POST /admin/manga/:slug/chapters`
Upload a new chapter with its pages.

**Body** (multipart/form-data)
```
number   int     required
title    string  required
pages[]  file[]  required  (ordered array of page images)
```

**Response `201`**
```json
{ "id": "uuid", "number": 1, "pageCount": 24 }
```

---

#### `PATCH /admin/chapters/:chapterId`
Update chapter title, number, or replace pages.

**Response `200`** — updated chapter object.

---

#### `DELETE /admin/chapters/:chapterId`
Delete a chapter and its pages.

**Response `204`** No content.

---

### Admin — Users

> `ADMIN` role only.

#### `GET /admin/users`
List all users.

**Query**: `page`, `limit`, `role`

**Response `200`**
```json
{
  "data": [
    { "id": "uuid", "email": "...", "role": "MODERATOR", "createdAt": "..." }
  ],
  "pagination": { ... }
}
```

---

#### `POST /admin/users`
Create a moderator account.

**Body**
```json
{ "email": "mod@ironvine.io", "password": "...", "role": "MODERATOR" }
```

**Response `201`**

---

#### `PATCH /admin/users/:userId`
Update user role or password.

**Response `200`**

---

#### `DELETE /admin/users/:userId`
Delete a user. Cannot delete yourself.

**Response `204`**

---

### Admin — Stats (Dashboard)

#### `GET /admin/stats`
Aggregate stats for the dashboard.

**Response `200`**
```json
{
  "totalManga": 120,
  "totalChapters": 4820,
  "totalViews": 14200000,
  "newMangaThisMonth": 5,
  "newChaptersThisMonth": 38,
  "topManga": [
    { "slug": "iron-vine", "title": "Iron Vine Chronicles", "views": 1240000 }
  ]
}
```

---

## Frontend Integration Plan

### Replace mock data

1. Create `lib/api.ts` — a typed fetch wrapper that attaches `Authorization` headers and handles token refresh automatically.
2. Replace imports from `@/data/manga` and `@/data/chapters` with API calls inside Next.js `page.tsx` using `fetch` (server components) or `useSWR` / `react-query` (client components).
3. Store the `accessToken` in memory (closure/Zustand). Never in localStorage. Refresh token lives in httpOnly cookie — the browser handles it automatically.

### Admin login wiring (`/admin/login`)

The current `handleSubmit` in `app/admin/login/page.tsx` does a mock redirect. Replace with:

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  if (!email || !password) { setError("Please fill in all fields."); return; }

  setLoading(true);
  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",          // sends/receives httpOnly cookie
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(error ?? "Login failed.");
      return;
    }

    const { accessToken } = await res.json();
    // store accessToken in memory / Zustand auth store
    useAuthStore.getState().setToken(accessToken);
    router.push("/admin/dashboard");
  } catch {
    setError("Network error. Please try again.");
  } finally {
    setLoading(false);
  }
}
```

### Auth store (Zustand)

```ts
// store/auth.ts
import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (t: string) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  clearToken: () => set({ token: null }),
}));
```

### Route protection (Next.js middleware)

```ts
// middleware.ts  (project root)
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage  = req.nextUrl.pathname === "/admin/login";
  const hasSession   = req.cookies.has("refresh_token");

  if (isAdminRoute && !isLoginPage && !hasSession) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
}

export const config = { matcher: ["/admin/:path*"] };
```

---

## Environment Variables

```env
# Backend .env
DATABASE_URL="postgresql://user:password@localhost:5432/ironvine"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="change-me-32chars"
JWT_REFRESH_SECRET="change-me-different-32chars"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL="7d"
CLOUDINARY_URL="cloudinary://..."
CORS_ORIGIN="http://localhost:3000"
PORT=4000

# Frontend .env.local
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
```

---

## Error Response Format

All errors follow:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`.

---

## Rate Limits

| Route | Limit |
|---|---|
| `POST /auth/login` | 5 req / 15 min per IP |
| `POST /auth/refresh` | 20 req / 15 min per IP |
| `GET /manga` | 100 req / min per IP |
| `POST /admin/*` | 60 req / min per user |
