export type HotelCategory = "Business" | "Resort" | "Boutique" | "City";

export type ReservationStatus =
  | "Pending"
  | "Confirmed"
  | "Cancelled"
  | "CheckedIn"
  | "CheckedOut";

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Hotel {
  id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  stars: number;
  category: HotelCategory;
  email: string;
  phone: string;
  isActive: boolean;
  roomTypesCount: number;
}

export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  capacity: number;
  basePrice: number;
  description: string;
  totalRooms: number;
}

export interface InventoryDay {
  id: string;
  roomTypeId: string;
  roomTypeName: string;
  date: string; // yyyy-MM-dd
  availableRooms: number;
  price: number;
}

export interface Reservation {
  id: string;
  code: string;
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  roomTypeName: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  totalPrice: number;
  status: ReservationStatus;
  createdAt: string;
}

export interface DashboardTrendPoint {
  date: string;
  reservas: number;
}

export interface DashboardStatusCount {
  status: ReservationStatus;
  count: number;
}

export interface DashboardSummary {
  totalHoteles: number;
  hotelesActivos: number;
  totalReservas: number;
  reservasHoy: number;
  ocupacionPct: number;
  ingresosEstimados30d: number;
  tendencia7d: DashboardTrendPoint[];
  reservasPorEstado: DashboardStatusCount[];
  ultimasReservas: Reservation[];
}

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  expiresAt: string;
}

export type MaintenancePriority = "Low" | "Medium" | "High" | "Critical";
export type MaintenanceStatus   = "Open" | "InProgress" | "Resolved";

export interface RoomMaintenance {
  id: string;
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  roomTypeName: string;
  roomIdentifier: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  affectedFrom: string; // yyyy-MM-dd
  affectedTo: string;   // yyyy-MM-dd
  inventoryBlocked: boolean;
  createdAt: string;
  resolvedAt: string | null;
}
