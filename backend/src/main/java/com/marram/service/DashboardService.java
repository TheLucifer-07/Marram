package com.marram.service;

import com.marram.dto.Dto.*;
import com.marram.entity.AppUser;
import com.marram.entity.Project;
import com.marram.entity.WorkspaceMember;
import com.marram.enums.*;
import com.marram.mapper.Mapper;
import com.marram.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Every figure is an aggregate query over persisted rows. Nothing is cached or computed in the browser. */
@Service
public class DashboardService {
    private static final int LIST_SIZE = 5;

    private final TaskRepository tasks;
    private final ProjectRepository projects;
    private final AccessService access;
    private final TaskHistoryService history;
    private final TaskHistoryRepository historyRepo;
    private final CommentRepository comments;
    private final WorkspaceMemberRepository members;
    private final Mapper mapper;
    private final Clock clock;

    public DashboardService(TaskRepository tasks, ProjectRepository projects, AccessService access, TaskHistoryService history,
                            TaskHistoryRepository historyRepo, CommentRepository comments, WorkspaceMemberRepository members, Mapper mapper, Clock clock) {
        this.historyRepo = historyRepo;
        this.comments = comments;
        this.members = members;
        this.tasks = tasks;
        this.projects = projects;
        this.access = access;
        this.history = history;
        this.mapper = mapper;
        this.clock = clock;
    }

    /** Completed / total x 100, rounded to two places; zero when there are no tasks. */
    public static double completionPercentage(long completed, long total) {
        if (total == 0) return 0;
        return BigDecimal.valueOf(completed * 100.0 / total).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(AppUser user, Long workspaceId) {
        WorkspaceMember viewer = access.membership(workspaceId, user);
        LocalDate today = LocalDate.now(clock);

        Map<TaskStatus, Long> byStatus = new EnumMap<>(TaskStatus.class);
        for (TaskStatus s : TaskStatus.values()) byStatus.put(s, 0L);
        tasks.countByStatus(workspaceId).forEach(c -> byStatus.put(c.getStatus(), c.getTotal()));
        Map<TaskPriority, Long> byPriority = new EnumMap<>(TaskPriority.class);
        for (TaskPriority p : TaskPriority.values()) byPriority.put(p, 0L);
        tasks.countByPriority(workspaceId).forEach(c -> byPriority.put(c.getPriority(), c.getTotal()));

        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        long done = byStatus.get(TaskStatus.DONE);

        List<Project> active = projects.findByWorkspaceIdAndStatus(workspaceId, ProjectStatus.ACTIVE,
                PageRequest.of(0, 8, Sort.by(Sort.Order.asc("dueDate").nullsLast(), Sort.Order.desc("id"))));
        Map<Long, TaskRepository.ProjectCount> counts = new java.util.HashMap<>();
        if (!active.isEmpty()) {
            tasks.countByProjects(active.stream().map(Project::getId).toList(), TaskStatus.DONE).forEach(c -> counts.put(c.getProjectId(), c));
        }
        Map<Long, TaskRepository.ProjectRisk> risks = new HashMap<>();
        if (!active.isEmpty()) {
            tasks.projectRisk(active.stream().map(Project::getId).toList(), today, TaskStatus.DONE, TaskStatus.BLOCKED).forEach(r -> risks.put(r.getProjectId(), r));
        }
        List<ProjectProgress> progress = active.stream().map(p -> {
            var c = counts.get(p.getId());
            var r = risks.get(p.getId());
            long t = c == null ? 0 : c.getTotal();
            long d = c == null || c.getDone() == null ? 0 : c.getDone();
            long overdue = r == null || r.getOverdueCount() == null ? 0 : r.getOverdueCount();
            long blocked = r == null || r.getBlockedCount() == null ? 0 : r.getBlockedCount();
            return new ProjectProgress(p.getId(), p.getName(), p.getStatus(), t, d, Mapper.progress(t, d), overdue, blocked, p.getDueDate(), mapper.summary(p.getCreatedBy()));
        }).toList();

        var page = PageRequest.of(0, LIST_SIZE);
        List<TaskResponse> overdue = tasks.findOverdue(workspaceId, today, TaskStatus.DONE, ProjectStatus.ARCHIVED, page)
                .stream().map(t -> mapper.task(t, viewer, today)).toList();
        List<TaskResponse> upcoming = tasks.findDueBetween(workspaceId, today, today.plusDays(7), TaskStatus.DONE, ProjectStatus.ARCHIVED, page)
                .stream().map(t -> mapper.task(t, viewer, today)).toList();
        List<ActivityResponse> activity = recentActivity(user, workspaceId);

        // Team workload: every member appears, even with no tasks. Counts come from one grouped query.
        Map<Long, TaskRepository.Workload> load = new HashMap<>();
        tasks.workload(workspaceId, today, TaskStatus.DONE, ProjectStatus.ARCHIVED).forEach(w -> load.put(w.getUserId(), w));
        List<WorkloadEntry> workload = members.findByWorkspaceIdOrderByJoinedAtAsc(workspaceId).stream().map(m -> {
            var w = load.get(m.getUser().getId());
            return new WorkloadEntry(m.getUser().getId(), m.getUser().getFullName(), m.getUser().getAvatarUrl(), m.getRole(),
                    w == null ? 0 : nz(w.getOpenCount()), w == null ? 0 : nz(w.getOverdueCount()), w == null ? 0 : nz(w.getDoneCount()));
        }).sorted(Comparator.comparingLong(WorkloadEntry::openTasks).reversed().thenComparing(WorkloadEntry::fullName)).toList();

        // Completion trend from the audit trail: tasks moved to DONE per day, last 14 days.
        ZoneId zone = clock.getZone();
        LocalDate first = today.minusDays(13);
        long[] perDay = new long[14];
        for (Instant at : historyRepo.findCompletionTimes(workspaceId, first.atStartOfDay(zone).toInstant())) {
            int idx = (int) java.time.temporal.ChronoUnit.DAYS.between(first, at.atZone(zone).toLocalDate());
            if (idx >= 0 && idx < 14) perDay[idx]++;
        }
        List<TrendPoint> trend = new ArrayList<>();
        long last7 = 0, prev7 = 0;
        for (int i = 0; i < 14; i++) {
            trend.add(new TrendPoint(first.plusDays(i), perDay[i]));
            if (i >= 7) last7 += perDay[i]; else prev7 += perDay[i];
        }

        return new DashboardResponse(
                projects.countByWorkspaceIdAndStatus(workspaceId, ProjectStatus.ACTIVE), total, done, total - done,
                byStatus.get(TaskStatus.IN_PROGRESS), byStatus.get(TaskStatus.BLOCKED),
                tasks.countOverdue(workspaceId, today, TaskStatus.DONE, ProjectStatus.ARCHIVED),
                completionPercentage(done, total), byStatus, byPriority, progress, overdue, upcoming, activity,
                tasks.countUnassignedOpen(workspaceId, TaskStatus.DONE), last7, prev7, trend, workload);
    }

    /** Task changes and comments, merged by time. Project creation and membership changes are not recorded anywhere, so they cannot appear. */
    private List<ActivityResponse> recentActivity(AppUser user, Long workspaceId) {
        List<ActivityResponse> merged = new ArrayList<>(history.forWorkspace(user, workspaceId, 0, 10).content());
        comments.findRecent(workspaceId, PageRequest.of(0, 10)).forEach(c -> merged.add(mapper.commentActivity(c)));
        merged.sort(Comparator.comparing(ActivityResponse::createdAt).reversed());
        return merged.size() > 10 ? List.copyOf(merged.subList(0, 10)) : merged;
    }

    private static long nz(Long v) { return v == null ? 0 : v; }
}
