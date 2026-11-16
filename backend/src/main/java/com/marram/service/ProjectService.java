package com.marram.service;

import com.marram.dto.Dto.*;
import com.marram.entity.*;
import com.marram.enums.ProjectStatus;
import com.marram.enums.TaskStatus;
import com.marram.exception.*;
import com.marram.mapper.Mapper;
import com.marram.repository.*;
import jakarta.persistence.criteria.Predicate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {
    private static final Map<String, String> SORTS = Map.of("createdAt", "createdAt", "name", "name", "dueDate", "dueDate",
            "startDate", "startDate", "status", "status");

    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final WorkspaceRepository workspaces;
    private final AccessService access;
    private final Mapper mapper;

    public ProjectService(ProjectRepository projects, TaskRepository tasks, WorkspaceRepository workspaces, AccessService access, Mapper mapper) {
        this.projects = projects;
        this.tasks = tasks;
        this.workspaces = workspaces;
        this.access = access;
        this.mapper = mapper;
    }

    @Transactional
    public ProjectResponse create(AppUser user, Long workspaceId, ProjectRequest req) {
        access.requireManager(workspaceId, user);
        validateDates(req);
        String name = req.name().trim();
        if (projects.existsByWorkspaceIdAndNameIgnoreCase(workspaceId, name)) {
            throw new DuplicateResourceException("A project named '" + name + "' already exists in this workspace");
        }
        Workspace ws = workspaces.getReferenceById(workspaceId);
        Project p = projects.save(new Project(ws, name, blankToNull(req.description()), req.startDate(), req.dueDate(), user));
        return mapper.project(p, 0, 0);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProjectResponse> list(AppUser user, Long workspaceId, ProjectStatus status, String q, int page, int size, String sort) {
        access.membership(workspaceId, user);
        Specification<Project> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            ps.add(cb.equal(root.get("workspace").get("id"), workspaceId));
            if (status != null) ps.add(cb.equal(root.get("status"), status));
            if (q != null && !q.isBlank()) ps.add(cb.like(cb.lower(root.get("name")), Pages.like(q), '\\'));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        Page<Project> result = projects.findAll(spec, Pages.of(page, size, sort, SORTS, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        Map<Long, TaskRepository.ProjectCount> counts = counts(result.getContent());
        return PageResponse.of(result.map(p -> withCounts(p, counts)));
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(AppUser user, Long projectId) {
        Project p = access.project(projectId, user).entity();
        return withCounts(p, counts(List.of(p)));
    }

    @Transactional
    public ProjectResponse update(AppUser user, Long projectId, ProjectRequest req) {
        var acc = access.project(projectId, user);
        if (!acc.member().getRole().managesWork()) throw new UnauthorizedOperationException("Only the owner or a lead can edit projects");
        Project p = acc.entity();
        if (p.getStatus() == ProjectStatus.ARCHIVED) throw new BusinessRuleException("Archived projects cannot be edited");
        if (req.status() == ProjectStatus.ARCHIVED) throw new BadRequestException("Use the archive action to archive a project");
        validateDates(req);
        String name = req.name().trim();
        if (projects.existsByWorkspaceIdAndNameIgnoreCaseAndIdNot(p.getWorkspace().getId(), name, p.getId())) {
            throw new DuplicateResourceException("A project named '" + name + "' already exists in this workspace");
        }
        p.setName(name);
        p.setDescription(blankToNull(req.description()));
        p.setStartDate(req.startDate());
        p.setDueDate(req.dueDate());
        if (req.status() != null) p.setStatus(req.status());
        return withCounts(p, counts(List.of(p)));
    }

    @Transactional
    public ProjectResponse archive(AppUser user, Long projectId) {
        var acc = access.project(projectId, user);
        if (!acc.member().getRole().managesWork()) throw new UnauthorizedOperationException("Only the owner or a lead can archive projects");
        Project p = acc.entity();
        p.setStatus(ProjectStatus.ARCHIVED);
        return withCounts(p, counts(List.of(p)));
    }

    private Map<Long, TaskRepository.ProjectCount> counts(Collection<Project> ps) {
        if (ps.isEmpty()) return Map.of();
        return tasks.countByProjects(ps.stream().map(Project::getId).toList(), TaskStatus.DONE).stream()
                .collect(Collectors.toMap(TaskRepository.ProjectCount::getProjectId, c -> c));
    }

    private ProjectResponse withCounts(Project p, Map<Long, TaskRepository.ProjectCount> counts) {
        TaskRepository.ProjectCount c = counts.get(p.getId());
        return mapper.project(p, c == null ? 0 : c.getTotal(), c == null || c.getDone() == null ? 0 : c.getDone());
    }

    private static void validateDates(ProjectRequest req) {
        if (req.dueDate() != null && req.dueDate().isBefore(req.startDate())) {
            throw new BadRequestException("The due date cannot be before the start date");
        }
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
