package com.marram.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** Append-only. No setters and no update or delete endpoint exist for this table. */
@Entity
@Table(name = "task_history")
public class TaskHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false, updatable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by", nullable = false, updatable = false)
    private AppUser changedBy;

    @Column(name = "field_name", nullable = false, updatable = false, length = 50)
    private String fieldName;

    @Column(name = "old_value", updatable = false, columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", updatable = false, columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TaskHistory() {}

    public TaskHistory(Task task, AppUser changedBy, String fieldName, String oldValue, String newValue) {
        this.task = task;
        this.changedBy = changedBy;
        this.fieldName = fieldName;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    @PrePersist void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Task getTask() { return task; }
    public AppUser getChangedBy() { return changedBy; }
    public String getFieldName() { return fieldName; }
    public String getOldValue() { return oldValue; }
    public String getNewValue() { return newValue; }
    public Instant getCreatedAt() { return createdAt; }
}
