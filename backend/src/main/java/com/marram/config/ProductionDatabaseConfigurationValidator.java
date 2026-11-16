package com.marram.config;

import java.net.URI;
import java.util.Locale;
import java.util.Set;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Profiles;

/** Validates required Render database settings before datasource auto-configuration runs. */
public final class ProductionDatabaseConfigurationValidator
        implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static final Set<String> SYSTEM_DATABASES = Set.of(
            "information_schema", "inspection_schema", "metrics_schema", "mysql",
            "performance_schema", "sys");

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
        validateDatabaseName(url);

        require(environment, "DB_USERNAME");
        require(environment, "DB_PASSWORD");
    }

    private static void validateDatabaseName(String jdbcUrl) {
        String path;
        try {
            path = URI.create(jdbcUrl.substring("jdbc:".length())).getPath();
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "Invalid production DB_URL: expected jdbc:mysql://<host>:<port>/<application-database>");
        }

        String database = path == null || path.length() < 2 ? "" : path.substring(1).split("/", 2)[0];
        if (database.isBlank()) {
            throw new IllegalStateException(
                    "Invalid production DB_URL: include a dedicated application database after the host, for example /marram");
        }
        if (SYSTEM_DATABASES.contains(database.toLowerCase(Locale.ROOT))) {
            throw new IllegalStateException(
                    "Invalid production DB_URL: '" + database
                            + "' is a MySQL/TiDB system database. Create or select an empty application database (for example marram) and use it in the URL path; do not baseline a system database.");
        }
    }

    private static void require(ConfigurableEnvironment environment, String name) {
        String value = environment.getProperty(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Production database configuration is missing: set " + name + " in the Render environment");
        }
    }
}
