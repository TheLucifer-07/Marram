package com.marram.mapper;

import com.marram.dto.Dto.*;
import com.marram.entity.*;
import com.marram.enums.ProjectStatus;
import com.marram.enums.TaskStatus;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class Mapper {

    public UserSummary summary(AppUser u) {
        return u == null ? null : new UserSummary(u.getId(), u.getFullName(), u.getEmail(), u.getAvatarUrl());
    }

    public UserResponse user(AppUser u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getEmail(), u.getAvatarUrl(), u.getCreatedAt());
    }

    public WorkspaceResponse workspace(WorkspaceMember m, long memberCount) {
        Workspace w = m.getWorkspace();
        return new WorkspaceResponse(w.getId(), w.getName(), w.getDescription(), m.getRole(), memberCount, w.getCreatedAt());
    }

    public MemberResponse member(WorkspaceMember m, long openTasks) {
        AppUser u = m.getUser();
        return new MemberResponse(u.getId(), u.getFullName(), u.getEmail(), u.getAvatarUrl(), m.getRole(), m.getJoinedAt(), openTasks);
    }

    public static int progress(long total, long done) {
        return total == 0 ? 0 : (int) Math.round(done * 100.0 / total);
    }

    public ProjectResponse project(Project p, long total, long done) {
        return new ProjectResponse(p.getId(), p.getWorkspace().getId(), p.getName(), p.getDescription(), p.getStartDate(), p.getDueDate(),
                p.getStatus(), total, done, progress(total, done), summary(p.getCreatedBy()), p.getCreatedAt(), p.getUpdatedAt());
    }

    /** Builds the task view for one viewer. The flags tell the UI what the server will allow; the server still re-checks. */
    public TaskResponse task(Task t, WorkspaceMember viewer, LocalDate today) {
        boolean archived = t.getProject().getStatus() == ProjectStatus.ARCHIVED;
        boolean manager = viewer.getRole().managesWork();
        boolean assignee = t.getAssignee() != null && t.getAssignee().getId().equals(viewer.getUser().getId());
        boolean mayChange = !archived && (manager || assignee);
        List<TaskStatus> next = mayChange ? new ArrayList<>(t.getStatus().allowedNext(manager)) : List.of();
        boolean overdue = t.getDueDate() != null && t.getDueDate().isBefore(today) && t.getStatus() != TaskStatus.DONE;
        return new TaskResponse(t.getId(), t.getProject().getId(), t.getProject().getName(), t.getProject().getWorkspace().getId(),
                t.getTitle(), t.getDescription(), t.getStatus(), t.getPriority(), summary(t.getAssignee()), summary(t.getCreatedBy()),
                t.getDueDate(), overdue, next, manager && !archived, mayChange, t.getCreatedAt(), t.getUpdatedAt());
    }

    public CommentResponse comment(Comment c) {
        return new CommentResponse(c.getId(), c.getTask().getId(), summary(c.getAuthor()), c.getContent(), c.getCreatedAt());
    }

    public ActivityResponse commentActivity(Comment c) {
        Task t = c.getTask();
        String text = c.getContent().length() > 90 ? c.getContent().substring(0, 90) + "…" : c.getContent();
        return new ActivityResponse("comment", c.getId(), t.getId(), t.getTitle(), t.getProject().getName(), summary(c.getAuthor()),
                "comment", null, text, c.getCreatedAt());
    }

    public ActivityResponse activity(TaskHistory h) {
        Task t = h.getTask();
        return new ActivityResponse("change", h.getId(), t.getId(), t.getTitle(), t.getProject().getName(), summary(h.getChangedBy()),
                h.getFieldName(), h.getOldValue(), h.getNewValue(), h.getCreatedAt());
    }
}
