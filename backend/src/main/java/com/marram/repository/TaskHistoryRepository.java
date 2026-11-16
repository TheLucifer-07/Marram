package com.marram.repository;

import com.marram.entity.TaskHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskHistoryRepository extends JpaRepository<TaskHistory, Long> {

    @EntityGraph(attributePaths = {"changedBy"})
    Page<TaskHistory> findByTaskId(Long taskId, Pageable pageable);

    /** Timestamps only (no entities) of tasks moved to DONE since a point in time; bucketed into days by the service. */
    @Query("select h.createdAt from TaskHistory h join h.task t where t.project.workspace.id = :workspaceId "
            + "and h.fieldName = 'status' and h.newValue = 'DONE' and h.createdAt >= :since")
    java.util.List<java.time.Instant> findCompletionTimes(@Param("workspaceId") Long workspaceId, @Param("since") java.time.Instant since);

    /** Workspace activity feed. Rows of soft-deleted tasks drop out through the task's @SQLRestriction. */
    @Query(value = "select h from TaskHistory h join fetch h.changedBy join fetch h.task t join fetch t.project p where p.workspace.id = :workspaceId",
            countQuery = "select count(h) from TaskHistory h join h.task t where t.project.workspace.id = :workspaceId")
    Page<TaskHistory> findActivity(@Param("workspaceId") Long workspaceId, Pageable pageable);
}
