"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Plus, CheckCircle2, Circle, Trash2, LayoutGrid, List, GripVertical, ChevronRight, ChevronDown } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createTask, deleteTask, updateTask } from "@/lib/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProjectTask, Profile, TaskStatus } from "@/lib/supabase/database.types";

type AssignableProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;

const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: "todo",  label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "done",  label: "Done" },
];

export function TasksView({
  projectId,
  isShared,
  initialTasks,
  assignableProfiles,
  currentUserId,
  canWrite,
}: {
  projectId: string;
  isShared: boolean;
  initialTasks: ProjectTask[];
  assignableProfiles: AssignableProfile[];
  currentUserId: string;
  canWrite: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [input, setInput] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const topLevel = tasks.filter((t) => !t.parent_task_id);
  const childrenOf = (id: string) => tasks.filter((t) => t.parent_task_id === id);

  async function add() {
    const title = input.trim();
    if (!title || !canWrite) return;
    setInput("");
    // optimistic
    const tmp: ProjectTask = {
      id: `opt-${Math.random()}`,
      project_id: projectId,
      title,
      description: null,
      done: false,
      assigned_to: null,
      due_date: null,
      priority: null,
      status: "todo",
      order_idx: topLevel.length,
      parent_task_id: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    setTasks((cur) => [...cur, tmp]);
    startTransition(async () => {
      try {
        const created = await createTask({ project_id: projectId, title });
        setTasks((cur) => cur.map((t) => (t.id === tmp.id ? (created as ProjectTask) : t)));
      } catch {
        setTasks((cur) => cur.filter((t) => t.id !== tmp.id));
      }
    });
  }

  async function toggleDone(t: ProjectTask) {
    if (!canWrite) return;
    const next: TaskStatus = t.status === "done" ? "todo" : "done";
    setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, status: next, done: next === "done" } : x)));
    startTransition(() => updateTask(t.id, { status: next }));
  }

  async function setStatus(t: ProjectTask, status: TaskStatus) {
    if (!canWrite) return;
    setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, status, done: status === "done" } : x)));
    startTransition(() => updateTask(t.id, { status }));
  }

  async function remove(t: ProjectTask) {
    if (!canWrite) return;
    setTasks((cur) => cur.filter((x) => x.id !== t.id && x.parent_task_id !== t.id));
    startTransition(() => deleteTask(t.id));
  }

  async function assign(t: ProjectTask, userId: string | null) {
    if (!canWrite) return;
    setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, assigned_to: userId } : x)));
    startTransition(() => updateTask(t.id, { assigned_to: userId }));
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!canWrite || !e.over) return;
    const overId = String(e.over.id);
    const activeTaskId = String(e.active.id);
    // Kanban: dropping over a status column changes status
    if (view === "kanban" && (overId.startsWith("col:"))) {
      const status = overId.slice(4) as TaskStatus;
      const t = tasks.find((x) => x.id === activeTaskId);
      if (t && t.status !== status) setStatus(t, status);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-glow/25 bg-bg-card/40 p-0.5">
          <ViewToggle active={view === "list"} onClick={() => setView("list")} icon={<List className="h-3.5 w-3.5" />} label="List" />
          <ViewToggle active={view === "kanban"} onClick={() => setView("kanban")} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Kanban" />
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Input
              placeholder="Add task..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              className="w-64"
            />
            <Button onClick={add} disabled={!input.trim()}><Plus className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {view === "list" ? (
          <SortableContext items={topLevel.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {topLevel.length === 0 ? (
                <li className="rounded-lg border border-dashed border-glow/25 bg-bg-card/30 p-8 text-center text-sm text-fg-muted">
                  No tasks yet. {canWrite && "Add one above to begin."}
                </li>
              ) : null}
              {topLevel.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  subTasks={childrenOf(t.id)}
                  expanded={expandedId === t.id}
                  onToggleExpanded={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  onToggle={() => toggleDone(t)}
                  onRemove={() => remove(t)}
                  onAssign={(uid) => assign(t, uid)}
                  onToggleChild={(c) => toggleDone(c)}
                  onRemoveChild={(c) => remove(c)}
                  isShared={isShared}
                  assignableProfiles={assignableProfiles}
                  currentUserId={currentUserId}
                  canWrite={canWrite}
                  view="list"
                  onAddChild={async (title) => {
                    if (!canWrite) return;
                    const tmp: ProjectTask = {
                      id: `opt-${Math.random()}`, project_id: projectId, title, description: null, done: false,
                      assigned_to: null, due_date: null, priority: null, status: "todo",
                      order_idx: childrenOf(t.id).length, parent_task_id: t.id,
                      created_at: new Date().toISOString(), completed_at: null,
                    };
                    setTasks((cur) => [...cur, tmp]);
                    startTransition(async () => {
                      try {
                        const created = await createTask({ project_id: projectId, title, parent_task_id: t.id });
                        setTasks((cur) => cur.map((x) => (x.id === tmp.id ? (created as ProjectTask) : x)));
                      } catch {
                        setTasks((cur) => cur.filter((x) => x.id !== tmp.id));
                      }
                    });
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {STATUSES.map((s) => {
              const colTasks = topLevel.filter((t) => t.status === s.key);
              return (
                <KanbanColumn key={s.key} status={s.key} label={s.label} canWrite={canWrite}>
                  <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {colTasks.length === 0 && (
                        <li className="rounded-md border border-dashed border-glow/20 p-3 text-center text-[11px] text-fg-muted">empty</li>
                      )}
                      {colTasks.map((t) => (
                        <KanbanCard
                          key={t.id}
                          task={t}
                          isShared={isShared}
                          assignableProfiles={assignableProfiles}
                          onRemove={() => remove(t)}
                          onAssign={(uid) => assign(t, uid)}
                          canWrite={canWrite}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </KanbanColumn>
              );
            })}
          </div>
        )}
        <DragOverlay>
          {activeId && (() => {
            const t = tasks.find((x) => x.id === activeId);
            if (!t) return null;
            return (
              <div className="rounded-md border border-accent/60 bg-bg-elevated/95 px-3 py-2 text-sm shadow-2xl">
                {t.title}
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ViewToggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
        active ? "bg-accent text-bg-base" : "text-fg-muted hover:text-fg",
      )}
    >
      {icon} {label}
    </button>
  );
}

function TaskRow({
  task,
  subTasks,
  expanded,
  onToggleExpanded,
  onToggle,
  onRemove,
  onAssign,
  onToggleChild,
  onRemoveChild,
  onAddChild,
  isShared,
  assignableProfiles,
  currentUserId,
  canWrite,
  view,
}: {
  task: ProjectTask;
  subTasks: ProjectTask[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onAssign: (uid: string | null) => void;
  onToggleChild: (c: ProjectTask) => void;
  onRemoveChild: (c: ProjectTask) => void;
  onAddChild: (title: string) => Promise<void>;
  isShared: boolean;
  assignableProfiles: AssignableProfile[];
  currentUserId: string;
  canWrite: boolean;
  view: "list";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [childInput, setChildInput] = useState("");

  return (
    <li ref={setNodeRef} style={style} className={cn("group rounded-md border border-glow/15 bg-bg-elevated/30 px-3 py-2 transition-shadow", isDragging && "opacity-50")}>
      <div className="flex items-center gap-2">
        {canWrite && (
          <button {...attributes} {...listeners} className="cursor-grab text-fg-muted opacity-0 group-hover:opacity-100" aria-label="Drag">
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onToggle} disabled={!canWrite} aria-label="Toggle done">
          {task.status === "done" ? <CheckCircle2 className="h-5 w-5 text-accent" /> : <Circle className="h-5 w-5 text-fg-muted hover:text-fg" />}
        </button>
        {subTasks.length > 0 && (
          <button onClick={onToggleExpanded} className="text-fg-muted hover:text-fg" aria-label="Expand subtasks">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
        <span className={cn("flex-1 text-sm", task.status === "done" ? "text-fg-muted line-through" : "text-fg")}>{task.title}</span>
        {subTasks.length > 0 && (
          <span className="font-mono text-[10px] text-fg-muted">{subTasks.filter((c) => c.status === "done").length}/{subTasks.length}</span>
        )}
        {isShared && (
          <AssigneeMenu
            assigned={task.assigned_to}
            profiles={assignableProfiles}
            currentUserId={currentUserId}
            onChange={onAssign}
            disabled={!canWrite}
          />
        )}
        {canWrite && (
          <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-400" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="ml-9 mt-2 space-y-1.5 border-l border-glow/10 pl-3">
          {subTasks.map((c) => (
            <div key={c.id} className="group/sub flex items-center gap-2 py-0.5">
              <button onClick={() => onToggleChild(c)} disabled={!canWrite}>
                {c.status === "done" ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <Circle className="h-4 w-4 text-fg-muted" />}
              </button>
              <span className={cn("flex-1 text-sm", c.status === "done" ? "text-fg-muted line-through" : "text-fg")}>{c.title}</span>
              {canWrite && (
                <button onClick={() => onRemoveChild(c)} className="opacity-0 group-hover/sub:opacity-100 text-fg-muted hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {canWrite && (
            <div className="flex gap-1.5">
              <input
                value={childInput}
                onChange={(e) => setChildInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && childInput.trim()) {
                    const t = childInput.trim();
                    setChildInput("");
                    await onAddChild(t);
                  }
                }}
                placeholder="add subtask..."
                className="flex-1 bg-transparent text-xs text-fg-muted placeholder:text-fg-muted/60 focus:outline-none focus:text-fg"
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function AssigneeMenu({
  assigned,
  profiles,
  currentUserId,
  onChange,
  disabled,
}: {
  assigned: string | null;
  profiles: AssignableProfile[];
  currentUserId: string;
  onChange: (uid: string | null) => void;
  disabled?: boolean;
}) {
  const a = assigned ? profiles.find((p) => p.id === assigned) : null;
  return (
    <div className="relative">
      <select
        value={assigned ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="appearance-none rounded-full border border-glow/20 bg-bg-base/40 px-2 py-0.5 pr-5 font-mono text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg disabled:opacity-60"
      >
        <option value="">unassigned</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.id === currentUserId ? "Me" : p.display_name}</option>
        ))}
      </select>
      {a && (
        <Image
          src={a.avatar_url || (a.theme === "jinwoo" ? "/assets/jinwoo-default.svg" : "/assets/chahaein-default.svg")}
          alt=""
          width={16}
          height={16}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 rounded-full"
        />
      )}
    </div>
  );
}

function KanbanColumn({ status, label, canWrite, children }: { status: TaskStatus; label: string; canWrite: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useSortable({ id: `col:${status}`, disabled: !canWrite });
  return (
    <div ref={setNodeRef} className={cn("surface p-3 transition-colors", isOver && "ring-2 ring-accent/50")}>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fg-muted">{label}</p>
      {children}
    </div>
  );
}

function KanbanCard({ task, isShared, assignableProfiles, onRemove, onAssign, canWrite }: {
  task: ProjectTask;
  isShared: boolean;
  assignableProfiles: AssignableProfile[];
  onRemove: () => void;
  onAssign: (uid: string | null) => void;
  canWrite: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: !canWrite });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn("group rounded-md border border-glow/20 bg-bg-elevated/50 p-2.5 text-sm transition-all", isDragging && "opacity-50", canWrite && "cursor-grab active:cursor-grabbing")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn(task.status === "done" && "text-fg-muted line-through")}>{task.title}</span>
        {canWrite && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-400">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {isShared && (
        <div className="mt-1.5">
          <AssigneeMenu
            assigned={task.assigned_to}
            profiles={assignableProfiles}
            currentUserId=""
            onChange={onAssign}
            disabled={!canWrite}
          />
        </div>
      )}
    </li>
  );
}
