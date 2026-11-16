package com.marram.controller;

import com.marram.dto.Dto.DashboardResponse;
import com.marram.entity.AppUser;
import com.marram.security.CurrentUser;
import com.marram.service.DashboardService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/dashboard")
public class DashboardController {
    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) { this.dashboard = dashboard; }

    @GetMapping
    public DashboardResponse get(@CurrentUser AppUser user, @PathVariable Long workspaceId) { return dashboard.dashboard(user, workspaceId); }
}
