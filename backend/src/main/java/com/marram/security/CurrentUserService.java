package com.marram.security;

import com.marram.entity.AppUser;
import com.marram.config.AppProperties;
import com.marram.exception.BusinessRuleException;
import com.marram.repository.UserRepository;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

/**
 * Maps the verified Supabase subject to an application user, creating the profile on first sign-in.
 * Deliberately not transactional: it runs before any business transaction, so a lost race on first
 * sign-in can be retried without poisoning an outer transaction.
 */
@Service
public class CurrentUserService {
    private final UserRepository users;
    private final AppProperties props;

    public CurrentUserService(UserRepository users, AppProperties props) {
        this.users = users;
        this.props = props;
    }

    public AppUser current() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken token)) {
            throw new AuthenticationCredentialsNotFoundException("No authenticated user");
        }
        Jwt jwt = token.getToken();
        return users.findBySupabaseUserId(jwt.getSubject()).orElseGet(() -> provision(jwt));
    }

    private AppUser provision(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            throw new BusinessRuleException("Your sign-in provider did not share an email address, so a Marram profile cannot be created");
        }
        Map<String, Object> meta = jwt.getClaimAsMap("user_metadata");
        if (props.supabase().requireVerifiedEmail() && !emailVerified(meta)) {
            throw new BusinessRuleException("Your email address is not verified yet. Confirm it from the email Supabase sent, then sign in again");
        }
        email = email.trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new BusinessRuleException("This email already belongs to another Marram profile");
        }
        String name = firstNonBlank(meta, "full_name", "name");
        if (name == null) name = email.substring(0, email.indexOf('@'));
        // user_metadata is editable by the user, so only an https image URL is accepted (no tracking over plain http).
        String avatar = firstNonBlank(meta, "avatar_url", "picture");
        if (avatar != null && !avatar.regionMatches(true, 0, "https://", 0, 8)) avatar = null;
        try {
            return users.save(new AppUser(jwt.getSubject(), truncate(name, 100), email, truncate(avatar, 500)));
        } catch (DataIntegrityViolationException raced) {
            return users.findBySupabaseUserId(jwt.getSubject()).orElseThrow(() -> raced);
        }
    }

    private static boolean emailVerified(Map<String, Object> meta) {
        return meta != null && Boolean.TRUE.equals(meta.get("email_verified"));
    }

    private static String firstNonBlank(Map<String, Object> meta, String... keys) {
        if (meta == null) return null;
        for (String k : keys) {
            Object v = meta.get(k);
            if (v instanceof String s && !s.isBlank()) return s.trim();
        }
        return null;
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
