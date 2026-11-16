package com.marram.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.marram.dto.Dto.AddMemberRequest;
import com.marram.dto.Dto.WorkspaceRequest;
import com.marram.entity.*;
import com.marram.enums.Role;
import com.marram.exception.*;
import com.marram.mapper.Mapper;
import com.marram.repository.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WorkspaceServiceTest {
    @Mock WorkspaceRepository workspaces;
    @Mock WorkspaceMemberRepository members;
    @Mock UserRepository users;
    @Mock TaskRepository tasks;
    @Mock AccessService access;
    @Mock TaskHistoryService history;

    WorkspaceService service;
    AppUser owner, alice;
    Workspace ws;

    static AppUser user(long id, String name) {
        AppUser u = new AppUser("sb-" + id, name, name.toLowerCase() + "@x.co", null);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @BeforeEach
    void setUp() {
        service = new WorkspaceService(workspaces, members, users, tasks, access, history, new Mapper());
        owner = user(1, "Owner");
        alice = user(2, "Alice");
        ws = new Workspace("Team", null);
        ReflectionTestUtils.setField(ws, "id", 10L);
        ReflectionTestUtils.setField(ws, "createdAt", Instant.now());
        when(workspaces.save(any())).thenReturn(ws);
        when(members.save(any(WorkspaceMember.class))).thenAnswer(i -> i.getArgument(0));
        when(access.requireRole(10L, owner, Role.OWNER)).thenReturn(new WorkspaceMember(ws, owner, Role.OWNER));
    }

    @Test
    void creatingAWorkspaceMakesTheCreatorItsOwner() {
        var res = service.create(owner, new WorkspaceRequest("  Team  ", ""));
        ArgumentCaptor<WorkspaceMember> captor = ArgumentCaptor.forClass(WorkspaceMember.class);
        verify(members).save(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo(Role.OWNER);
        assertThat(captor.getValue().getUser()).isSameAs(owner);
        assertThat(res.myRole()).isEqualTo(Role.OWNER);
    }

    @Test
    void duplicateMembershipIsRejected() {
        when(users.findByEmailIgnoreCase("alice@x.co")).thenReturn(Optional.of(alice));
        when(members.existsByWorkspaceIdAndUserId(10L, 2L)).thenReturn(true);
        assertThatThrownBy(() -> service.addMember(owner, 10L, new AddMemberRequest("alice@x.co", Role.MEMBER)))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void cannotAddASecondOwner() {
        assertThatThrownBy(() -> service.addMember(owner, 10L, new AddMemberRequest("alice@x.co", Role.OWNER)))
                .isInstanceOf(InvalidWorkspaceMembershipException.class);
    }

    @Test
    void unknownEmailExplainsThatTheyMustSignUp() {
        when(users.findByEmailIgnoreCase("ghost@x.co")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.addMember(owner, 10L, new AddMemberRequest("ghost@x.co", Role.MEMBER)))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining("sign up");
    }

    @Test
    void theOwnerCannotBeRemovedOrDemoted() {
        WorkspaceMember ownerMembership = new WorkspaceMember(ws, owner, Role.OWNER);
        when(members.findByWorkspaceIdAndUserId(10L, 1L)).thenReturn(Optional.of(ownerMembership));
        assertThatThrownBy(() -> service.removeMember(owner, 10L, 1L)).isInstanceOf(InvalidWorkspaceMembershipException.class);
        assertThatThrownBy(() -> service.updateRole(owner, 10L, 1L, Role.MEMBER)).isInstanceOf(InvalidWorkspaceMembershipException.class);
        verify(members, never()).delete(any());
    }

    @Test
    void removingAMemberClearsTheirAssignmentsAndRecordsIt() {
        WorkspaceMember target = new WorkspaceMember(ws, alice, Role.MEMBER);
        when(members.findByWorkspaceIdAndUserId(10L, 2L)).thenReturn(Optional.of(target));
        Project p = new Project(ws, "P", null, java.time.LocalDate.now(), null, owner);
        Task t = new Task(p, "T", null, com.marram.enums.TaskPriority.LOW, alice, owner, null);
        when(tasks.findAssignedTo(10L, 2L)).thenReturn(List.of(t));

        service.removeMember(owner, 10L, 2L);

        assertThat(t.getAssignee()).isNull();
        verify(history).record(t, owner, "assignee", "Alice", null);
        verify(members).delete(target);
    }

    @Test
    void roleCannotBeRaisedToOwner() {
        assertThatThrownBy(() -> service.updateRole(owner, 10L, 2L, Role.OWNER)).isInstanceOf(InvalidWorkspaceMembershipException.class);
    }
}
