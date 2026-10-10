export type AppView =
  | "landing"
  | "login"
  | "dashboard"
  | "trading"
  | "past-trade"
  | "closed-trade"
  | "admin"
  | "courses"
  | "course-detail"
  | "videos"
  | "blogs";

export interface User {
  phone: string;
  name: string;
  subscription: "free" | "pro";
  /** Short-lived (30 min) session JWT — required for authenticated API calls. */
  token?: string;
  /** Phone-based backend user id — needed to call /auth/refresh/* before any token exists. */
  userId?: string;
  /** "customer" (default) | "analyst" | "compliance" | "admin" — gates /admin. */
  role?: string;
}

export type NavigateFn = (view: AppView, courseId?: number) => void;
