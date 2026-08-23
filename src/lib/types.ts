export type AppView =
  | "landing"
  | "login"
  | "dashboard"
  | "trading"
  | "mf-alerts"
  | "courses"
  | "course-detail"
  | "videos";

export interface User {
  phone: string;
  name: string;
  subscription: "free" | "pro";
}

export type NavigateFn = (view: AppView, courseId?: number) => void;
