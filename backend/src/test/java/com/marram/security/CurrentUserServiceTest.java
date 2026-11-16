package com.marram.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.marram.config.AppProperties;
import com.marram.entity.AppUser;
import com.marram.exception.BusinessRuleException;
import com.marram.repository.UserRepository;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class CurrentUserServiceTest {
    UserRepository users = mock(UserRepository.class);
    CurrentUserService service;

    @BeforeEach
    void setUp() {
        service = new CurrentUserService(users, new AppProperties(new AppProperties.Supabase("https://x.supabase.co", "authenticated", "", true),
                new AppProperties.Cors("http://localhost:5173"), "UTC"));
        when(users.save(any(AppUser.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    void signIn(String sub, String email, Map<String, Object> meta) {
        Jwt.Builder b = Jwt.withTokenValue("t").header("alg", "ES256").subject(sub).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(600));
        if (email != null) b.claim("email", email);
        if (meta != null) b.claim("user_metadata", meta);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(b.build()));
    }

    @Test
    void createsAProfileOnFirstSignInForAVerifiedEmail() {
        signIn("sub-1", "Alex@Example.com", Map.of("full_name", "Alex Johnson", "email_verified", true, "avatar_url", "https://img.example/a.png"));
        AppUser u = service.current();
        assertThat(u.getEmail()).isEqualTo("alex@example.com");
        assertThat(u.getFullName()).isEqualTo("Alex Johnson");
        assertThat(u.getAvatarUrl()).isEqualTo("https://img.example/a.png");
    }

    @Test
    void refusesToCreateAProfileForAnUnverifiedEmail() {
        signIn("sub-2", "victim@example.com", Map.of("full_name", "Mallory"));
        assertThatThrownBy(() -> service.current()).isInstanceOf(BusinessRuleException.class).hasMessageContaining("not verified");
        verify(users, never()).save(any());
    }

    @Test
    void refusesAnEmailAlreadyOwnedByAnotherIdentity() {
        when(users.findByEmailIgnoreCase("alex@example.com")).thenReturn(Optional.of(new AppUser("other", "Alex", "alex@example.com", null)));
        signIn("sub-3", "alex@example.com", Map.of("email_verified", true));
        assertThatThrownBy(() -> service.current()).isInstanceOf(BusinessRuleException.class);
        verify(users, never()).save(any());
    }

    @Test
    void dropsNonHttpsAvatarUrls() {
        signIn("sub-4", "b@example.com", Map.of("email_verified", true, "picture", "http://tracker.example/pixel.gif"));
        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        service.current();
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getAvatarUrl()).isNull();
    }

    @Test
    void returnsTheExistingProfileWithoutWriting() {
        AppUser existing = new AppUser("sub-5", "Eve", "eve@example.com", null);
        when(users.findBySupabaseUserId("sub-5")).thenReturn(Optional.of(existing));
        signIn("sub-5", "eve@example.com", null);
        assertThat(service.current()).isSameAs(existing);
        verify(users, never()).save(any());
    }

    @Test
    void usesTheEmailPrefixWhenNoNameIsProvided() {
        signIn("sub-6", "kim@example.com", Map.of("email_verified", true));
        assertThat(service.current().getFullName()).isEqualTo("kim");
    }
}
