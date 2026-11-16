package com.marram.config;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Profiles;

/** Validates required Render database settings before datasource auto-configuration runs. */
public final class ProductionDatabaseConfigurationValidator
        implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        validate(context.getEnvironment());
    }

    static void validate(ConfigurableEnvironment environment) {
        // Render injects PORT. Treat it as production mode too, so a missed profile
        // setting cannot silently select the local localhost datasource default.
        if (!environment.acceptsProfiles(Profiles.of("production"))
                && environment.getProperty("PORT") == null) {
            return;
        }

        String url = environment.getProperty("DB_URL");
        if (url == null || url.isBlank()) {
            throw new IllegalStateException(
                    "Production database configuration is missing: set DB_URL to a MySQL JDBC URL beginning with jdbc:mysql://");
        }
        if (!url.startsWith("jdbc:mysql://")) {
            throw new IllegalStateException(
                    "Invalid production DB_URL: expected a MySQL JDBC URL beginning with jdbc:mysql:// (Render database URLs may need conversion from mysql://)");
        }

        require(environment, "DB_USERNAME");
        require(environment, "DB_PASSWORD");
    }

    private static void require(ConfigurableEnvironment environment, String name) {
        String value = environment.getProperty(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Production database configuration is missing: set " + name + " in the Render environment");
        }
    }
}
