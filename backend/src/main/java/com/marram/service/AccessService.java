package com.marram.service;

import com.marram.entity.*;
import com.marram.enums.Role;
import com.marram.exception.ResourceNotFoundException;
import com.marram.exception.UnauthorizedOperationException;
import com.marram.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The single gate for workspace authorization. Every service resolves a resource through here, so a user
 * outside the workspace gets 404 (the resource's existence is not revealed) and a user with too little
 * privilege gets 403.
 */
@Service
public class AccessService {
    public record Access<T>(T entity, WorkspaceMember member) {}

    private final WorkspaceMemberRepository members;
    private final ProjectRepository projects;
    private final TaskRepository tasks;

    public AccessService(WorkspaceMemberRepository members, ProjectRepository projects, TaskRepository tasks) {
        this.members = members;
        this.projects = projects;
        this.tasks = tasks;
    }

    @Transactional(readOnly = true)
    public WorkspaceMember membership(Long workspaceId, AppUser user) {
        return members.findByWorkspaceIdAndUserId(workspaceId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
    }

    @Transactional(readOnly = true)
    public WorkspaceMember requireRole(Long workspaceId, AppUser user, Role... allowed) {
        WorkspaceMember m = membership(workspaceId, user);
        for (Role r : allowed) {
            if (m.getRole() == r) return m;
        }
        throw new UnauthorizedOperationException("Your role in this workspace does not allow that");
    }

    public WorkspaceMember requireManager(Long workspaceId, AppUser user) {
        return requireRole(workspaceId, user, Role.OWNER, Role.LEAD);
    }

    @Transactional(readOnly = true)
    public Access<Project> project(Long projectId, AppUser user) {
        Project p = projects.findWithWorkspaceById(projectId).orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        return new Access<>(p, members.findByWorkspaceIdAndUserId(p.getWorkspace().getId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found")));
    }

    @Transactional(readOnly = true)
    public Access<Task> task(Long taskId, AppUser user) {
        Task t = tasks.findWithDetailsById(taskId).orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        return new Access<>(t, members.findByWorkspaceIdAndUserId(t.getProject().getWorkspace().getId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found")));
    }
}
