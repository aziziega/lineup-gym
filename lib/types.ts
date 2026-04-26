export interface Gym {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  close_time: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  gym_id: string;
  name: string;
  category: 'gym' | 'pt' | 'class';
  duration_days: number;
  total_sessions: number | null;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  gym_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  emergency_contact: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  member_id: string;
  membership_id: string;
  start_date: string;
  end_date: string;
  remaining_sessions: number | null;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string | null;
  amount: number;
  payment_method: 'cash' | 'transfer' | 'qris';
  membership_type: string;
  notes: string | null;
  paid_at: string;
  created_at: string;
}

export interface Class {
  id: string;
  gym_id: string;
  name: string;
  trainer_name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  gym_id: string;
  member_id: string;
  class_id: string;
  booked_date: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
}

export interface AttendanceLog {
  id: string;
  gym_id: string;
  member_id: string;
  check_in_at: string;
  checked_by: string | null;
  notes: string | null;
}

export interface ActivityLog {
  id: string;
  gym_id: string;
  admin_id: string | null;
  action_type: string;
  table_name: string | null;
  record_id: string | null;
  details: any | null;
  created_at: string;
}

// VIEWS

export interface ActiveSubscriptionView {
  member_id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  photo_url: string | null;
  
  // Gym Info
  membership_name: string | null;
  price: number | null;
  subscription_id: string | null;
  start_date: string | null;
  end_date: string | null;
  days_remaining: number | null;
  status: 'active' | 'expiring_soon' | 'critical' | 'expired' | 'inactive';

  // PT Info
  pt_membership_name: string | null;
  pt_subscription_id: string | null;
  pt_start_date: string | null;
  pt_end_date: string | null;
  pt_remaining_sessions: number | null;
  pt_total_sessions: number | null;
  pt_status: 'active' | 'expired' | 'inactive';
}

export interface Expense {
  id: string;
  gym_id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
  created_at: string;
}

export interface RevenueMonthlyView {
  month_label: string;
  month: string;
  total: number;
  transaction_count: number;
}

export interface MemberAttendanceView {
  member_id: string;
  total_attendance: number;
  last_check_in: string;
}
