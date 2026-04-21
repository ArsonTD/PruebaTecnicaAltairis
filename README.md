# Altairis — Backoffice MVP

Backoffice operativo B2B para **Viajes Altairis**. Gestión de hoteles, inventario diario tipo extranet, reservas con estados y dashboard con KPIs — todo con sincronización en tiempo real vía SignalR.

## Stack

| Capa | Tecnologías |
|------|------------|
| **Backend** | .NET 8 Web API · EF Core 8 · PostgreSQL 16 · ASP.NET Identity · JWT · SignalR |
| **Frontend** | Next.js 14 (App Router) · TypeScript · Tailwind CSS · TanStack Query · Zustand · Recharts |
| **Infra** | Docker Compose (3 servicios) |

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Engine + Compose)
- ~3 GB de espacio libre en disco

---

## Arranque rápido

```bash
git clone <repo-url>
cd PruebaTecnica

DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build
```

> **Nota:** `DOCKER_BUILDKIT=0` es necesario en Docker Desktop para Windows (bug conocido con BuildKit al resolver Dockerfiles en subcarpetas).

El **primer arranque tarda ~2–3 minutos** mientras construye las imágenes y siembra la base de datos con datos de demostración.

### URLs disponibles

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API + Swagger | http://localhost:8080/swagger |
| PostgreSQL | `localhost:5432` |

### Credenciales de demo

```
Email:    admin@altairis.com
Password: Admin123!
```

Ya vienen pre-rellenadas en la pantalla de login.

---

## Funcionalidades

### 1. Dashboard `/dashboard`
KPIs en tiempo real: hoteles activos, reservas del día, ocupación y ingresos estimados 30 días. Gráfico de tendencia semanal, donut por estado de reserva y tabla de últimas reservas.

### 2. Hoteles `/hoteles`
Tabla server-side sobre ~1.500 registros reales. Búsqueda por nombre (debounced), filtros por país y categoría, paginación. Creación de nuevos hoteles con formulario validado.

### 3. Detalle de hotel `/hoteles/[id]`
Datos del hotel y listado de sus tipos de habitación. Creación de room types inline sin salir de la vista.

### 4. Inventario `/inventario`
Grid calendario tipo Booking extranet: filas = tipos de habitación, columnas = próximos 30 días. Celdas coloreadas por disponibilidad, editables con popover (disponibilidad + precio). **Los cambios se propagan en tiempo real** a todas las sesiones abiertas vía SignalR.

### 5. Reservas `/reservas`
Listado paginado con filtros por estado, hotel, huésped y fechas. Creación en wizard multi-paso (hotel → habitación → fechas → datos de huésped). Cambio de estado inline. Al crear una reserva se decrementa el inventario automáticamente y se emite un evento a todas las sesiones activas.

### 6. Mantenimiento `/mantenimiento`
Tickets de mantenimiento por hotel y tipo de habitación con prioridad y estado (Abierto → En progreso → Resuelto). Opción de bloquear inventario durante el periodo afectado; al resolver el ticket el inventario se restaura automáticamente.

---

## Demo de tiempo real (SignalR)

1. Abrir **dos pestañas** en `/inventario` con el mismo hotel seleccionado
2. En la pestaña A, editar la disponibilidad de una celda
3. La pestaña B refleja el cambio **sin refrescar**, con resaltado visual
4. Crear una reserva en `/reservas` y ver cómo el inventario del hotel disminuye en tiempo real en cualquier pestaña abierta

---

## Estructura del proyecto

```
PruebaTecnica/
├── backend/
│   └── Altairis.Api/
│       ├── Controllers/     # endpoints REST
│       ├── Data/            # DbContext + Seeder
│       ├── Dtos/            # request / response models
│       ├── Hubs/            # SignalR hub
│       ├── Models/          # entidades EF Core
│       └── Services/        # JwtService
├── frontend/
│   └── app/
│       ├── (auth)/          # login
│       ├── (dashboard)/     # hoteles, inventario, reservas, mantenimiento
│       └── api/             # route handlers Next.js
├── database/                # scripts SQL adicionales
└── docker-compose.yml
```

---

## API — Endpoints principales

Todos los endpoints (excepto `/auth/login` y `/auth/register`) requieren header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → devuelve JWT |
| POST | `/api/auth/register` | Registro de usuario |
| GET | `/api/hotels?search=&country=&category=&page=&pageSize=` | Listado paginado |
| POST | `/api/hotels` | Crear hotel |
| GET | `/api/hotels/{id}` | Detalle de hotel |
| GET | `/api/hotels/countries` | Lista de países únicos |
| GET | `/api/roomtypes?hotelId=` | Tipos de habitación del hotel |
| POST | `/api/roomtypes` | Crear tipo de habitación |
| GET | `/api/inventory?hotelId=&from=&to=` | Grid de inventario (fechas: `yyyy-MM-dd`) |
| POST | `/api/inventory` | Upsert de un día |
| PATCH | `/api/inventory/{id}` | Actualizar disponibilidad y precio |
| GET | `/api/reservations?status=&hotelId=&page=` | Listado paginado |
| POST | `/api/reservations` | Crear reserva (descuenta inventario) |
| PATCH | `/api/reservations/{id}/status` | Cambiar estado |
| GET | `/api/maintenance?hotelId=&status=&page=` | Listado de tickets |
| POST | `/api/maintenance` | Crear ticket |
| PATCH | `/api/maintenance/{id}/status` | Cambiar estado (Resuelto restaura inventario) |
| GET | `/api/dashboard/summary` | KPIs agregados |
| WS | `/hubs/availability` | SignalR — eventos `InventoryUpdated`, `ReservationCreated` |

---

## Variables de entorno

Todas ya configuradas en `docker-compose.yml`. Solo relevantes si corres en local sin Docker:

### Backend

| Variable | Valor demo |
|----------|-----------|
| `ConnectionStrings__Default` | `Host=localhost;Port=5432;Database=altairis;Username=altairis;Password=altairis` |
| `Jwt__Key` | `altairis-super-secret-demo-key-CHANGE-ME-in-production-32chars` |
| `Jwt__Issuer` | `altairis` |
| `Jwt__Audience` | `altairis-clients` |
| `Jwt__ExpiresHours` | `8` |

### Frontend

| Variable | Valor demo |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` |

---

## Desarrollo local (sin Docker)

Requiere PostgreSQL corriendo en `localhost:5432` con usuario/pass/db `altairis`.

```bash
# Backend
cd backend/Altairis.Api
dotnet restore
dotnet run
# → http://localhost:5000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Parar y limpiar

```bash
# Detener servicios
docker compose down

# Detener y eliminar volumen de datos (fuerza re-seed en el próximo arranque)
docker compose down -v
```

---

## Datos de demostración

La base de datos se puebla automáticamente en el primer arranque con datos generados por **Bogus** (seed determinístico):

| Entidad | Cantidad |
|---------|----------|
| Hoteles | ~1.500 (10 países) |
| Tipos de habitación | ~7.500 |
| Días de inventario | ~340.000 (30-45 días por room type) |
| Reservas de ejemplo | ~500 |

---

## Decisiones de diseño

**Backend plano en lugar de Clean Architecture / MediatR** — para un MVP de demo, capas simples (`Controllers → Services → DbContext`) son más legibles y directas sin sacrificar nada relevante.

**`EnsureCreated()` en lugar de migrations** — el schema se crea una sola vez en el arranque. Evita fricción innecesaria en Docker para una demo de ciclo corto.

**Paginación server-side real** — la prueba pide trabajo con volumen elevado de registros. Búsqueda y filtros se resuelven en la query SQL, no en memoria.

**JWT por query string en SignalR** — WebSocket no admite headers custom. El token se pasa como `?access_token=` y se inyecta en el contexto de autenticación via `JwtBearerEvents.OnMessageReceived`.
