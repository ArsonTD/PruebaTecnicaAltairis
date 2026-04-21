-- ============================================================
-- Altairis Backoffice — Paso 2: Esquema completo
-- Ejecutar conectado a la DB "altairis" como postgres o altairis
-- ============================================================

-- Permisos sobre el schema public
GRANT ALL ON SCHEMA public TO altairis;

-- ============================================================
-- TABLAS ASP.NET IDENTITY
-- (generadas por IdentityDbContext<ApplicationUser>)
-- ============================================================

CREATE TABLE IF NOT EXISTS "AspNetRoles" (
    "Id"               text        NOT NULL,
    "Name"             varchar(256),
    "NormalizedName"   varchar(256),
    "ConcurrencyStamp" text,
    CONSTRAINT "PK_AspNetRoles" PRIMARY KEY ("Id")
);

CREATE TABLE IF NOT EXISTS "AspNetUsers" (
    "Id"                   text        NOT NULL,
    "FullName"             text        NOT NULL DEFAULT '',
    "UserName"             varchar(256),
    "NormalizedUserName"   varchar(256),
    "Email"                varchar(256),
    "NormalizedEmail"      varchar(256),
    "EmailConfirmed"       boolean     NOT NULL,
    "PasswordHash"         text,
    "SecurityStamp"        text,
    "ConcurrencyStamp"     text,
    "PhoneNumber"          text,
    "PhoneNumberConfirmed" boolean     NOT NULL,
    "TwoFactorEnabled"     boolean     NOT NULL,
    "LockoutEnd"           timestamptz,
    "LockoutEnabled"       boolean     NOT NULL,
    "AccessFailedCount"    integer     NOT NULL,
    CONSTRAINT "PK_AspNetUsers" PRIMARY KEY ("Id")
);

CREATE TABLE IF NOT EXISTS "AspNetRoleClaims" (
    "Id"         serial  NOT NULL,
    "RoleId"     text    NOT NULL,
    "ClaimType"  text,
    "ClaimValue" text,
    CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId"
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AspNetUserClaims" (
    "Id"         serial  NOT NULL,
    "UserId"     text    NOT NULL,
    "ClaimType"  text,
    "ClaimValue" text,
    CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AspNetUserLogins" (
    "LoginProvider"       text NOT NULL,
    "ProviderKey"         text NOT NULL,
    "ProviderDisplayName" text,
    "UserId"              text NOT NULL,
    CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
    CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AspNetUserRoles" (
    "UserId" text NOT NULL,
    "RoleId" text NOT NULL,
    CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
    CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId"
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AspNetUserTokens" (
    "UserId"        text NOT NULL,
    "LoginProvider" text NOT NULL,
    "Name"          text NOT NULL,
    "Value"         text,
    CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
    CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

-- Índices Identity
CREATE UNIQUE INDEX IF NOT EXISTS "RoleNameIndex"
    ON "AspNetRoles" ("NormalizedName")
    WHERE "NormalizedName" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IX_AspNetRoleClaims_RoleId" ON "AspNetRoleClaims" ("RoleId");

CREATE INDEX IF NOT EXISTS "EmailIndex"
    ON "AspNetUsers" ("NormalizedEmail");

CREATE UNIQUE INDEX IF NOT EXISTS "UserNameIndex"
    ON "AspNetUsers" ("NormalizedUserName")
    WHERE "NormalizedUserName" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IX_AspNetUserClaims_UserId"  ON "AspNetUserClaims"  ("UserId");
CREATE INDEX IF NOT EXISTS "IX_AspNetUserLogins_UserId"  ON "AspNetUserLogins"  ("UserId");
CREATE INDEX IF NOT EXISTS "IX_AspNetUserRoles_RoleId"   ON "AspNetUserRoles"   ("RoleId");

-- ============================================================
-- TABLAS DE NEGOCIO
-- ============================================================

-- Hotels
CREATE TABLE IF NOT EXISTS "Hotels" (
    "Id"        uuid        NOT NULL DEFAULT gen_random_uuid(),
    "Name"      varchar(200) NOT NULL,
    "Country"   varchar(100) NOT NULL,
    "City"      varchar(100) NOT NULL,
    "Address"   varchar(300) NOT NULL DEFAULT '',
    "Stars"     integer     NOT NULL CHECK ("Stars" BETWEEN 1 AND 5),
    "Category"  varchar(32) NOT NULL,    -- Business | Resort | Boutique | City
    "Email"     varchar(200) NOT NULL DEFAULT '',
    "Phone"     varchar(50)  NOT NULL DEFAULT '',
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    "IsActive"  boolean     NOT NULL DEFAULT true,
    CONSTRAINT "PK_Hotels" PRIMARY KEY ("Id")
);

-- RoomTypes
CREATE TABLE IF NOT EXISTS "RoomTypes" (
    "Id"          uuid         NOT NULL DEFAULT gen_random_uuid(),
    "HotelId"     uuid         NOT NULL,
    "Name"        varchar(100) NOT NULL,
    "Capacity"    integer      NOT NULL CHECK ("Capacity" BETWEEN 1 AND 20),
    "BasePrice"   numeric(10,2) NOT NULL CHECK ("BasePrice" >= 0),
    "Description" varchar(500) NOT NULL DEFAULT '',
    "TotalRooms"  integer      NOT NULL CHECK ("TotalRooms" BETWEEN 1 AND 10000),
    CONSTRAINT "PK_RoomTypes" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_RoomTypes_Hotels_HotelId"
        FOREIGN KEY ("HotelId") REFERENCES "Hotels" ("Id") ON DELETE CASCADE
);

-- InventoryDays
CREATE TABLE IF NOT EXISTS "InventoryDays" (
    "Id"             uuid         NOT NULL DEFAULT gen_random_uuid(),
    "RoomTypeId"     uuid         NOT NULL,
    "Date"           date         NOT NULL,
    "AvailableRooms" integer      NOT NULL,
    "Price"          numeric(10,2) NOT NULL,
    CONSTRAINT "PK_InventoryDays" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_InventoryDays_RoomTypes_RoomTypeId"
        FOREIGN KEY ("RoomTypeId") REFERENCES "RoomTypes" ("Id") ON DELETE CASCADE
);

-- Reservations
CREATE TABLE IF NOT EXISTS "Reservations" (
    "Id"         uuid         NOT NULL DEFAULT gen_random_uuid(),
    "HotelId"    uuid         NOT NULL,
    "RoomTypeId" uuid         NOT NULL,
    "GuestName"  varchar(200) NOT NULL,
    "GuestEmail" varchar(200) NOT NULL,
    "CheckIn"    date         NOT NULL,
    "CheckOut"   date         NOT NULL,
    "Rooms"      integer      NOT NULL DEFAULT 1 CHECK ("Rooms" BETWEEN 1 AND 50),
    "TotalPrice" numeric(12,2) NOT NULL,
    "Status"     varchar(32)  NOT NULL, -- Pending | Confirmed | Cancelled | CheckedIn | CheckedOut
    "CreatedAt"  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT "PK_Reservations" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Reservations_Hotels_HotelId"
        FOREIGN KEY ("HotelId") REFERENCES "Hotels" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Reservations_RoomTypes_RoomTypeId"
        FOREIGN KEY ("RoomTypeId") REFERENCES "RoomTypes" ("Id") ON DELETE RESTRICT
);

-- Índices de negocio
CREATE INDEX IF NOT EXISTS "IX_Hotels_Name"    ON "Hotels"  ("Name");
CREATE INDEX IF NOT EXISTS "IX_Hotels_Country" ON "Hotels"  ("Country");
CREATE INDEX IF NOT EXISTS "IX_Hotels_City"    ON "Hotels"  ("City");

CREATE INDEX IF NOT EXISTS "IX_RoomTypes_HotelId" ON "RoomTypes" ("HotelId");

CREATE UNIQUE INDEX IF NOT EXISTS "IX_InventoryDays_RoomTypeId_Date"
    ON "InventoryDays" ("RoomTypeId", "Date");
CREATE INDEX IF NOT EXISTS "IX_InventoryDays_Date" ON "InventoryDays" ("Date");

CREATE INDEX IF NOT EXISTS "IX_Reservations_HotelId"  ON "Reservations" ("HotelId");
CREATE INDEX IF NOT EXISTS "IX_Reservations_Status"   ON "Reservations" ("Status");
CREATE INDEX IF NOT EXISTS "IX_Reservations_CreatedAt" ON "Reservations" ("CreatedAt");

-- ============================================================
-- Permisos finales para el rol altairis
-- ============================================================
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO altairis;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO altairis;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES    TO altairis;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO altairis;
