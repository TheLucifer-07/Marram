package com.marram.security;

import com.marram.config.AppProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    /** Supabase signs with the project's signing key; the public keys are fetched from its JWKS endpoint and cached. */
    @Bean
    JwtDecoder jwtDecoder(AppProperties props) {
        AppProperties.Supabase sb = props.supabase();
        if (sb.url() == null || sb.url().isBlank()) {
            throw new IllegalStateException("SUPABASE_URL is not set. Set it to https://<project-ref>.supabase.co");
        }
        OAuth2TokenValidator<Jwt> validators = SupabaseJwtValidators.create(sb.issuer(), sb.audience());

        NimbusJwtDecoder jwks = NimbusJwtDecoder.withJwkSetUri(sb.jwksUri())
                .jwsAlgorithms(algs -> { algs.add(SignatureAlgorithm.ES256); algs.add(SignatureAlgorithm.RS256); })
                .build();
        jwks.setJwtValidator(validators);

        NimbusJwtDecoder hmac = null;
        if (sb.jwtSecret() != null && !sb.jwtSecret().isBlank()) {
            hmac = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(sb.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                    .macAlgorithm(MacAlgorithm.HS256).build();
            hmac.setJwtValidator(validators);
        }
        return new SupabaseJwtDecoder(jwks, hmac);
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JsonSecurityHandlers handlers, CorsConfigurationSource cors) throws Exception {
        http
            .cors(c -> c.configurationSource(cors))
            // Stateless bearer-token API: no cookies are used for auth, so there is no ambient credential for CSRF to abuse.
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/health/**", "/actuator/health").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())
                .authenticationEntryPoint(handlers).accessDeniedHandler(handlers))
            .exceptionHandling(e -> e.authenticationEntryPoint(handlers).accessDeniedHandler(handlers))
            .headers(h -> h.contentTypeOptions(Customizer.withDefaults()).frameOptions(f -> f.deny()));
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of(props.cors().allowedOrigin()));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", c);
        return source;
    }

    @Bean
    JsonSecurityHandlers jsonSecurityHandlers(ObjectMapper mapper) {
        return new JsonSecurityHandlers(mapper);
    }

}
