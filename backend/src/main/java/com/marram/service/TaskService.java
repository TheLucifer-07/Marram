package com.marram.service;

import com.marram.dto.Dto.*;
import com.marram.entity.*;
import com.marram.enums.*;
import com.marram.exception.*;
import com.marram.mapper.Mapper;
import com.marram.repository.*;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {
    private static final Map<String, String> SORTS = Map.of("createdAt", "createdAt", "updatedAt", "updatedAt", "dueDate", "dueDate",
            "title", "title", "priority", "priorityRank", "status", "statusRank");
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final TaskRepository tasks;
    private final WorkspaceMemberRepository members;
    private final AccessService access;
    private final TaskHistoryService history;
    private final Mapper mapper;
    private final Clock clock;

    public TaskService(TaskRepository tasks, WorkspaceMemberRepository members, AccessService access, TaskHistoryService history, Mapper mapper, Clock clock) {
        this.tasks = tasks;
        this.members = members;
        this.access = access;
        this.history = history;
        this.mapper = mapper;
        this.clock = clock;
    }

    /** Task and its "created" history entry commit together. */
    @Transactional
    public TaskResponse create(AppUser user, Long projectId, CreateTaskRequest req) {
        var acc = access.project(projectId, user);
        if (!acc.member().getRole().managesWork()) throw new UnauthorizedOperationException("Only the owner or a lead can create tasks");
        Project project = acc.entity();
        if (project.getStatus() == ProjectStatus.ARCHIVED) throw new BusinessRuleException("Tasks cannot be created in an archived project");
        AppUser assignee = resolveAssignee(project.getWorkspace().getId(), req.assigneeId());
        Task task = tasks.save(new Task(project, req.title().trim(), blankToNull(req.description()), req.priority(), assignee, user, req.dueDate()));
        history.record(task, user, "created", null, task.getTitle());
        return mapper.task(task, acc.member(), today());
    }

    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> listForProject(AppUser user, Long projectId, TaskStatus status, TaskPriority priority, Long assigneeId, String q, int page, int size, String sort) {
        var acc = access.project(projectId, user);
        return list(acc.member(), TaskSpecs.filter(projectId, null, status, priority, assigneeId, q, null, null), page, size, sort);
    }

    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> listForWorkspace(AppUser user, Long workspaceId, Long projectId, TaskStatus status, TaskPriority priority, Long assigneeId, String q, Boolean open, Boolean overdue, int page, int size, String sort) {
        WorkspaceMember viewer = access.membership(workspaceId, user);
        return list(viewer, TaskSpecs.filter(projectId, workspaceId, status, priority, assigneeId, q, open, Boolean.TRUE.equals(overdue) ? today() : null), page, size, sort);
    }

    private PageResponse<TaskResponse> list(WorkspaceMember viewer, org.springframework.data.jpa.domain.Specification<Task> spec, int page, int size, String sort) {
        Page<Task> result = tasks.findAll(spec, Pages.of(page, size, sort, SORTS, DEFAULT_SORT));
        LocalDate today = today();
        return PageResponse.of(result.map(t -> mapper.task(t, viewer, today)));
    }

    @Transactional(readOnly = true)
    public TaskResponse get(AppUser user, Long taskId) {
        var acc = access.task(taskId, user);
        return mapper.task(acc.entity(), acc.member(), today());
    }

    @Transactional
    public TaskResponse update(AppUser user, Long taskId, UpdateTaskRequest req) {
        var acc = access.task(taskId, user);
        requireManager(acc, "edit tasks");
        Task t = acc.entity();
        requireOpenProject(t);
        if (t.getPriority() != req.priority()) {
            history.record(t, user, "priority", t.getPriority().name(), req.priority().name());
            t.setPriority(req.priority());
        }
        if (!Objects.equals(t.getDueDate(), req.dueDate())) {
            history.record(t, user, "dueDate", str(t.getDueDate()), str(req.dueDate()));
            t.setDueDate(req.dueDate());
        }
        t.setTitle(req.title().trim());
        t.setDescription(blankToNull(req.description()));
        return mapper.task(t, acc.member(), today());
    }

    /**
     * The status change and its history entry are one transaction. Members may move only their own tasks;
     * reopening a finished task is reserved for the owner and leads.
     */
    @Transactional
    public TaskResponse changeStatus(AppUser user, Long taskId, TaskStatus target) {
        var acc = access.task(taskId, user);
        Task t = acc.entity();
        boolean manager = acc.member().getRole().managesWork();
        boolean assignee = t.getAssignee() != null && t.getAssignee().getId().equals(user.getId());
        if (!manager && !assignee) {
            throw new UnauthorizedOperationException("Only the assignee, a lead or the owner can change this task's status");
        }
        requireOpenProject(t);
        TaskStatus from = t.getStatus();
        if (from == target) throw new InvalidTaskTransitionException("The task is already " + from);
        if (!from.canMoveTo(target, manager)) {
            String why = from == TaskStatus.DONE && !manager ? "Only the owner or a lead can reopen a finished task"
                    : "A task cannot move from " + from + " to " + target;
            throw new InvalidTaskTransitionException(why);
        }
        t.setStatus(target);
        history.record(t, user, "status", from.name(), target.name());
        return mapper.task(t, acc.member(), today());
    }

    @Transactional
    public TaskResponse changeAssignee(AppUser user, Long taskId, Long assigneeId) {
        var acc = access.task(taskId, user);
        requireManager(acc, "assign tasks");
        Task t = acc.entity();
        requireOpenProject(t);
        AppUser next = resolveAssignee(t.getProject().getWorkspace().getId(), assigneeId);
        Long currentId = t.getAssignee() == null ? null : t.getAssignee().getId();
        if (!Objects.equals(currentId, assigneeId)) {
            history.record(t, user, "assignee", t.getAssignee() == null ? null : t.getAssignee().getFullName(), next == null ? null : next.getFullName());
            t.setAssignee(next);
        }
        return mapper.task(t, acc.member(), today());
    }

    @Transactional
    public void delete(AppUser user, Long taskId) {
        var acc = access.task(taskId, user);
        requireManager(acc, "delete tasks");
        Task t = acc.entity();
        requireOpenProject(t);
        history.record(t, user, "deleted", t.getTitle(), null);
        t.markDeleted();
    }

    private AppUser resolveAssignee(Long workspaceId, Long assigneeId) {
        if (assigneeId == null) return null;
        return members.findByWorkspaceIdAndUserId(workspaceId, assigneeId).map(WorkspaceMember::getUser)
                .orElseThrow(() -> new InvalidWorkspaceMembershipException("The assignee must be a member of this workspace"));
    }

    private static void requireManager(AccessService.Access<Task> acc, String action) {
        if (!acc.member().getRole().managesWork()) throw new UnauthorizedOperationException("Only the owner or a lead can " + action);
    }

    private static void requireOpenProject(Task t) {
        if (t.getProject().getStatus() == ProjectStatus.ARCHIVED) throw new BusinessRuleException("This task's project is archived and can no longer be changed");
    }

    private LocalDate today() { return LocalDate.now(clock); }

    private static String str(LocalDate d) { return d == null ? null : d.toString(); }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
