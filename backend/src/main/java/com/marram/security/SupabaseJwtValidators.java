package com.marram.security;

import java.util.List;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;

/** Every claim check applied after the signature is verified. */
public final class SupabaseJwtValidators {
    private SupabaseJwtValidators() {}

    public static OAuth2TokenValidator<Jwt> create(String issuer, String audience) {
        OAuth2TokenValidator<Jwt> issuerAndExpiry = JwtValidators.createDefaultWithIssuer(issuer);
        OAuth2TokenValidator<Jwt> audienceCheck = jwt -> {
            List<String> aud = jwt.getAudience();
            return aud != null && aud.contains(audience) ? OAuth2TokenValidatorResult.success() : failure("Wrong audience");
        };
        OAuth2TokenValidator<Jwt> subjectCheck = jwt ->
                jwt.getSubject() != null && !jwt.getSubject().isBlank() ? OAuth2TokenValidatorResult.success() : failure("Missing subject");
        // Supabase puts role=authenticated on signed-in users. The public anon/publishable key is role=anon and must not pass.
        OAuth2TokenValidator<Jwt> roleCheck = jwt ->
                "authenticated".equals(jwt.getClaimAsString("role")) ? OAuth2TokenValidatorResult.success() : failure("Not an authenticated user token");
        return new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(issuerAndExpiry, audienceCheck, subjectCheck, roleCheck);
    }

    private static OAuth2TokenValidatorResult failure(String description) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", description, null));
    }
}
