export interface CreateServiceCommand {
  providerId: string;
  title: string;
  description?: string;
  category?: string;
  subcategory?: string;
  durationMinutes: number;
  price: number;
  priceType: "fixed" | "hourly";
  atHome?: boolean;
  inOffice?: boolean;
  remote?: boolean;
  photos?: string[];
  requirements?: string[];
}

export interface WeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxConcurrent?: number;
}

export interface BookSlotCommand {
  serviceId: string;
  providerId: string;
  clientId: string;
  date: string;
  startTime: string;
  endTime: string;
  clientNotes?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface ProviderDashboard {
  todayBookings: number;
  weekRevenue: number;
  monthRevenue: number;
  pendingRequests: number;
  nextAppointment: any | null;
}

export interface ServiceUseCases {
  createService(cmd: CreateServiceCommand): Promise<any>;
  updateService(serviceId: string, updates: Partial<CreateServiceCommand>): Promise<void>;
  deleteService(serviceId: string): Promise<void>;
  setAvailability(providerId: string, weeklySlots: WeeklySlot[]): Promise<void>;
  getAvailableSlots(serviceId: string, providerId: string, dateRange: { from: string; to: string }): Promise<AvailableSlot[]>;
  bookSlot(cmd: BookSlotCommand): Promise<any>;
  confirmBooking(bookingId: string): Promise<void>;
  rejectBooking(bookingId: string, reason?: string): Promise<void>;
  cancelBooking(bookingId: string, cancelledBy: "client" | "provider", reason?: string): Promise<void>;
  startService(bookingId: string): Promise<void>;
  completeService(bookingId: string, providerNotes?: string): Promise<void>;
  getProviderDashboard(providerId: string): Promise<ProviderDashboard>;
}
