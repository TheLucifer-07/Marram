package com.marram.controller;

import com.marram.dto.Dto.*;
import com.marram.entity.AppUser;
import com.marram.enums.ProjectStatus;
import com.marram.security.CurrentUser;
import com.marram.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ProjectController {
    private final ProjectService projects;

    public ProjectController(ProjectService projects) { this.projects = projects; }

    @PostMapping("/workspaces/{workspaceId}/projects")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@CurrentUser AppUser user, @PathVariable Long workspaceId, @Valid @RequestBody ProjectRequest req) {
        return projects.create(user, workspaceId, req);
    }

    @GetMapping("/workspaces/{workspaceId}/projects")
    public PageResponse<ProjectResponse> list(@CurrentUser AppUser user, @PathVariable Long workspaceId,
                                              @RequestParam(required = false) ProjectStatus status, @RequestParam(required = false) String q,
                                              @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
                                              @RequestParam(required = false) String sort) {
        return projects.list(user, workspaceId, status, q, page, size, sort);
    }

    @GetMapping("/projects/{id}")
    public ProjectResponse get(@CurrentUser AppUser user, @PathVariable Long id) { return projects.get(user, id); }

    @PutMapping("/projects/{id}")
    public ProjectResponse update(@CurrentUser AppUser user, @PathVariable Long id, @Valid @RequestBody ProjectRequest req) { return projects.update(user, id, req); }

    @PatchMapping("/projects/{id}/archive")
    public ProjectResponse archive(@CurrentUser AppUser user, @PathVariable Long id) { return projects.archive(user, id); }
}
