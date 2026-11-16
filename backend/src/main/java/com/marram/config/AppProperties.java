package com.marram.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Supabase supabase, Cors cors, String timeZone) {
    public record Supabase(String url, String audience, String jwtSecret, boolean requireVerifiedEmail) {
        public String issuer() { return trimSlash(url) + "/auth/v1"; }
        public String jwksUri() { return issuer() + "/.well-known/jwks.json"; }
        private static String trimSlash(String s) { return s == null ? "" : s.replaceAll("/+$", ""); }
    }

    public record Cors(String allowedOrigin) {}
}
