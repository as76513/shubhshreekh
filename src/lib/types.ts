export type AppView =
  | "landing"
  | "login"
  | "dashboard"
  | "trading"
  | "courses"
  | "course-detail"
  | "videos";

export interface User {
  phone: string;
  name: string;
  subscription: "free" | "pro";
  /** Session JWT from /auth/verify-otp — required for authenticated API calls. */
  token?: string;
}

export type NavigateFn = (view: AppView, courseId?: number) => void;
