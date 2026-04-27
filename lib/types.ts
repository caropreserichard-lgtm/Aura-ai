export type Category = "trabajo" | "aprendizaje" | "lifestyle" | "proyectos";
export type Priority = 1 | 2 | 3 | 4;
export type TaskStatus = "pending" | "in_progress" | "done";

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  category: Category;
  subcategory: string;
  priority: Priority;
  roi: number;
  joy: number;
  flowScore: number;
  xp: number;
  status: TaskStatus;
  timeSpent: number;
  startDate?: string;
  dueDate?: string;
  recurring?: {
    type: "daily" | "weekdays" | "weekends" | "weekly" | "custom";
    days?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  };
  completions?: string[]; // "YYYY-MM-DD" dates when done
  skips?: string[];       // "YYYY-MM-DD" dates when skipped
  overrides?: Record<string, { // per-day overrides for recurring tasks
    startDate?: string;
    estimatedTime?: number;
  }>;
  subtasks?: { text: string; done: boolean }[];
  tags: string[];
  sourceUrl?: string;
  estimatedTime?: number;
  attachments?: { name: string; url: string; size: number; type: string; uploadedAt: string }[];
  comments?: { id: string; text: string; createdAt: string }[];
  calendarEventId?: string;
  createdAt: string;
  completedAt?: string;
  sortOrder?: number;
}

export interface UserStats {
  _id?: string;
  date: string;
  totalXP: number;
  tasksCompleted: number;
  tasksByCategory: Record<string, number>;
  timeByCategory: Record<string, number>;
  flowScoreAvg: number;
  streak: number;
}

export interface InboxItem {
  _id?: string;
  rawText: string;
  parsedCategory?: string;
  parsedSubcategory?: string;
  parsedTitle?: string;
  suggestedRoi?: number;
  suggestedJoy?: number;
  url?: string;
  processed: boolean;
  createdAt: string;
}

export interface CategoryConfig {
  label: string;
  icon: string;
  color: string;
  xpMultiplier: number;
  subcategories: string[];
}

export const CATEGORIES: Record<Category, CategoryConfig> = {
  trabajo: {
    label: "Trabajo",
    icon: "\u26A1",
    color: "#F59E0B",
    xpMultiplier: 2.0,
    subcategories: [
      "Crypto / Memecoin",
      "App Building (QOVE)",
      "Gastro Bar Ops",
      "Web Marketing AI",
      "Content Creation",
      "Client Work / Freelance",
    ],
  },
  aprendizaje: {
    label: "Aprendizaje",
    icon: "\uD83E\uDDE0",
    color: "#8B5CF6",
    xpMultiplier: 1.5,
    subcategories: [
      "Historia Colombia / LatAm",
      "Historia Mundial",
      "Astronom\u00EDa / Ciencia",
      "Pol\u00EDtica / Geopol\u00EDtica",
      "Filosof\u00EDa",
      "Vocabulario / Idiomas",
    ],
  },
  lifestyle: {
    label: "Lifestyle",
    icon: "\uD83C\uDF3F",
    color: "#10B981",
    xpMultiplier: 1.0,
    subcategories: [
      "Gym / Fitness",
      "Meditaci\u00F3n / Mindfulness",
      "Salud Mental",
      "Nutrici\u00F3n",
      "Social / Networking",
      "Descanso / Recovery",
    ],
  },
  proyectos: {
    label: "Proyectos",
    icon: "\uD83D\uDE80",
    color: "#3B82F6",
    xpMultiplier: 1.8,
    subcategories: [
      "Memecoin Intel",
      "AI Hype Engine",
      "WhatsApp Reservation Bot",
      "QOVE Platform",
      "Gastro Bar Digital",
      "Side Projects",
    ],
  },
};

export interface Project {
  _id?: string;
  name: string;
  description?: string;
  color: string;
  labels?: string[];
  tasks: ProjectTask[];
  archived?: boolean;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  labels?: string[];
  dueDate?: string;
  checklist?: { id: string; text: string; done: boolean }[];
  comments: ProjectComment[];
  links: string[];
  createdAt: string;
  completedAt?: string;
}

export interface ProjectComment {
  id: string;
  text: string;
  createdAt: string;
}

export interface CalendarToken {
  _id?: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email: string;
  connectedAt: string;
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  1: { label: "Cr\u00EDtica", color: "#EF4444" },
  2: { label: "Alta", color: "#F59E0B" },
  3: { label: "Media", color: "#3B82F6" },
  4: { label: "Baja", color: "#6B7280" },
};
