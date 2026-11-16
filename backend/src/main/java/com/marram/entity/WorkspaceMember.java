package com.marram.entity;

import com.marram.enums.Role;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "workspace_members", uniqueConstraints = @UniqueConstraint(columnNames = {"workspace_id", "user_id"}))
public class WorkspaceMember {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    protected WorkspaceMember() {}

    public WorkspaceMember(Workspace workspace, AppUser user, Role role) {
        this.workspace = workspace;
        this.user = user;
        this.role = role;
    }

    @PrePersist void onCreate() { joinedAt = Instant.now(); }

    public Long getId() { return id; }
    public Workspace getWorkspace() { return workspace; }
    public AppUser getUser() { return user; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public Instant getJoinedAt() { return joinedAt; }
}
