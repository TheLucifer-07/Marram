package com.marram.controller;

import com.marram.dto.Dto.*;
import com.marram.entity.AppUser;
import com.marram.enums.TaskPriority;
import com.marram.enums.TaskStatus;
import com.marram.security.CurrentUser;
import com.marram.service.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {
    private final WorkspaceService workspaces;
    private final TaskService tasks;
    private final TaskHistoryService history;

    public WorkspaceController(WorkspaceService workspaces, TaskService tasks, TaskHistoryService history) {
        this.workspaces = workspaces;
        this.tasks = tasks;
        this.history = history;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceResponse create(@CurrentUser AppUser user, @Valid @RequestBody WorkspaceRequest req) { return workspaces.create(user, req); }

    @GetMapping
    public List<WorkspaceResponse> list(@CurrentUser AppUser user) { return workspaces.list(user); }

    @GetMapping("/{id}")
    public WorkspaceResponse get(@CurrentUser AppUser user, @PathVariable Long id) { return workspaces.get(user, id); }

    @PutMapping("/{id}")
    public WorkspaceResponse update(@CurrentUser AppUser user, @PathVariable Long id, @Valid @RequestBody WorkspaceRequest req) {
        return workspaces.update(user, id, req);
    }

    /** All tasks in the workspace, with the same filters as a project's task list. */
    @GetMapping("/{id}/tasks")
    public PageResponse<TaskResponse> tasks(@CurrentUser AppUser user, @PathVariable Long id,
                                            @RequestParam(required = false) Long projectId, @RequestParam(required = false) TaskStatus status,
                                            @RequestParam(required = false) TaskPriority priority, @RequestParam(required = false) Long assigneeId,
                                            @RequestParam(required = false) String q, @RequestParam(required = false) Boolean open,
                                            @RequestParam(required = false) Boolean overdue, @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "10") int size, @RequestParam(required = false) String sort) {
        return tasks.listForWorkspace(user, id, projectId, status, priority, assigneeId, q, open, overdue, page, size, sort);
    }

    @GetMapping("/{id}/activity")
    public PageResponse<ActivityResponse> activity(@CurrentUser AppUser user, @PathVariable Long id,
                                                   @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return history.forWorkspace(user, id, page, size);
    }
}
