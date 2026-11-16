-- Concatenated export of backend/src/main/resources/db/migration. Flyway is the source of truth.

-- ===== V1__create_users_and_workspaces.sql =====
-- Application users, mapped one-to-one to a Supabase Auth identity.
CREATE TABLE users (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    supabase_user_id VARCHAR(36)  NOT NULL,
    full_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(150) NOT NULL,
    avatar_url       VARCHAR(500) NULL,
    created_at       DATETIME(6)  NOT NULL,
    updated_at       DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_supabase_user_id UNIQUE (supabase_user_id),
    CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE workspaces (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(120) NOT NULL,
    description TEXT         NULL,
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== V2__create_workspace_members.sql =====
CREATE TABLE workspace_members (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    workspace_id BIGINT      NOT NULL,
    user_id      BIGINT      NOT NULL,
    role         VARCHAR(20) NOT NULL,
    joined_at    DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_workspace_members UNIQUE (workspace_id, user_id),
    CONSTRAINT fk_wm_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    CONSTRAINT fk_wm_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT ck_wm_role CHECK (role IN ('OWNER', 'LEAD', 'MEMBER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== V3__create_projects_and_tasks.sql =====
CREATE TABLE projects (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    workspace_id BIGINT       NOT NULL,
    name         VARCHAR(150) NOT NULL,
    description  TEXT         NULL,
    start_date   DATE         NOT NULL,
    due_date     DATE         NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_by   BIGINT       NOT NULL,
    created_at   DATETIME(6)  NOT NULL,
    updated_at   DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_projects_workspace_name UNIQUE (workspace_id, name),
    CONSTRAINT fk_projects_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT ck_projects_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
    CONSTRAINT ck_projects_dates CHECK (due_date IS NULL OR due_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tasks (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    project_id    BIGINT       NOT NULL,
    title         VARCHAR(180) NOT NULL,
    description   TEXT         NULL,
    status        VARCHAR(30)  NOT NULL DEFAULT 'TODO',
    priority      VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    -- Generated sort keys: "highest priority" and "workflow order" sort by meaning, not alphabetically.
    priority_rank INT GENERATED ALWAYS AS (CASE priority WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 WHEN 'URGENT' THEN 4 ELSE 0 END) STORED,
    status_rank   INT GENERATED ALWAYS AS (CASE status WHEN 'TODO' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'IN_REVIEW' THEN 3 WHEN 'BLOCKED' THEN 4 WHEN 'DONE' THEN 5 ELSE 0 END) STORED,
    assignee_id   BIGINT       NULL,
    created_by    BIGINT       NOT NULL,
    due_date      DATE         NULL,
    deleted_at    DATETIME(6)  NULL,
    version       BIGINT       NOT NULL DEFAULT 0,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users (id),
    CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT ck_tasks_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE')),
    CONSTRAINT ck_tasks_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== V4__create_comments_and_task_history.sql =====
CREATE TABLE comments (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    task_id    BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    content    TEXT        NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_comments_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Append-only audit trail. Tasks are soft-deleted, so these rows are never orphaned.
CREATE TABLE task_history (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    task_id    BIGINT      NOT NULL,
    changed_by BIGINT      NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    old_value  TEXT        NULL,
    new_value  TEXT        NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_history_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== V5__add_indexes.sql =====
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

-- ===== V6__add_due_date_null_sort_rank.sql =====
ALTER TABLE tasks
    ADD COLUMN due_date_null_rank INT
        GENERATED ALWAYS AS (CASE WHEN due_date IS NULL THEN 1 ELSE 0 END) STORED;
