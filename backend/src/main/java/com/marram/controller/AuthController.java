package com.marram.controller;

import com.marram.dto.Dto.*;
import com.marram.entity.AppUser;
import com.marram.security.CurrentUser;
import com.marram.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/** Registration and login live in Supabase Auth. This controller only exposes the application profile. */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final UserService users;

    public AuthController(UserService users) { this.users = users; }

    @GetMapping("/me")
    public UserResponse me(@CurrentUser AppUser user) { return users.me(user); }

    @PatchMapping("/me")
    public UserResponse update(@CurrentUser AppUser user, @Valid @RequestBody UpdateProfileRequest req) {
        return users.updateName(user, req.fullName());
    }
}
