package com.marram.controller;

import com.marram.dto.Dto.*;
import com.marram.entity.AppUser;
import com.marram.security.CurrentUser;
import com.marram.service.CommentService;
import com.marram.service.TaskHistoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tasks/{taskId}")
public class CommentController {
    private final CommentService comments;
    private final TaskHistoryService history;

    public CommentController(CommentService comments, TaskHistoryService history) {
        this.comments = comments;
        this.history = history;
    }

    @PostMapping("/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse add(@CurrentUser AppUser user, @PathVariable Long taskId, @Valid @RequestBody CommentRequest req) {
        return comments.add(user, taskId, req.content());
    }

    @GetMapping("/comments")
    public PageResponse<CommentResponse> list(@CurrentUser AppUser user, @PathVariable Long taskId,
                                              @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return comments.list(user, taskId, page, size);
    }

    /** Read-only: no endpoint creates, edits or deletes history. */
    @GetMapping("/history")
    public PageResponse<ActivityResponse> history(@CurrentUser AppUser user, @PathVariable Long taskId,
                                                  @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return history.forTask(user, taskId, page, size);
    }
}
