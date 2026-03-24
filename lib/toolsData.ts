export interface ToolItem {
  id: string;
  name: string;
  url: string;
  description: string;
  icon?: string;
}

export interface ToolCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  tools: ToolItem[];
  order: number;
}

export const DEFAULT_CATEGORIES: Omit<ToolCategory, "order">[] = [
  {
    id: "educativo",
    name: "Educativo",
    color: "#8B5CF6",
    icon: "GraduationCap",
    tools: [
      { id: "udemy-ai", name: "Udemy AI Course", url: "https://udemy.com", description: "Formación avanzada en IA y tech" },
      { id: "coursera", name: "Coursera", url: "https://coursera.org", description: "Cursos de universidades top" },
      { id: "deeplearning", name: "DeepLearning.AI", url: "https://deeplearning.ai", description: "Especialización en deep learning" },
    ],
  },
  {
    id: "ai-marketing",
    name: "AI Marketing",
    color: "#F59E0B",
    icon: "Sparkles",
    tools: [
      { id: "aiagents", name: "AI Agents Hub", url: "https://aiagents.com", description: "Automatización de presencia digital" },
      { id: "jasper", name: "Jasper AI", url: "https://jasper.ai", description: "Copywriting con IA" },
      { id: "midjourney", name: "Midjourney", url: "https://midjourney.com", description: "Generación de imágenes con IA" },
    ],
  },
  {
    id: "productividad",
    name: "Productividad",
    color: "#10B981",
    icon: "Zap",
    tools: [
      { id: "notion", name: "Notion", url: "https://notion.so", description: "Workspace todo-en-uno" },
      { id: "linear", name: "Linear", url: "https://linear.app", description: "Project management moderno" },
      { id: "raycast", name: "Raycast", url: "https://raycast.com", description: "Launcher y productividad Mac" },
    ],
  },
  {
    id: "content-creation",
    name: "Content Creation",
    color: "#EC4899",
    icon: "Video",
    tools: [
      { id: "capcut", name: "CapCut", url: "https://capcut.com", description: "Edición de video con IA" },
      { id: "canva", name: "Canva", url: "https://canva.com", description: "Diseño gráfico simplificado" },
      { id: "descript", name: "Descript", url: "https://descript.com", description: "Edición de audio y video con IA" },
    ],
  },
];
