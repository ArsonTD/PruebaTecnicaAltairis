# Altairis Backoffice — Arquitectura y Flujo del Sistema

## Visión general

El sistema es una aplicación backoffice para gestión de inventario hotelero B2B. Corre en Docker con tres servicios:

```
Browser (localhost:3000)
    │
    ▼
┌─────────────────┐     HTTP/REST     ┌──────────────────┐
│  Next.js 14     │ ────────────────► │  ASP.NET Core 8  │
│  Frontend       │ ◄──────────────── │  REST API        │
│  :3000          │                   │  :8080           │
│                 │   WebSocket       │                  │
│                 │ ◄────────────────►│  SignalR Hub     │
└─────────────────┘                   └────────┬─────────┘
                                               │
                                               │ EF Core
                                               ▼
                                    ┌──────────────────┐
                                    │  PostgreSQL 16   │
                                    │  :5432           │
                                    └──────────────────┘
```

---

## 1. Autenticación

### Flujo de Login

```
Usuario                Frontend              Backend               DB
  │                       │                     │                   │
  │  POST /login          │                     │                   │
  │  {email, password}    │                     │                   │
  │──────────────────────►│                     │                   │
  │                       │  POST /api/auth/login│                  │
  │                       │─────────────────────►│                  │
  │                       │                     │  Busca usuario    │
  │                       │                     │──────────────────►│
  │                       │                     │  Verifica hash    │
  │                       │                     │◄──────────────────│
  │                       │                     │  Genera JWT       │
  │                       │◄─────────────────────│  {token, email}  │
  │                       │  Guarda token        │                   │
  │                       │  en Zustand store    │                   │
  │◄──────────────────────│  Redirige /dashboard │                   │
```

### Cómo funciona el JWT

- El backend genera un token firmado con `Jwt:Key` (HMAC-SHA256)
- El token contiene: `sub` (userId), `email`, `jti` (único), expiración (8 horas)
- El frontend guarda el token en el store de Zustand (memoria, no localStorage)
- **Cada request** al API incluye el header `Authorization: Bearer {token}`
- El backend valida issuer, audience, firma y expiración en cada request

```
Request al API:
GET /api/hotels
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Si el token no se envía o está vencido → el backend retorna **401 Unauthorized** → el frontend hace logout automático y redirige a `/login`.

---

## 2. Base de Datos

### Esquema principal

```
Hotels
 ├── Id (uuid)
 ├── Name, Country, City, Address
 ├── Category (Budget/Standard/Superior/Deluxe/Luxury)
 └── IsActive
      │
      └── RoomTypes (1:N)
           ├── Id, Name, Description
           ├── BasePrice, MaxOccupancy
           └── HotelId (FK)
                │
                └── InventoryDays (1:N)
                     ├── Id, Date
                     ├── AvailableRooms, TotalRooms
                     ├── Price (override)
                     └── RoomTypeId (FK)

Reservations
 ├── GuestName, GuestEmail, GuestPhone
 ├── CheckIn, CheckOut, TotalAmount
 ├── Status (Pending/Confirmed/Cancelled/CheckedIn/CheckedOut)
 ├── HotelId (FK → Hotels)
 └── RoomTypeId (FK → RoomTypes)
```

### Seed automático (primer arranque)

Al iniciar el backend por primera vez, `DatabaseSeeder.SeedAsync()` genera:

| Entidad | Cantidad |
|---|---|
| Hoteles | ~1,500 |
| Tipos de habitación | ~7,500 (5 por hotel) |
| Días de inventario | ~340,000 (30 días × RoomTypes) |
| Reservaciones | ~500 de muestra |
| Usuario demo | `admin@altairis.com` / `Admin123!` |

Esto tarda **2-5 minutos** en el primer arranque.

---

## 3. API REST — Endpoints

Todos los endpoints (excepto `/api/auth/login` y `/health`) requieren JWT válido.

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login, devuelve JWT |
| GET | `/api/auth/me` | Info del usuario actual |

### Hoteles
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/hotels` | Lista paginada (search, country, city, category) |
| GET | `/api/hotels/{id}` | Detalle de un hotel con room types |
| POST | `/api/hotels` | Crear hotel |
| PUT | `/api/hotels/{id}` | Actualizar hotel |
| DELETE | `/api/hotels/{id}` | Eliminar hotel |
| GET | `/api/hotels/countries` | Lista de países únicos |

### Inventario
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/inventory` | Inventario por hotel/roomtype/rango de fechas |
| PUT | `/api/inventory/{id}` | Actualizar disponibilidad y precio de un día |
| PUT | `/api/inventory/bulk` | Actualizar múltiples días a la vez |

### Reservaciones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reservations` | Lista paginada con filtros |
| POST | `/api/reservations` | Crear reservación |
| PATCH | `/api/reservations/{id}/status` | Cambiar estado |

### Dashboard
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/dashboard` | KPIs globales (ocupación, ingresos, etc.) |

---

## 4. Frontend — Páginas y Componentes

### Rutas

```
/login              → Formulario de autenticación
/dashboard          → KPIs y gráficas (ocupación, revenue, reservas por estado)
/hoteles            → Tabla con búsqueda, filtros y paginación
/hoteles/[id]       → Detalle: room types, disponibilidad, edición
/inventario         → Gestión de disponibilidad por fecha
/reservas           → Listado y cambio de estado de reservaciones
```

### Flujo de datos en cada página

```
Página carga
    │
    ▼
React Query (useQuery)
    │  llama a api() en lib/api.ts
    │  que añade Authorization: Bearer {token}
    ▼
Backend API
    │  valida JWT
    │  consulta PostgreSQL via EF Core
    │  devuelve JSON
    ▼
React Query cachea la respuesta
    │
    ▼
Componente renderiza datos
```

### Estado global (Zustand)

El store de auth (`store/auth.ts`) guarda:
- `token` — JWT string
- `user` — `{id, email}`
- `login(token, user)` — establece la sesión
- `logout()` — limpia el estado y redirige a `/login`

---

## 5. Actualizaciones en tiempo real (SignalR)

El hub de SignalR en `/hubs/availability` permite que el backend notifique al frontend cuando cambia el inventario de un hotel.

### Flujo

```
Usuario A edita inventario
    │
    ▼
PUT /api/inventory/{id}
    │
    ▼
Backend actualiza DB
    │
    ▼
AvailabilityHub.SendToGroup("hotel-{id}", "InventoryUpdated", payload)
    │
    ▼
Frontend de Usuario B (misma página del hotel)
recibe el evento y React Query invalida el cache
    │
    ▼
Datos se refrescan automáticamente
```

### Conexión desde el frontend

```typescript
// lib/signalr.ts
const connection = new HubConnectionBuilder()
  .withUrl(`${API_URL}/hubs/availability?access_token=${token}`)
  .withAutomaticReconnect()
  .build();
```

El token JWT se pasa por query string (requerido por SignalR, no puede usar headers).

---

## 6. Docker — Cómo arranca todo

```bash
docker compose up --build
```

### Orden de arranque

```
1. altairis-db (PostgreSQL)
      │  healthcheck: pg_isready cada 5s
      │  ✓ ready
      ▼
2. altairis-backend (ASP.NET)
      │  - Conecta a PostgreSQL
      │  - EnsureCreated() → crea tablas si no existen
      │  - DatabaseSeeder.SeedAsync() → 2-5 min en primer arranque
      │  healthcheck: GET /health cada 15s, hasta 20 intentos (5 min)
      │  ✓ healthy
      ▼
3. altairis-frontend (Next.js)
      │  - Inicia servidor standalone (node server.js)
      │  - Sirve la app en :3000
      ▼
      ✓ Sistema listo
```

### Variables de entorno importantes

| Variable | Valor en Docker | Dónde se usa |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Frontend → URL del API (desde el browser) |
| `ConnectionStrings__Default` | `Host=db;Port=5432;...` | Backend → conexión a PostgreSQL |
| `Jwt__Key` | (clave secreta 32+ chars) | Backend → firma/verifica JWT |
| `ASPNETCORE_URLS` | `http://0.0.0.0:8080` | Backend → puerto de escucha |

---

## 7. Error frecuente: `/Account/Login?ReturnUrl=...` → 404

### Causa

`AddIdentity<>()` en ASP.NET registra la autenticación por cookie como `DefaultChallengeScheme`. Cuando un request llega **sin JWT** a un endpoint protegido, en vez de devolver `401 Unauthorized`, ASP.NET redirige a `/Account/Login` — una página MVC que no existe en una API pura → **404 Not Found**.

### Solución aplicada

Se agregó en `Program.cs`:

```csharp
builder.Services.ConfigureApplicationCookie(opts =>
{
    opts.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = 401;
        return Task.CompletedTask;
    };
});
```

Esto hace que, sin importar el scheme de challenge, la API devuelva siempre `401` para requests sin token, y el frontend lo maneja redirigiendo a `/login`.

---

## 8. Credenciales para demo

| Campo | Valor |
|---|---|
| Email | `admin@altairis.com` |
| Password | `Admin123!` |
| Frontend | http://localhost:3000 |
| Swagger | http://localhost:8080/swagger |
