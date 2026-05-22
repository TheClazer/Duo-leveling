// Hand-written. Regenerate with `supabase gen types typescript` once tables stabilize.
export type Theme = "jinwoo" | "chahaein";

export type Profile = {
  id: string;
  display_name: string;
  theme: Theme;
  avatar_url: string | null;
  tagline: string | null;
  about: string | null;
  couple_id: string | null;
  level: number;
  xp: number;
  created_at: string;
  updated_at: string;
};

export type Couple = {
  id: string;
  user_a: string | null;
  user_b: string | null;
  started_date: string | null;
  created_at: string;
};

export type CoupleInvite = {
  id: string;
  from_user: string;
  token: string;
  used: boolean;
  expires_at: string | null;
  created_at: string;
};

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  target_per_week: number;
  archived: boolean;
  order_idx: number;
  created_at: string;
};

export type HabitEntry = {
  id: string;
  habit_id: string;
  date: string;
  value: number;
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  category: string | null;
  progress: number;
  is_shared: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  goal_id: string;
  title: string;
  done: boolean;
  order_idx: number;
  created_at: string;
};

export type Recurring = "none" | "daily" | "weekdays" | "weekly" | "custom";

export type ChecklistItem = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  recurring: Recurring;
  done: boolean;
  carry_over: boolean;
  order_idx: number;
  created_at: string;
  completed_at: string | null;
};

export type Note = {
  id: string;
  user_id: string;
  content: string;
  date: string;
  tags: string[] | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
};

export type LayoutItem = {
  i: string; // widget id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type DashboardLayout = {
  user_id: string;
  layout: LayoutItem[];
  updated_at: string;
};

export type ProjectStatus = "idea" | "active" | "paused" | "done" | "archived";
export type Project = {
  id: string;
  owner_id: string;
  couple_id: string | null;
  is_shared: boolean;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: ProjectStatus;
  progress_pct: number;
  category: string | null;
  tags: string[] | null;
  target_date: string | null;
  github_repo: string | null;
  linked_goal_id: string | null;
  pinned: boolean;
  notify_on_assign: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type TaskPriority = "low" | "med" | "high";
export type TaskStatus = "todo" | "doing" | "done";
export type ProjectTask = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  done: boolean;
  assigned_to: string | null;
  due_date: string | null;
  priority: TaskPriority | null;
  status: TaskStatus;
  order_idx: number;
  parent_task_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export type ProjectMilestone = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  done: boolean;
  completed_at: string | null;
  order_idx: number;
  created_at: string;
};

export type ProjectNote = {
  id: string;
  project_id: string;
  title: string | null;
  content: string;
  pinned: boolean;
  created_by: string | null;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectResource = {
  id: string;
  project_id: string;
  type: "link" | "file" | "image" | "embed";
  url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  added_by: string | null;
  added_at: string;
};

export type ProjectTimeLog = {
  id: string;
  project_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  summary: string | null;
  source: "timer" | "manual";
};

export type ProjectUpdate = {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  media_urls: string[] | null;
  created_at: string;
};

export type ProjectActivityAction =
  | "created"
  | "task_added"
  | "task_completed"
  | "task_updated"
  | "milestone_added"
  | "milestone_completed"
  | "note_added"
  | "note_updated"
  | "resource_added"
  | "time_logged"
  | "status_changed"
  | "update_posted";

export type ProjectActivity = {
  id: string;
  project_id: string;
  user_id: string | null;
  action: ProjectActivityAction;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type SaveLater = {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  description: string | null;
  bucket: "read" | "watch" | "try" | "build" | "other";
  status: "pending" | "done" | "archived";
  tags: string[] | null;
  notes: string | null;
  project_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export type DocumentRow = {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  folder: string | null;
  project_id: string | null;
  created_at: string;
};

export type LeetcodeProfile = {
  user_id: string;
  username: string;
  last_synced: string | null;
  total_solved: number | null;
  easy: number | null;
  medium: number | null;
  hard: number | null;
  ranking: number | null;
  current_streak: number | null;
  calendar: Record<string, number> | null;
};

export type GithubProfile = {
  user_id: string;
  username: string;
  token_encrypted: string | null;
  last_synced: string | null;
  contributions_year: number | null;
  current_streak: number | null;
  pinned_repos: Array<{ name: string; description: string | null; stars: number; forks: number; url: string }> | null;
  calendar: Record<string, number> | null;
};

export type StepsEntry = {
  user_id: string;
  date: string;
  count: number;
  source: "google_fit" | "health_connect" | "manual" | "shortcut";
};

export type EventRow = {
  id: string;
  couple_id: string;
  title: string;
  datetime: string;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type BucketItem = {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "dream" | "planning" | "done";
  photo_url: string | null;
  completed_at: string | null;
  created_at: string;
};

export type RecurringDate = {
  id: string;
  couple_id: string;
  title: string;
  anchor_date: string;
  type: "anniversary" | "birthday" | "monthly" | "custom";
  reminder_days_before: number;
  created_at: string;
};

export type Decision = {
  id: string;
  couple_id: string;
  decision_text: string;
  context: string | null;
  tags: string[] | null;
  decided_at: string;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type Memory = {
  id: string;
  couple_id: string;
  photo_url: string;
  caption: string | null;
  date_of_memory: string;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type GiftIdea = {
  id: string;
  for_user_id: string;
  by_user_id: string;
  idea_text: string;
  link_url: string | null;
  status: "idea" | "bought" | "given" | "dismissed";
  notes: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string | null;
  media_urls: string[] | null;
  project_id: string | null;
  created_at: string;
};

export type PostReaction = {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type Achievement = {
  id: string;
  user_id: string;
  code: string;
  unlocked_at: string;
  data: Record<string, unknown> | null;
  pinned: boolean;
};

export type Surprise = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string | null;
  media_url: string | null;
  deliver_at: string;
  delivered: boolean;
  opened_at: string | null;
  created_at: string;
};

export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

type Rels = readonly [];

export type ProjectSummaryRow = {
  task_total: number;
  task_done: number;
  milestone_count: number;
  note_count: number;
  resource_count: number;
  update_count: number;
  total_minutes: number;
};

export type Database = {
  public: {
    Functions: {
      my_couple_id:        { Args: Record<string, never>; Returns: string | null };
      is_self_or_partner:  { Args: { uid: string };       Returns: boolean };
      can_read_project:    { Args: { p_id: string };      Returns: boolean };
      can_write_project:   { Args: { p_id: string };      Returns: boolean };
      get_project_summary: { Args: { p_id: string };      Returns: ProjectSummaryRow };
    };
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; display_name: string; theme: Theme }; Update: Partial<Profile>; Relationships: Rels };
      couples: { Row: Couple; Insert: Partial<Couple>; Update: Partial<Couple>; Relationships: Rels };
      couple_invites: { Row: CoupleInvite; Insert: Partial<CoupleInvite> & { from_user: string; token: string }; Update: Partial<CoupleInvite>; Relationships: Rels };
      habits: { Row: Habit; Insert: Partial<Habit> & { user_id: string; name: string }; Update: Partial<Habit>; Relationships: Rels };
      habit_entries: { Row: HabitEntry; Insert: Partial<HabitEntry> & { habit_id: string; date: string }; Update: Partial<HabitEntry>; Relationships: Rels };
      goals: { Row: Goal; Insert: Partial<Goal> & { user_id: string; title: string }; Update: Partial<Goal>; Relationships: Rels };
      milestones: { Row: Milestone; Insert: Partial<Milestone> & { goal_id: string; title: string }; Update: Partial<Milestone>; Relationships: Rels };
      checklist_items: { Row: ChecklistItem; Insert: Partial<ChecklistItem> & { user_id: string; title: string; date: string }; Update: Partial<ChecklistItem>; Relationships: Rels };
      notes: { Row: Note; Insert: Partial<Note> & { user_id: string; content: string }; Update: Partial<Note>; Relationships: Rels };
      dashboard_layouts: { Row: DashboardLayout; Insert: Partial<DashboardLayout> & { user_id: string }; Update: Partial<DashboardLayout>; Relationships: Rels };
      projects: { Row: Project; Insert: Partial<Project> & { owner_id: string; title: string }; Update: Partial<Project>; Relationships: Rels };
      project_tasks: { Row: ProjectTask; Insert: Partial<ProjectTask> & { project_id: string; title: string }; Update: Partial<ProjectTask>; Relationships: Rels };
      project_milestones: { Row: ProjectMilestone; Insert: Partial<ProjectMilestone> & { project_id: string; title: string }; Update: Partial<ProjectMilestone>; Relationships: Rels };
      project_notes: { Row: ProjectNote; Insert: Partial<ProjectNote> & { project_id: string }; Update: Partial<ProjectNote>; Relationships: Rels };
      project_resources: { Row: ProjectResource; Insert: Partial<ProjectResource> & { project_id: string; type: ProjectResource["type"]; url: string }; Update: Partial<ProjectResource>; Relationships: Rels };
      project_time_logs: { Row: ProjectTimeLog; Insert: Partial<ProjectTimeLog> & { project_id: string; user_id: string; started_at: string }; Update: Partial<ProjectTimeLog>; Relationships: Rels };
      project_updates: { Row: ProjectUpdate; Insert: Partial<ProjectUpdate> & { project_id: string; user_id: string; content: string }; Update: Partial<ProjectUpdate>; Relationships: Rels };
      project_activity: { Row: ProjectActivity; Insert: Partial<ProjectActivity> & { project_id: string; action: ProjectActivityAction }; Update: Partial<ProjectActivity>; Relationships: Rels };
      save_later: { Row: SaveLater; Insert: Partial<SaveLater> & { user_id: string; url: string }; Update: Partial<SaveLater>; Relationships: Rels };
      documents: { Row: DocumentRow; Insert: Partial<DocumentRow> & { user_id: string; name: string; storage_path: string }; Update: Partial<DocumentRow>; Relationships: Rels };
      leetcode_profiles: { Row: LeetcodeProfile; Insert: Partial<LeetcodeProfile> & { user_id: string; username: string }; Update: Partial<LeetcodeProfile>; Relationships: Rels };
      github_profiles: { Row: GithubProfile; Insert: Partial<GithubProfile> & { user_id: string; username: string }; Update: Partial<GithubProfile>; Relationships: Rels };
      steps_entries: { Row: StepsEntry; Insert: Partial<StepsEntry> & { user_id: string; date: string; count: number; source: StepsEntry["source"] }; Update: Partial<StepsEntry>; Relationships: Rels };
    };
  };
};
