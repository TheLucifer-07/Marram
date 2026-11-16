package com.marram.service;

import com.marram.dto.Dto.*;
import com.marram.entity.*;
import com.marram.enums.Role;
import com.marram.exception.*;
import com.marram.mapper.Mapper;
import com.marram.repository.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {
    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository members;
    private final UserRepository users;
    private final TaskRepository tasks;
    private final AccessService access;
    private final TaskHistoryService history;
    private final Mapper mapper;

    public WorkspaceService(WorkspaceRepository workspaces, WorkspaceMemberRepository members, UserRepository users, TaskRepository tasks,
                            AccessService access, TaskHistoryService history, Mapper mapper) {
        this.workspaces = workspaces;
        this.members = members;
        this.users = users;
        this.tasks = tasks;
        this.access = access;
        this.history = history;
        this.mapper = mapper;
    }

    /** Workspace and its OWNER membership are created together or not at all. */
    @Transactional
    public WorkspaceResponse create(AppUser user, WorkspaceRequest req) {
        Workspace ws = workspaces.save(new Workspace(req.name().trim(), blankToNull(req.description())));
        WorkspaceMember owner = members.save(new WorkspaceMember(ws, user, Role.OWNER));
        return mapper.workspace(owner, 1);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponse> list(AppUser user) {
        List<WorkspaceMember> mine = members.findByUserIdOrderByWorkspaceNameAsc(user.getId());
        if (mine.isEmpty()) return List.of();
        Map<Long, Long> counts = members.countByWorkspaceIds(mine.stream().map(m -> m.getWorkspace().getId()).toList()).stream()
                .collect(Collectors.toMap(WorkspaceMemberRepository.WorkspaceCount::getWorkspaceId, WorkspaceMemberRepository.WorkspaceCount::getTotal));
        return mine.stream().map(m -> mapper.workspace(m, counts.getOrDefault(m.getWorkspace().getId(), 1L))).toList();
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse get(AppUser user, Long id) {
        WorkspaceMember m = access.membership(id, user);
        return mapper.workspace(m, members.countByWorkspaceId(id));
    }

    @Transactional
    public WorkspaceResponse update(AppUser user, Long id, WorkspaceRequest req) {
        WorkspaceMember m = access.requireRole(id, user, Role.OWNER);
        Workspace ws = workspaces.findById(id).orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        ws.setName(req.name().trim());
        ws.setDescription(blankToNull(req.description()));
        return mapper.workspace(m, members.countByWorkspaceId(id));
    }

    // ---------- membership ----------

    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(AppUser user, Long workspaceId) {
        access.membership(workspaceId, user);
        Map<Long, Long> open = openCounts(workspaceId);
        return members.findByWorkspaceIdOrderByJoinedAtAsc(workspaceId).stream()
                .map(m -> mapper.member(m, open.getOrDefault(m.getUser().getId(), 0L))).toList();
    }

    @Transactional
    public MemberResponse addMember(AppUser actor, Long workspaceId, AddMemberRequest req) {
        WorkspaceMember owner = access.requireRole(workspaceId, actor, Role.OWNER);
        if (req.role() == Role.OWNER) {
            throw new InvalidWorkspaceMembershipException("A workspace has exactly one owner. Add people as lead or member");
        }
        AppUser target = users.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> new ResourceNotFoundException("No Marram account uses that email yet. Ask them to sign up first"));
        if (members.existsByWorkspaceIdAndUserId(workspaceId, target.getId())) {
            throw new DuplicateResourceException(target.getFullName() + " is already in this workspace");
        }
        WorkspaceMember saved = members.save(new WorkspaceMember(owner.getWorkspace(), target, req.role()));
        return mapper.member(saved, 0);
    }

    @Transactional
    public MemberResponse updateRole(AppUser actor, Long workspaceId, Long userId, Role role) {
        access.requireRole(workspaceId, actor, Role.OWNER);
        if (role == Role.OWNER) {
            throw new InvalidWorkspaceMembershipException("A workspace has exactly one owner. Ownership transfer is not part of this version");
        }
        WorkspaceMember target = members.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("That person is not in this workspace"));
        if (target.getRole() == Role.OWNER) {
            throw new InvalidWorkspaceMembershipException("The owner's role cannot be changed");
        }
        target.setRole(role);
        return mapper.member(target, openCounts(workspaceId).getOrDefault(userId, 0L));
    }

    /**
     * Removing a member revokes access immediately and clears their task assignments in the same transaction,
     * recording each change in the task history, so no task is left assigned to someone who cannot see it.
     */
    @Transactional
    public void removeMember(AppUser actor, Long workspaceId, Long userId) {
        access.requireRole(workspaceId, actor, Role.OWNER);
        WorkspaceMember target = members.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("That person is not in this workspace"));
        if (target.getRole() == Role.OWNER) {
            throw new InvalidWorkspaceMembershipException("The owner cannot be removed from their own workspace");
        }
        for (Task t : tasks.findAssignedTo(workspaceId, userId)) {
            history.record(t, actor, "assignee", target.getUser().getFullName(), null);
            t.setAssignee(null);
        }
        members.delete(target);
    }

    private Map<Long, Long> openCounts(Long workspaceId) {
        return tasks.workload(workspaceId, java.time.LocalDate.now(), com.marram.enums.TaskStatus.DONE, com.marram.enums.ProjectStatus.ARCHIVED).stream()
                .collect(Collectors.toMap(TaskRepository.Workload::getUserId, w -> w.getOpenCount() == null ? 0L : w.getOpenCount()));
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
