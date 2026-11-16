package com.marram.dto;

import com.marram.enums.ProjectStatus;
import com.marram.enums.Role;
import com.marram.enums.TaskPriority;
import com.marram.enums.TaskStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** API contracts. Persistence entities are never serialized directly. */
public final class Dto {
    private Dto() {}

    // ---------- requests ----------
    public record UpdateProfileRequest(@NotBlank @Size(min = 2, max = 100) String fullName) {}

    public record WorkspaceRequest(@NotBlank @Size(max = 120) String name, @Size(max = 5000) String description) {}

    public record AddMemberRequest(@NotBlank @Email @Size(max = 150) String email, @NotNull Role role) {}

    public record UpdateRoleRequest(@NotNull Role role) {}

    public record ProjectRequest(@NotBlank @Size(max = 150) String name, @Size(max = 5000) String description,
                                 @NotNull LocalDate startDate, LocalDate dueDate, ProjectStatus status) {}

    public record CreateTaskRequest(@NotBlank @Size(max = 180) String title, @Size(max = 10000) String description,
                                    @NotNull TaskPriority priority, Long assigneeId, LocalDate dueDate) {}

    public record UpdateTaskRequest(@NotBlank @Size(max = 180) String title, @Size(max = 10000) String description,
                                    @NotNull TaskPriority priority, LocalDate dueDate) {}

    public record StatusRequest(@NotNull TaskStatus status) {}

    public record AssigneeRequest(Long assigneeId) {}

    public record CommentRequest(@NotBlank @Size(max = 5000) String content) {}

    // ---------- responses ----------
    public record UserSummary(Long id, String fullName, String email, String avatarUrl) {}

    public record UserResponse(Long id, String fullName, String email, String avatarUrl, Instant createdAt) {}

    public record WorkspaceResponse(Long id, String name, String description, Role myRole, long memberCount, Instant createdAt) {}

    public record MemberResponse(Long userId, String fullName, String email, String avatarUrl, Role role, Instant joinedAt, long openTasks) {}

    public record ProjectResponse(Long id, Long workspaceId, String name, String description, LocalDate startDate, LocalDate dueDate,
                                  ProjectStatus status, long totalTasks, long completedTasks, int progress, UserSummary createdBy, Instant createdAt, Instant updatedAt) {}

    public record TaskResponse(Long id, Long projectId, String projectName, Long workspaceId, String title, String description,
                               TaskStatus status, TaskPriority priority, UserSummary assignee, UserSummary createdBy, LocalDate dueDate,
                               boolean overdue, List<TaskStatus> allowedTransitions, boolean canEdit, boolean canChangeStatus,
                               Instant createdAt, Instant updatedAt) {}

    public record CommentResponse(Long id, Long taskId, UserSummary author, String content, Instant createdAt) {}

    public record ActivityResponse(String kind, Long id, Long taskId, String taskTitle, String projectName, UserSummary changedBy,
                                   String fieldName, String oldValue, String newValue, Instant createdAt) {}

    public record ProjectProgress(Long projectId, String name, ProjectStatus status, long totalTasks, long completedTasks, int progress,
                                  long overdueTasks, long blockedTasks, LocalDate dueDate, UserSummary createdBy) {}

    public record TrendPoint(LocalDate date, long completed) {}

    public record WorkloadEntry(Long userId, String fullName, String avatarUrl, Role role, long openTasks, long overdueTasks, long completedTasks) {}

    public record DashboardResponse(long totalProjects, long totalTasks, long completedTasks, long pendingTasks, long inProgressTasks,
                                    long blockedTasks, long overdueTasks, double completionPercentage,
                                    Map<TaskStatus, Long> tasksByStatus, Map<TaskPriority, Long> tasksByPriority,
                                    List<ProjectProgress> projectProgress, List<TaskResponse> overdueList,
                                    List<TaskResponse> upcomingDeadlines, List<ActivityResponse> recentActivity,
                                    long unassignedOpenTasks, long completedLast7Days, long completedPrevious7Days,
                                    List<TrendPoint> completionTrend, List<WorkloadEntry> workload) {}

    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
        public static <T> PageResponse<T> of(org.springframework.data.domain.Page<T> p) {
            return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
        }
    }
}
