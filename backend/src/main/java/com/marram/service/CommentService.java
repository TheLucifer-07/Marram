package com.marram.service;

import com.marram.dto.Dto.CommentResponse;
import com.marram.dto.Dto.PageResponse;
import com.marram.entity.AppUser;
import com.marram.entity.Comment;
import com.marram.mapper.Mapper;
import com.marram.repository.CommentRepository;
import java.util.Map;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {
    private final CommentRepository comments;
    private final AccessService access;
    private final Mapper mapper;

    public CommentService(CommentRepository comments, AccessService access, Mapper mapper) {
        this.comments = comments;
        this.access = access;
        this.mapper = mapper;
    }

    @Transactional
    public CommentResponse add(AppUser user, Long taskId, String content) {
        var task = access.task(taskId, user).entity();
        return mapper.comment(comments.save(new Comment(task, user, content.trim())));
    }

    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> list(AppUser user, Long taskId, int page, int size) {
        access.task(taskId, user);
        var pageable = Pages.of(page, size, null, Map.of(), Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id")));
        return PageResponse.of(comments.findByTaskId(taskId, pageable).map(mapper::comment));
    }
}
