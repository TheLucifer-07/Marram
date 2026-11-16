package com.marram.service;

import com.marram.dto.Dto.UserResponse;
import com.marram.entity.AppUser;
import com.marram.mapper.Mapper;
import com.marram.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository users;
    private final Mapper mapper;

    public UserService(UserRepository users, Mapper mapper) { this.users = users; this.mapper = mapper; }

    public UserResponse me(AppUser user) { return mapper.user(user); }

    @Transactional
    public UserResponse updateName(AppUser user, String fullName) {
        AppUser managed = users.findById(user.getId()).orElseThrow();
        managed.setFullName(fullName.trim());
        return mapper.user(managed);
    }
}
