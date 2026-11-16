package com.marram.repository;

import com.marram.entity.WorkspaceMember;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

    @EntityGraph(attributePaths = {"workspace", "user"})
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    boolean existsByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    @EntityGraph(attributePaths = {"workspace"})
    List<WorkspaceMember> findByUserIdOrderByWorkspaceNameAsc(Long userId);

    @EntityGraph(attributePaths = {"user"})
    List<WorkspaceMember> findByWorkspaceIdOrderByJoinedAtAsc(Long workspaceId);

    long countByWorkspaceId(Long workspaceId);

    @Query("select m.workspace.id as workspaceId, count(m) as total from WorkspaceMember m where m.workspace.id in :ids group by m.workspace.id")
    List<WorkspaceCount> countByWorkspaceIds(@Param("ids") Collection<Long> ids);

    interface WorkspaceCount {
        Long getWorkspaceId();

        Long getTotal();
    }
}
