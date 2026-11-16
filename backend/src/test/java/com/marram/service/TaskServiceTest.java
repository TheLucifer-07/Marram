package com.marram.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.marram.dto.Dto.CreateTaskRequest;
import com.marram.entity.*;
import com.marram.enums.*;
import com.marram.exception.*;
import com.marram.mapper.Mapper;
import com.marram.repository.TaskRepository;
import com.marram.repository.WorkspaceMemberRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TaskServiceTest {
    @Mock TaskRepository tasks;
    @Mock WorkspaceMemberRepository members;
    @Mock AccessService access;
    @Mock TaskHistoryService history;

    TaskService service;
    AppUser owner, lead, member, other;
    Workspace ws;
    Project project;

    static AppUser user(long id, String name) {
        AppUser u = new AppUser("sb-" + id, name, name.toLowerCase() + "@x.co", null);
        ReflectionTestUtils.setField(u, "id", id);
        ReflectionTestUtils.setField(u, "createdAt", Instant.now());
        return u;
    }

    @BeforeEach
    void setUp() {
        service = new TaskService(tasks, members, access, history, new Mapper(), Clock.fixed(Instant.parse("2026-11-10T00:00:00Z"), ZoneOffset.UTC));
        owner = user(1, "Owner"); lead = user(2, "Lead"); member = user(3, "Member"); other = user(4, "Other");
        ws = new Workspace("W", null);
        ReflectionTestUtils.setField(ws, "id", 10L);
        project = new Project(ws, "P", null, LocalDate.of(2026, 11, 1), null, owner);
        ReflectionTestUtils.setField(project, "id", 20L);
        when(tasks.save(any(Task.class))).thenAnswer(i -> { Task t = i.getArgument(0); ReflectionTestUtils.setField(t, "id", 30L); return t; });
    }

    WorkspaceMember membership(AppUser u, Role r) { return new WorkspaceMember(ws, u, r); }

    Task task(AppUser assignee, TaskStatus status) {
        Task t = new Task(project, "T", null, TaskPriority.MEDIUM, assignee, owner, null);
        ReflectionTestUtils.setField(t, "id", 30L);
        t.setStatus(status);
        return t;
    }

    void viewerIs(AppUser u, Role r, Task t) {
        when(access.task(30L, u)).thenReturn(new AccessService.Access<>(t, membership(u, r)));
    }

    @Test
    void memberCannotCreateTasks() {
        when(access.project(20L, member)).thenReturn(new AccessService.Access<>(project, membership(member, Role.MEMBER)));
        assertThatThrownBy(() -> service.create(member, 20L, new CreateTaskRequest("x", null, TaskPriority.LOW, null, null)))
                .isInstanceOf(UnauthorizedOperationException.class);
        verify(tasks, never()).save(any());
    }

    @Test
    void leadCreatesTaskAndHistoryEntryTogether() {
        when(access.project(20L, lead)).thenReturn(new AccessService.Access<>(project, membership(lead, Role.LEAD)));
        var res = service.create(lead, 20L, new CreateTaskRequest("Ship it", null, TaskPriority.HIGH, null, null));
        assertThat(res.status()).isEqualTo(TaskStatus.TODO);
        verify(history).record(any(Task.class), eq(lead), eq("created"), eq(null), eq("Ship it"));
    }

    @Test
    void cannotCreateTasksInAnArchivedProject() {
        project.setStatus(ProjectStatus.ARCHIVED);
        when(access.project(20L, lead)).thenReturn(new AccessService.Access<>(project, membership(lead, Role.LEAD)));
        assertThatThrownBy(() -> service.create(lead, 20L, new CreateTaskRequest("x", null, TaskPriority.LOW, null, null)))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void assigneeMustBelongToTheWorkspace() {
        when(access.project(20L, lead)).thenReturn(new AccessService.Access<>(project, membership(lead, Role.LEAD)));
        when(members.findByWorkspaceIdAndUserId(10L, 99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(lead, 20L, new CreateTaskRequest("x", null, TaskPriority.LOW, 99L, null)))
                .isInstanceOf(InvalidWorkspaceMembershipException.class);
    }

    @Test
    void memberCannotAssignTasks() {
        Task t = task(member, TaskStatus.TODO);
        viewerIs(member, Role.MEMBER, t);
        assertThatThrownBy(() -> service.changeAssignee(member, 30L, 4L)).isInstanceOf(UnauthorizedOperationException.class);
    }

    @Test
    void assigneeMovesTheirOwnTaskAndItIsRecorded() {
        Task t = task(member, TaskStatus.TODO);
        viewerIs(member, Role.MEMBER, t);
        var res = service.changeStatus(member, 30L, TaskStatus.IN_PROGRESS);
        assertThat(res.status()).isEqualTo(TaskStatus.IN_PROGRESS);
        verify(history).record(t, member, "status", "TODO", "IN_PROGRESS");
    }

    @Test
    void memberCannotMoveSomeoneElsesTask() {
        Task t = task(lead, TaskStatus.TODO);
        viewerIs(member, Role.MEMBER, t);
        assertThatThrownBy(() -> service.changeStatus(member, 30L, TaskStatus.IN_PROGRESS)).isInstanceOf(UnauthorizedOperationException.class);
        assertThat(t.getStatus()).isEqualTo(TaskStatus.TODO);
        verifyNoInteractions(history);
    }

    @Test
    void invalidTransitionIsRejectedAndLeavesTheTaskUntouched() {
        Task t = task(member, TaskStatus.TODO);
        viewerIs(member, Role.MEMBER, t);
        assertThatThrownBy(() -> service.changeStatus(member, 30L, TaskStatus.DONE)).isInstanceOf(InvalidTaskTransitionException.class);
        assertThat(t.getStatus()).isEqualTo(TaskStatus.TODO);
        verifyNoInteractions(history);
    }

    @Test
    void completingATaskWritesHistory() {
        Task t = task(member, TaskStatus.IN_REVIEW);
        viewerIs(member, Role.MEMBER, t);
        service.changeStatus(member, 30L, TaskStatus.DONE);
        verify(history).record(t, member, "status", "IN_REVIEW", "DONE");
    }

    @Test
    void memberCannotReopenButLeadCan() {
        Task t = task(member, TaskStatus.DONE);
        viewerIs(member, Role.MEMBER, t);
        assertThatThrownBy(() -> service.changeStatus(member, 30L, TaskStatus.IN_PROGRESS)).isInstanceOf(InvalidTaskTransitionException.class);

        viewerIs(lead, Role.LEAD, t);
        service.changeStatus(lead, 30L, TaskStatus.IN_PROGRESS);
        assertThat(t.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        verify(history).record(t, lead, "status", "DONE", "IN_PROGRESS");
    }

    @Test
    void archivedProjectsFreezeTheirTasks() {
        project.setStatus(ProjectStatus.ARCHIVED);
        Task t = task(member, TaskStatus.TODO);
        viewerIs(lead, Role.LEAD, t);
        assertThatThrownBy(() -> service.changeStatus(lead, 30L, TaskStatus.IN_PROGRESS)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void reassignmentRecordsNamesInHistory() {
        Task t = task(member, TaskStatus.TODO);
        viewerIs(lead, Role.LEAD, t);
        when(members.findByWorkspaceIdAndUserId(10L, 4L)).thenReturn(Optional.of(membership(other, Role.MEMBER)));
        service.changeAssignee(lead, 30L, 4L);
        verify(history).record(t, lead, "assignee", "Member", "Other");
        assertThat(t.getAssignee()).isSameAs(other);
    }

    @Test
    void taskResponseTellsEachViewerWhatTheyMayDo() {
        Task t = task(member, TaskStatus.IN_PROGRESS);
        viewerIs(member, Role.MEMBER, t);
        var asAssignee = service.get(member, 30L);
        assertThat(asAssignee.canChangeStatus()).isTrue();
        assertThat(asAssignee.canEdit()).isFalse();
        assertThat(asAssignee.allowedTransitions()).containsExactlyInAnyOrder(TaskStatus.IN_REVIEW, TaskStatus.BLOCKED);

        viewerIs(other, Role.MEMBER, t);
        var asBystander = service.get(other, 30L);
        assertThat(asBystander.canChangeStatus()).isFalse();
        assertThat(asBystander.allowedTransitions()).isEmpty();
    }

    @Test
    void overdueIsComputedAgainstTheClock() {
        Task t = task(member, TaskStatus.TODO);
        t.setDueDate(LocalDate.of(2026, 11, 9));
        viewerIs(lead, Role.LEAD, t);
        assertThat(service.get(lead, 30L).overdue()).isTrue();
        t.setStatus(TaskStatus.DONE);
        assertThat(service.get(lead, 30L).overdue()).isFalse();
    }
}
