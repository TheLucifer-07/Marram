package com.marram.security;

import com.nimbusds.jwt.JWTParser;
import java.text.ParseException;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

/**
 * Chooses the verification path from the token header, but never lets the token pick its own trust anchor:
 * asymmetric tokens are verified only with the project's published JWKS, and HS256 tokens are accepted only when a
 * legacy shared secret has been configured. "alg: none" and unknown algorithms are rejected.
 */
public class SupabaseJwtDecoder implements JwtDecoder {
    private final JwtDecoder asymmetric;
    private final JwtDecoder hmac; // null unless a legacy secret is configured

    public SupabaseJwtDecoder(JwtDecoder asymmetric, JwtDecoder hmac) {
        this.asymmetric = asymmetric;
        this.hmac = hmac;
    }

    @Override
    public Jwt decode(String token) throws JwtException {
        String alg;
        try {
            alg = JWTParser.parse(token).getHeader().getAlgorithm().getName();
        } catch (ParseException e) {
            throw new BadJwtException("Malformed token", e);
        }
        if ("HS256".equals(alg)) {
            if (hmac == null) {
                throw new BadJwtException("HS256 tokens are not accepted: no legacy JWT secret is configured");
            }
            return hmac.decode(token);
        }
        return asymmetric.decode(token);
    }
}
