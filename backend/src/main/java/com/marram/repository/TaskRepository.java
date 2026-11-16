package com.marram.repository;

import com.marram.entity.Task;
import com.marram.enums.ProjectStatus;
import com.marram.enums.TaskStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    @EntityGraph(attributePaths = {"project", "project.workspace", "assignee", "createdBy"})
    Optional<Task> findWithDetailsById(Long id);

    @Override
    @EntityGraph(attributePaths = {"project", "project.workspace", "assignee", "createdBy"})
    Page<Task> findAll(Specification<Task> spec, Pageable pageable);

    @Query("select t from Task t join fetch t.project p join fetch p.workspace left join fetch t.assignee join fetch t.createdBy "
            + "where p.workspace.id = :workspaceId and p.status <> :archived and t.status <> :done and t.dueDate < :today order by t.dueDate asc, t.id asc")
    List<Task> findOverdue(@Param("workspaceId") Long workspaceId, @Param("today") LocalDate today,
                           @Param("done") TaskStatus done, @Param("archived") ProjectStatus archived, Pageable pageable);

    @Query("select t from Task t join fetch t.project p join fetch p.workspace left join fetch t.assignee join fetch t.createdBy "
            + "where p.workspace.id = :workspaceId and p.status <> :archived and t.status <> :done and t.dueDate >= :from and t.dueDate <= :to order by t.dueDate asc, t.id asc")
    List<Task> findDueBetween(@Param("workspaceId") Long workspaceId, @Param("from") LocalDate from, @Param("to") LocalDate to,
                              @Param("done") TaskStatus done, @Param("archived") ProjectStatus archived, Pageable pageable);

    @Query("select count(t) from Task t where t.project.workspace.id = :workspaceId")
    long countByWorkspace(@Param("workspaceId") Long workspaceId);

    @Query("select t.status as status, count(t) as total from Task t where t.project.workspace.id = :workspaceId group by t.status")
    List<StatusCount> countByStatus(@Param("workspaceId") Long workspaceId);

    @Query("select t.priority as priority, count(t) as total from Task t where t.project.workspace.id = :workspaceId group by t.priority")
    List<PriorityCount> countByPriority(@Param("workspaceId") Long workspaceId);

    @Query("select count(t) from Task t where t.project.workspace.id = :workspaceId and t.project.status <> :archived "
            + "and t.status <> :done and t.dueDate < :today")
    long countOverdue(@Param("workspaceId") Long workspaceId, @Param("today") LocalDate today,
                      @Param("done") TaskStatus done, @Param("archived") ProjectStatus archived);

    @Query("select t.project.id as projectId, count(t) as total, sum(case when t.status = :done then 1 else 0 end) as done "
            + "from Task t where t.project.id in :projectIds group by t.project.id")
    List<ProjectCount> countByProjects(@Param("projectIds") Collection<Long> projectIds, @Param("done") TaskStatus done);

    @Query("select t from Task t join fetch t.project p where p.workspace.id = :workspaceId and t.assignee.id = :userId")
    List<Task> findAssignedTo(@Param("workspaceId") Long workspaceId, @Param("userId") Long userId);

    @Query("select t.assignee.id as userId, "
            + "sum(case when t.status <> :done then 1 else 0 end) as openCount, "
            + "sum(case when t.status <> :done and t.dueDate < :today and t.project.status <> :archived then 1 else 0 end) as overdueCount, "
            + "sum(case when t.status = :done then 1 else 0 end) as doneCount "
            + "from Task t where t.project.workspace.id = :workspaceId and t.assignee is not null group by t.assignee.id")
    List<Workload> workload(@Param("workspaceId") Long workspaceId, @Param("today") LocalDate today,
                            @Param("done") TaskStatus done, @Param("archived") ProjectStatus archived);

    @Query("select count(t) from Task t where t.project.workspace.id = :workspaceId and t.assignee is null and t.status <> :done")
    long countUnassignedOpen(@Param("workspaceId") Long workspaceId, @Param("done") TaskStatus done);

    @Query("select t.project.id as projectId, "
            + "sum(case when t.status <> :done and t.dueDate < :today then 1 else 0 end) as overdueCount, "
            + "sum(case when t.status = :blocked then 1 else 0 end) as blockedCount "
            + "from Task t where t.project.id in :projectIds group by t.project.id")
    List<ProjectRisk> projectRisk(@Param("projectIds") Collection<Long> projectIds, @Param("today") LocalDate today,
                                  @Param("done") TaskStatus done, @Param("blocked") TaskStatus blocked);

    interface Workload {
        Long getUserId();

        Long getOpenCount();

        Long getOverdueCount();

        Long getDoneCount();
    }

    interface ProjectRisk {
        Long getProjectId();

        Long getOverdueCount();

        Long getBlockedCount();
    }

    interface StatusCount {
        TaskStatus getStatus();

        Long getTotal();
    }

    interface PriorityCount {
        com.marram.enums.TaskPriority getPriority();

        Long getTotal();
    }

    interface ProjectCount {
        Long getProjectId();

        Long getTotal();

        Long getDone();
    }
}
