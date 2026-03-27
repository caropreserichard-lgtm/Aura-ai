"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const translations = {
  es: {
    "nav.home": "Inicio",
    "nav.today": "Hoy",
    "nav.inbox": "Bandeja",
    "nav.tasks": "Tareas",
    "nav.projects": "Proyectos",
    "nav.tools": "Herramientas",
    "nav.focus": "Enfoque",
    "nav.stats": "Estadísticas",
    "nav.weekly_review": "Revisión Semanal",
    "nav.timer": "Temporizador",
    "nav.backlog": "Pendientes",
    "nav.settings": "Ajustes",
    "profile.title": "Mi Perfil",
    "profile.full_name": "Nombre completo",
    "profile.email": "Correo electrónico",
    "profile.empire_name": "Nombre del Imperio",
    "profile.save": "Guardar cambios",
    "profile.saved": "Guardado",
    "profile.logout": "Cerrar sesión",
    "profile.account": "Cuenta",
    "profile.general": "General",
    "profile.set_password": "Cambiar contraseña",
    "profile.change_email": "Cambiar email principal",
    "profile.export_data": "Exportar mis datos",
    "profile.logout_all": "Cerrar todas las sesiones",
    "profile.delete_account": "Eliminar cuenta",
    "profile.timezone": "Zona horaria",
    "profile.time_format": "Formato de hora",
    "profile.start_of_week": "Inicio de semana",
    "profile.language": "Idioma preferido",
    "profile.count_planned": "Contar tiempo planeado como actual",
    "home.add_task": "Agregar tarea",
    "home.filter": "Filtro",
    "common.today": "Hoy",
    "common.tomorrow": "Mañana",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
  },
  en: {
    "nav.home": "Home",
    "nav.today": "Today",
    "nav.inbox": "Inbox",
    "nav.tasks": "Tasks",
    "nav.projects": "Projects",
    "nav.tools": "Tools",
    "nav.focus": "Focus",
    "nav.stats": "Stats",
    "nav.weekly_review": "Weekly Review",
    "nav.timer": "Timer",
    "nav.backlog": "Backlog",
    "nav.settings": "Settings",
    "profile.title": "My Profile",
    "profile.full_name": "Full name",
    "profile.email": "Email",
    "profile.empire_name": "Empire Name",
    "profile.save": "Save changes",
    "profile.saved": "Saved",
    "profile.logout": "Log out",
    "profile.account": "Account",
    "profile.general": "General",
    "profile.set_password": "Set password",
    "profile.change_email": "Change primary email",
    "profile.export_data": "Export my data",
    "profile.logout_all": "Logout all sessions",
    "profile.delete_account": "Delete account",
    "profile.timezone": "Time zone",
    "profile.time_format": "Time format",
    "profile.start_of_week": "Start of week",
    "profile.language": "Preferred language",
    "profile.count_planned": "Count planned time as actual time",
    "home.add_task": "Add task",
    "home.filter": "Filter",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
  },
};

type Lang = "es" | "en";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    // Load from localStorage or fetch from API
    const saved = localStorage.getItem("tayrona-lang") as Lang;
    if (saved && (saved === "es" || saved === "en")) setLangState(saved);
    // Also fetch from user preferences
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences?.language) setLangState(d.preferences.language as Lang);
      })
      .catch(() => {});
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("tayrona-lang", l);
  };

  const t = (key: string) => {
    return (translations[lang] as Record<string, string>)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
