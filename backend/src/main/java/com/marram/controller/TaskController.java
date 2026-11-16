package com.marram.controller;

import com.marram.dto.Dto.*;
import com.marram.entity.AppUser;
import com.marram.enums.TaskPriority;
import com.marram.enums.TaskStatus;
import com.marram.security.CurrentUser;
import com.marram.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class TaskController {
    private final TaskService tasks;

    public TaskController(TaskService tasks) { this.tasks = tasks; }

    @PostMapping("/projects/{projectId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@CurrentUser AppUser user, @PathVariable Long projectId, @Valid @RequestBody CreateTaskRequest req) {
        return tasks.create(user, projectId, req);
    }

    @GetMapping("/projects/{projectId}/tasks")
    public PageResponse<TaskResponse> list(@CurrentUser AppUser user, @PathVariable Long projectId,
                                           @RequestParam(required = false) TaskStatus status, @RequestParam(required = false) TaskPriority priority,
                                           @RequestParam(required = false) Long assigneeId, @RequestParam(required = false) String q,
                                           @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
                                           @RequestParam(required = false) String sort) {
        return tasks.listForProject(user, projectId, status, priority, assigneeId, q, page, size, sort);
    }

    @GetMapping("/tasks/{id}")
    public TaskResponse get(@CurrentUser AppUser user, @PathVariable Long id) { return tasks.get(user, id); }

    @PutMapping("/tasks/{id}")
    public TaskResponse update(@CurrentUser AppUser user, @PathVariable Long id, @Valid @RequestBody UpdateTaskRequest req) { return tasks.update(user, id, req); }

    @PatchMapping("/tasks/{id}/status")
    public TaskResponse status(@CurrentUser AppUser user, @PathVariable Long id, @Valid @RequestBody StatusRequest req) {
        return tasks.changeStatus(user, id, req.status());
    }

    @PatchMapping("/tasks/{id}/assignee")
    public TaskResponse assignee(@CurrentUser AppUser user, @PathVariable Long id, @RequestBody AssigneeRequest req) {
        return tasks.changeAssignee(user, id, req.assigneeId());
    }

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentUser AppUser user, @PathVariable Long id) { tasks.delete(user, id); }
}
