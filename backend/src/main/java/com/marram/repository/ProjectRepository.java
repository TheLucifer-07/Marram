package com.marram.repository;

import com.marram.entity.Project;
import com.marram.enums.ProjectStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {

    @EntityGraph(attributePaths = {"workspace", "createdBy"})
    Optional<Project> findWithWorkspaceById(Long id);

    @Override
    @EntityGraph(attributePaths = {"createdBy"})
    org.springframework.data.domain.Page<Project> findAll(org.springframework.data.jpa.domain.Specification<Project> spec, Pageable pageable);

    boolean existsByWorkspaceIdAndNameIgnoreCase(Long workspaceId, String name);

    boolean existsByWorkspaceIdAndNameIgnoreCaseAndIdNot(Long workspaceId, String name, Long id);

    long countByWorkspaceIdAndStatus(Long workspaceId, ProjectStatus status);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query("select p from Project p where p.workspace.id = :workspaceId and p.status = :status "
            + "order by case when p.dueDate is null then 1 else 0 end, p.dueDate asc, p.id desc")
    List<Project> findByWorkspaceIdAndStatus(@Param("workspaceId") Long workspaceId,
                                             @Param("status") ProjectStatus status, Pageable pageable);
}
