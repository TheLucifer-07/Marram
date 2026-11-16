package com.marram.controller;

import com.marram.dto.Dto.*;
import com.marram.entity.AppUser;
import com.marram.security.CurrentUser;
import com.marram.service.WorkspaceService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/members")
public class MemberController {
    private final WorkspaceService workspaces;

    public MemberController(WorkspaceService workspaces) { this.workspaces = workspaces; }

    @GetMapping
    public List<MemberResponse> list(@CurrentUser AppUser user, @PathVariable Long workspaceId) { return workspaces.listMembers(user, workspaceId); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse add(@CurrentUser AppUser user, @PathVariable Long workspaceId, @Valid @RequestBody AddMemberRequest req) {
        return workspaces.addMember(user, workspaceId, req);
    }

    @PatchMapping("/{userId}")
    public MemberResponse updateRole(@CurrentUser AppUser user, @PathVariable Long workspaceId, @PathVariable Long userId, @Valid @RequestBody UpdateRoleRequest req) {
        return workspaces.updateRole(user, workspaceId, userId, req.role());
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@CurrentUser AppUser user, @PathVariable Long workspaceId, @PathVariable Long userId) { workspaces.removeMember(user, workspaceId, userId); }
}
