-- Unique keys already index users(email), users(supabase_user_id), workspace_members(workspace_id, user_id)
-- and projects(workspace_id, name). These cover the remaining query patterns.
CREATE INDEX idx_wm_user ON workspace_members (user_id);
CREATE INDEX idx_projects_workspace_status ON projects (workspace_id, status);
CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);
CREATE INDEX idx_tasks_assignee_status ON tasks (assignee_id, status);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);
CREATE INDEX idx_tasks_deleted_at ON tasks (deleted_at);
CREATE INDEX idx_history_task_created ON task_history (task_id, created_at);
CREATE INDEX idx_history_created ON task_history (created_at);
CREATE INDEX idx_comments_task_created ON comments (task_id, created_at);
