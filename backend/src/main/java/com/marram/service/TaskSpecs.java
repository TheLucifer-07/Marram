package com.marram.service;

import com.marram.entity.Task;
import com.marram.enums.TaskPriority;
import com.marram.enums.TaskStatus;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/** Filtering happens in the database, never in memory. */
final class TaskSpecs {
    private TaskSpecs() {}

    static Specification<Task> filter(Long projectId, Long workspaceId, TaskStatus status, TaskPriority priority, Long assigneeId, String q,
                                      Boolean open, java.time.LocalDate overdueBefore) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (projectId != null) ps.add(cb.equal(root.get("project").get("id"), projectId));
            if (workspaceId != null) ps.add(cb.equal(root.get("project").get("workspace").get("id"), workspaceId));
            if (status != null) ps.add(cb.equal(root.get("status"), status));
            if (priority != null) ps.add(cb.equal(root.get("priority"), priority));
            if (assigneeId != null) ps.add(cb.equal(root.get("assignee").get("id"), assigneeId));
            if (Boolean.TRUE.equals(open)) ps.add(cb.notEqual(root.get("status"), TaskStatus.DONE));
            if (overdueBefore != null) {
                ps.add(cb.notEqual(root.get("status"), TaskStatus.DONE));
                ps.add(cb.lessThan(root.<java.time.LocalDate>get("dueDate"), overdueBefore));
            }
            if (q != null && !q.isBlank()) {
                String like = Pages.like(q);
                ps.add(cb.or(cb.like(cb.lower(root.get("title")), like, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("description"), "")), like, '\\')));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
    }
}
