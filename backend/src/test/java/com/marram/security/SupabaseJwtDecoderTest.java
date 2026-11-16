package com.marram.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.util.Date;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;

/** Exercises the real validators and algorithm routing with locally generated keys (no network, no Supabase). */
class SupabaseJwtDecoderTest {
    static final String ISSUER = "https://abc.supabase.co/auth/v1";
    static final String HS_SECRET = "legacy-shared-secret-legacy-shared-secret-123456";
    static KeyPair rsa;

    @BeforeAll
    static void keys() throws Exception {
        KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
        g.initialize(2048);
        rsa = g.generateKeyPair();
    }

    static SupabaseJwtDecoder decoder(boolean withLegacySecret) {
        var validators = SupabaseJwtValidators.create(ISSUER, "authenticated");
        NimbusJwtDecoder asym = NimbusJwtDecoder.withPublicKey((RSAPublicKey) rsa.getPublic()).build();
        asym.setJwtValidator(validators);
        NimbusJwtDecoder hmac = null;
        if (withLegacySecret) {
            hmac = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(HS_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256")).macAlgorithm(MacAlgorithm.HS256).build();
            hmac.setJwtValidator(validators);
        }
        return new SupabaseJwtDecoder(asym, hmac);
    }

    static JWTClaimsSet.Builder claims() {
        return new JWTClaimsSet.Builder().subject("0b6a1c7e-1111-4222-8333-444455556666").issuer(ISSUER).audience("authenticated")
                .claim("role", "authenticated").claim("email", "a@b.co")
                .expirationTime(new Date(System.currentTimeMillis() + 600_000));
    }

    static String rs256(JWTClaimsSet claims) throws Exception {
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
        jwt.sign(new RSASSASigner(rsa.getPrivate()));
        return jwt.serialize();
    }

    static String hs256(JWTClaimsSet claims) throws Exception {
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(HS_SECRET.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }

    @Test
    void acceptsAValidToken() throws Exception {
        Jwt jwt = decoder(false).decode(rs256(claims().build()));
        assertThat(jwt.getSubject()).isEqualTo("0b6a1c7e-1111-4222-8333-444455556666");
    }

    @Test
    void rejectsAnExpiredToken() throws Exception {
        String token = rs256(claims().expirationTime(new Date(System.currentTimeMillis() - 120_000)).build());
        assertThatThrownBy(() -> decoder(false).decode(token)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsTheWrongIssuer() throws Exception {
        String token = rs256(claims().issuer("https://evil.example/auth/v1").build());
        assertThatThrownBy(() -> decoder(false).decode(token)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsTheWrongAudience() throws Exception {
        String token = rs256(claims().audience("someone-else").build());
        assertThatThrownBy(() -> decoder(false).decode(token)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsAnonRoleTokens() throws Exception {
        String token = rs256(claims().claim("role", "anon").build());
        assertThatThrownBy(() -> decoder(false).decode(token)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsATokenWithoutSubject() throws Exception {
        JWTClaimsSet noSub = new JWTClaimsSet.Builder().issuer(ISSUER).audience("authenticated").claim("role", "authenticated")
                .expirationTime(new Date(System.currentTimeMillis() + 600_000)).build();
        String token = rs256(noSub);
        assertThatThrownBy(() -> decoder(false).decode(token)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsATokenSignedWithAnotherKey() throws Exception {
        KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
        g.initialize(2048);
        KeyPair other = g.generateKeyPair();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims().build());
        jwt.sign(new RSASSASigner(other.getPrivate()));
        assertThatThrownBy(() -> decoder(false).decode(jwt.serialize())).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsUnsignedTokens() {
        String token = new PlainJWT(claims().build()).serialize();
        assertThatThrownBy(() -> decoder(true).decode(token)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsGarbage() {
        assertThatThrownBy(() -> decoder(false).decode("not-a-jwt")).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsHs256WhenNoLegacySecretIsConfigured() throws Exception {
        String token = hs256(claims().build());
        assertThatThrownBy(() -> decoder(false).decode(token)).isInstanceOf(BadJwtException.class).hasMessageContaining("not accepted");
    }

    @Test
    void acceptsHs256OnlyWhenTheLegacySecretIsConfigured() throws Exception {
        assertThat(decoder(true).decode(hs256(claims().build())).getSubject()).isNotBlank();
    }
}
