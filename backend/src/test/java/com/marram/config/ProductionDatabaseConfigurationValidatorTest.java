package com.marram.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class ProductionDatabaseConfigurationValidatorTest {

    @Test
    void localProfileDoesNotRequireProductionDatabaseVariables() {
        assertThatCode(() -> ProductionDatabaseConfigurationValidator.validate(new MockEnvironment()))
                .doesNotThrowAnyException();
    }

    @Test
    void productionRequiresDatabaseUrl() {
        MockEnvironment environment = productionEnvironment();

        assertThatThrownBy(() -> ProductionDatabaseConfigurationValidator.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("set DB_URL")
                .hasMessageContaining("jdbc:mysql://");
    }

    @Test
    void renderPortAlsoRequiresProductionDatabaseConfiguration() {
        MockEnvironment environment = new MockEnvironment().withProperty("PORT", "10000");

        assertThatThrownBy(() -> ProductionDatabaseConfigurationValidator.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("set DB_URL")
                .hasMessageContaining("jdbc:mysql://");
    }

    @Test
    void productionRejectsNonJdbcDatabaseUrls() {
        MockEnvironment environment = productionEnvironment()
                .withProperty("DB_URL", "mysql://db.example/marram")
                .withProperty("DB_USERNAME", "marram")
                .withProperty("DB_PASSWORD", "local-test-password");

        assertThatThrownBy(() -> ProductionDatabaseConfigurationValidator.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Invalid production DB_URL")
                .hasMessageContaining("jdbc:mysql://");
    }

    @Test
    void productionRequiresDatabaseCredentials() {
        MockEnvironment environment = productionEnvironment()
                .withProperty("DB_URL", "jdbc:mysql://db.example:3306/marram");

        assertThatThrownBy(() -> ProductionDatabaseConfigurationValidator.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DB_USERNAME");
    }

    @Test
    void productionRejectsMysqlSystemDatabases() {
        MockEnvironment environment = productionEnvironment()
                .withProperty("DB_URL", "jdbc:mysql://db.example:4000/sys?sslMode=VERIFY_IDENTITY")
                .withProperty("DB_USERNAME", "marram")
                .withProperty("DB_PASSWORD", "local-test-password");

        assertThatThrownBy(() -> ProductionDatabaseConfigurationValidator.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("'sys' is a MySQL/TiDB system database")
                .hasMessageContaining("do not baseline a system database");
    }

    @Test
    void productionRequiresDatabaseNameInJdbcUrl() {
        MockEnvironment environment = productionEnvironment()
                .withProperty("DB_URL", "jdbc:mysql://db.example:4000?sslMode=VERIFY_IDENTITY")
                .withProperty("DB_USERNAME", "marram")
                .withProperty("DB_PASSWORD", "local-test-password");

        assertThatThrownBy(() -> ProductionDatabaseConfigurationValidator.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("include a dedicated application database");
    }

    @Test
    void productionAcceptsMysqlJdbcConfiguration() {
        MockEnvironment environment = productionEnvironment()
                .withProperty("DB_URL", "jdbc:mysql://db.example:3306/marram?sslMode=VERIFY_IDENTITY")
                .withProperty("DB_USERNAME", "marram")
                .withProperty("DB_PASSWORD", "local-test-password");

        assertThatCode(() -> ProductionDatabaseConfigurationValidator.validate(environment))
                .doesNotThrowAnyException();
    }

    private MockEnvironment productionEnvironment() {
        return new MockEnvironment().withProperty("spring.profiles.active", "production");
    }
}
