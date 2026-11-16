package com.marram.repository;

import com.marram.entity.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findBySupabaseUserId(String supabaseUserId);

    Optional<AppUser> findByEmailIgnoreCase(String email);
}
