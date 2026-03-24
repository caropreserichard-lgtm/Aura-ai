"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Check, Trash2, ChevronRight, ChevronDown, Link2, ExternalLink, MessageSquare, FolderKanban } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Project, ProjectTask } from "@/lib/types";

const PROJECT_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#6366F1", "#14B8A6"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [newLink, setNewLink] = useState<Record<string, string>>({});

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch { setProjects([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async () => {
    if (!newName.trim()) return;
    await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), color: newColor }),
    });
    setNewName(""); setNewDesc(""); setNewColor(PROJECT_COLORS[0]); setShowNewProject(false);
    fetchProjects();
  };

  const deleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  };

  const addTask = async (projectId: string) => {
    const title = newTaskTitle[projectId]?.trim();
    if (!title) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_task", title }),
    });
    setNewTaskTitle((prev) => ({ ...prev, [projectId]: "" }));
    fetchProjects();
  };

  const toggleTask = async (projectId: string, taskId: string) => {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_task", taskId }),
    });
    fetchProjects();
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_task", taskId }),
    });
    fetchProjects();
  };

  const addComment = async (projectId: string, taskId: string) => {
    const key = `${projectId}-${taskId}`;
    const text = newComment[key]?.trim();
    if (!text) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_comment", taskId, text }),
    });
    setNewComment((prev) => ({ ...prev, [key]: "" }));
    fetchProjects();
  };

  const addLink = async (projectId: string, taskId: string) => {
    const key = `${projectId}-${taskId}`;
    const link = newLink[key]?.trim();
    if (!link) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_link", taskId, link }),
    });
    setNewLink((prev) => ({ ...prev, [key]: "" }));
    fetchProjects();
  };

  const removeLink = async (projectId: string, taskId: string, linkIndex: number) => {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_link", taskId, linkIndex }),
    });
    fetchProjects();
  };

  const getProgress = (tasks: ProjectTask[]) => {
    if (!tasks || tasks.length === 0) return 0;
    return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={() => setShowNewProject(true)} />
        <div className="p-4 md:p-6 space-y-4 pb-24 md:pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban size={20} className="text-accent" />
              <h1 className="font-heading font-semibold text-lg">Projects</h1>
            </div>
            <button onClick={() => setShowNewProject(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse text-[12px] font-medium transition-colors">
              <Plus size={14} /> New Project
            </button>
          </div>

          {/* New Project Form */}
          {showNewProject && (
            <div className="rounded-lg bg-bg-secondary border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">New Project</h3>
                <button onClick={() => setShowNewProject(false)} className="text-text-muted hover:text-text-secondary"><X size={16} /></button>
              </div>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name"
                autoFocus onKeyDown={(e) => e.key === "Enter" && createProject()}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm" />
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm" />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted">Color:</span>
                {PROJECT_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${newColor === c ? "ring-2 ring-offset-2 ring-offset-bg-secondary" : "hover:scale-110"}`}
                    style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }} />
                ))}
              </div>
              <button onClick={createProject} disabled={!newName.trim()}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse text-sm font-medium disabled:opacity-40 transition-colors">
                Create Project
              </button>
            </div>
          )}

          {/* Projects List */}
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-bg-secondary border border-border animate-pulse" />)}</div>
          ) : projects.length === 0 && !showNewProject ? (
            <div className="text-center py-16 rounded-lg bg-bg-secondary border border-border">
              <FolderKanban size={40} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-muted text-sm">No projects yet</p>
              <button onClick={() => setShowNewProject(true)} className="mt-3 text-accent text-sm font-medium hover:underline">Create your first project</button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const isExpanded = expandedProject === project._id;
                const progress = getProgress(project.tasks || []);
                const totalTasks = (project.tasks || []).length;
                const doneTasks = (project.tasks || []).filter((t) => t.done).length;

                return (
                  <div key={project._id} className="rounded-lg bg-bg-secondary border border-border overflow-hidden">
                    {/* Project Header */}
                    <button
                      onClick={() => setExpandedProject(isExpanded ? null : project._id!)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-hover transition-colors text-left"
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                      {isExpanded ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold text-sm truncate">{project.name}</h3>
                          <span className="text-[11px] text-text-muted">{doneTasks}/{totalTasks}</span>
                        </div>
                        {project.description && <p className="text-[11px] text-text-muted truncate">{project.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-32 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                        </div>
                        <span className="text-[12px] font-mono font-semibold min-w-[36px] text-right" style={{ color: progress === 100 ? "#10B981" : project.color }}>
                          {progress}%
                        </span>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border">
                        {/* Tasks */}
                        <div className="mt-3 space-y-1">
                          {(project.tasks || []).map((task) => {
                            const taskKey = `${project._id}-${task.id}`;
                            const isTaskExpanded = expandedTask === task.id;

                            return (
                              <div key={task.id} className="rounded-lg border border-border overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 hover:bg-bg-hover transition-colors">
                                  <button onClick={() => toggleTask(project._id!, task.id)}
                                    className={`w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                                      task.done ? "bg-accent border-accent" : "border-text-muted hover:border-accent"
                                    }`}>
                                    {task.done && <Check size={8} className="text-text-inverse" />}
                                  </button>
                                  <button onClick={() => setExpandedTask(isTaskExpanded ? null : task.id)}
                                    className={`flex-1 text-left text-[12px] ${task.done ? "line-through text-text-muted" : "text-text-primary"}`}>
                                    {task.title}
                                  </button>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {(task.links || []).length > 0 && (
                                      <span className="text-accent"><Link2 size={11} /></span>
                                    )}
                                    {(task.comments || []).length > 0 && (
                                      <span className="flex items-center gap-0.5 text-text-muted text-[10px]">
                                        <MessageSquare size={10} /> {task.comments.length}
                                      </span>
                                    )}
                                    <button onClick={() => deleteTask(project._id!, task.id)}
                                      className="text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>

                                {/* Task Detail */}
                                {isTaskExpanded && (
                                  <div className="px-3 pb-3 space-y-2 border-t border-border bg-bg-primary/50">
                                    {/* Links */}
                                    <div className="pt-2">
                                      <h4 className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Links</h4>
                                      {(task.links || []).map((link, i) => (
                                        <div key={i} className="flex items-center gap-2 group/link">
                                          <Link2 size={10} className="text-accent flex-shrink-0" />
                                          <a href={link} target="_blank" rel="noopener noreferrer"
                                            className="text-[11px] text-accent hover:underline truncate flex-1">
                                            {link.replace(/^https?:\/\/(www\.)?/, "").slice(0, 50)}
                                          </a>
                                          <ExternalLink size={9} className="text-accent flex-shrink-0" />
                                          <button onClick={() => removeLink(project._id!, task.id, i)}
                                            className="opacity-0 group-hover/link:opacity-100 text-text-muted hover:text-danger transition-all">
                                            <X size={10} />
                                          </button>
                                        </div>
                                      ))}
                                      <div className="flex items-center gap-1 mt-1">
                                        <input type="url" value={newLink[taskKey] || ""} onChange={(e) => setNewLink((p) => ({ ...p, [taskKey]: e.target.value }))}
                                          onKeyDown={(e) => e.key === "Enter" && addLink(project._id!, task.id)}
                                          placeholder="Add link..."
                                          className="flex-1 bg-transparent text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none border-b border-border focus:border-accent pb-0.5" />
                                        {newLink[taskKey] && (
                                          <button onClick={() => addLink(project._id!, task.id)} className="text-accent"><Plus size={12} /></button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Comments */}
                                    <div>
                                      <h4 className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Comments</h4>
                                      {(task.comments || []).map((c) => (
                                        <div key={c.id} className="flex gap-2 mb-1">
                                          <div className="w-1 rounded-full bg-accent/30 flex-shrink-0" />
                                          <div>
                                            <p className="text-[11px] text-text-secondary">{c.text}</p>
                                            <p className="text-[9px] text-text-muted">{new Date(c.createdAt).toLocaleDateString("es", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                                          </div>
                                        </div>
                                      ))}
                                      <div className="flex items-center gap-1 mt-1">
                                        <input type="text" value={newComment[taskKey] || ""} onChange={(e) => setNewComment((p) => ({ ...p, [taskKey]: e.target.value }))}
                                          onKeyDown={(e) => e.key === "Enter" && addComment(project._id!, task.id)}
                                          placeholder="Add comment..."
                                          className="flex-1 bg-transparent text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none border-b border-border focus:border-accent pb-0.5" />
                                        {newComment[taskKey] && (
                                          <button onClick={() => addComment(project._id!, task.id)} className="text-accent"><Plus size={12} /></button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Delete */}
                                    <button onClick={() => deleteTask(project._id!, task.id)}
                                      className="flex items-center gap-1 text-[10px] text-danger hover:bg-danger-subtle px-2 py-1 rounded transition-colors">
                                      <Trash2 size={10} /> Delete task
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Task */}
                        <div className="flex items-center gap-2 mt-2">
                          <Plus size={14} className="text-text-muted" />
                          <input type="text" value={newTaskTitle[project._id!] || ""}
                            onChange={(e) => setNewTaskTitle((p) => ({ ...p, [project._id!]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && addTask(project._id!)}
                            placeholder="Add task..."
                            className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none" />
                        </div>

                        {/* Delete Project */}
                        <div className="mt-3 pt-3 border-t border-border flex justify-end">
                          <button onClick={() => deleteProject(project._id!)}
                            className="text-[11px] text-danger hover:bg-danger-subtle px-2 py-1 rounded transition-colors">
                            Delete project
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
