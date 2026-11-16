package com.marram.repository;

import com.marram.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @org.springframework.data.jpa.repository.Query("select c from Comment c join fetch c.author join fetch c.task t join fetch t.project p "
            + "where p.workspace.id = :workspaceId order by c.createdAt desc, c.id desc")
    java.util.List<Comment> findRecent(@org.springframework.data.repository.query.Param("workspaceId") Long workspaceId, org.springframework.data.domain.Pageable pageable);


    @EntityGraph(attributePaths = {"author"})
    Page<Comment> findByTaskId(Long taskId, Pageable pageable);
}
