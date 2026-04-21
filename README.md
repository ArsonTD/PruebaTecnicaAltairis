# Altairis — Backoffice MVP

Backoffice operativo B2B para **Viajes Altairis**. Proyecto fullstack navegable preparado para una demo comercial: gestión de hoteles, tipos de habitación, inventario diario con calendario tipo extranet, reservas con estados y dashboard con KPIs.

## Stack

- **Backend**: .NET 8 Web API · EF Core · PostgreSQL · Identity + JWT · SignalR
- **Frontend**: Next.js 14 (App Router) · Tailwind · TanStack Query · Zustand · Recharts
- **Infra**: Docker Compose (3 servicios)

## Arranque rápido

Requiere Docker Desktop.

```bash
docker-compose up --build
```

El primer arranque tarda ~2–3 min (construye imágenes y siembra ~1.500 hoteles + ~7.500 tipos de habitación + ~340.000 días de inventario + ~500 reservas).

- Frontend: http://localhost:3000
- API + Swagger: http://localhost:8080/swagger
- PostgreSQL: `localhost:5432` (usuario/pass/db `altairis`)

### Credenciales de demo

```
admin@altairis.com
Admin123!
```

Ya vienen pre-rellenadas en la pantalla de login.

## Funcionalidades

1. **Hoteles** `/hoteles` — tabla server-side con búsqueda (debounced), filtros por país/categoría y paginación real sobre ~1.500 registros
2. **Detalle de hotel** `/hoteles/[id]` — datos principales y tipos de habitación asociados, con creación inline
3. **Inventario** `/inventario` — selector de hotel + grid calendario tipo Booking extranet (filas = room types, columnas = próximos 30 días). Celdas coloreadas por disponibilidad, editables con popover. **Cambios reflejados en vivo** entre sesiones vía SignalR
4. **Reservas** `/reservas` — listado, filtros, creación multi-paso (hotel → habitación → fechas → huésped), cambio de estado inline. Decrementa inventario y emite eventos en tiempo real
5. **Dashboard** `/dashboard` — KPIs (hoteles activos, reservas hoy, ocupación, ingresos estimados), gráfico de tendencia 7 días, donut por estado, tabla de últimas reservas

## Demo sugerida de tiempo real

1. Abrir dos pestañas en `/inventario` con el mismo hotel seleccionado
2. En la pestaña A editar la disponibilidad de una celda
3. En la pestaña B la celda se actualiza sin refrescar y muestra un resaltado
4. Crear una reserva en `/reservas` y observar cómo el inventario del hotel reservado disminuye automáticamente en cualquier pestaña abierta

## Arquitectura

- Backend con capas simples (sin Clean Architecture): `Controllers/`, `Models/`, `Data/`, `Services/`, `Hubs/`, `Dtos/`.
- DB schema se crea con `EnsureCreated()` en el primer arranque — sin migraciones que mantener para el MVP.
- SignalR hub protegido con JWT; el frontend se suscribe por grupo `hotel:<id>` cuando el usuario entra en la vista de inventario.

## Endpoints principales

| Método | Ruta                                  | Descripción |
|--------|---------------------------------------|-------------|
| POST   | `/api/auth/login`                     | Devuelve JWT |
| GET    | `/api/hotels?search=&country=&page=`  | Listado paginado |
| POST   | `/api/hotels`                         | Alta de hotel |
| GET    | `/api/roomtypes?hotelId=`             | Tipos del hotel |
| POST   | `/api/roomtypes`                      | Alta de tipo |
| GET    | `/api/inventory?hotelId=&from=&to=`   | Rango para el grid |
| POST   | `/api/inventory`                      | Upsert día-room |
| GET    | `/api/reservations?status=&page=`     | Listado paginado |
| POST   | `/api/reservations`                   | Crea reserva, descuenta inventario |
| PATCH  | `/api/reservations/{id}/status`       | Cambio de estado |
| GET    | `/api/dashboard/summary`              | KPIs agregados |
| WS     | `/hubs/availability`                  | SignalR — eventos `InventoryUpdated`, `ReservationCreated` |

## Parar y limpiar

```bash
docker-compose down -v   # elimina el volumen de datos y fuerza re-seed
```

## Notas de decisión

- **Sin Clean Architecture / MediatR**: decidido mantener el backend simple y legible para el MVP — capas planas, inyección directa, servicios puntuales sólo donde aportan (`JwtService`).
- **EnsureCreated en lugar de migrations**: evita fricción de Docker boot; aceptable para demo porque el schema se crea una sola vez.
- **Volumen real (~1.500 hoteles)**: la prueba pide explícitamente trabajo con "volumen elevado de registros". La búsqueda y paginación son server-side, no simuladas.
- **SignalR**: los cambios de disponibilidad se propagan al instante entre operadores — justifica visualmente la observación del cliente sobre "visualizar gráficamente el estado de la operativa".
