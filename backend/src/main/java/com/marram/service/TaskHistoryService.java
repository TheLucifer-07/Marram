package com.marram.service;

import com.marram.dto.Dto.ActivityResponse;
import com.marram.dto.Dto.PageResponse;
import com.marram.entity.AppUser;
import com.marram.entity.Task;
import com.marram.entity.TaskHistory;
import com.marram.mapper.Mapper;
import com.marram.repository.TaskHistoryRepository;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskHistoryService {
    private final TaskHistoryRepository history;
    private final AccessService access;
    private final Mapper mapper;

    public TaskHistoryService(TaskHistoryRepository history, AccessService access, Mapper mapper) {
        this.history = history;
        this.access = access;
        this.mapper = mapper;
    }

    /** MANDATORY: history is only ever written inside the transaction of the change it describes, so both commit or neither does. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(Task task, AppUser actor, String field, String oldValue, String newValue) {
        history.save(new TaskHistory(task, actor, field, oldValue, newValue));
    }

    @Transactional(readOnly = true)
    public PageResponse<ActivityResponse> forTask(AppUser user, Long taskId, int page, int size) {
        access.task(taskId, user);
        var pageable = Pages.of(page, size, null, Map.of(), Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<TaskHistory> p = history.findByTaskId(taskId, pageable);
        return PageResponse.of(p.map(mapper::activity));
    }

    @Transactional(readOnly = true)
    public PageResponse<ActivityResponse> forWorkspace(AppUser user, Long workspaceId, int page, int size) {
        access.membership(workspaceId, user);
        var pageable = Pages.of(page, size, null, Map.of(), Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return PageResponse.of(history.findActivity(workspaceId, pageable).map(mapper::activity));
    }
}
