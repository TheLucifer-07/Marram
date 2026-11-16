package com.marram.repository;

import com.marram.entity.Project;
import com.marram.enums.ProjectStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

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
    List<Project> findByWorkspaceIdAndStatus(Long workspaceId, ProjectStatus status, Pageable pageable);
}
