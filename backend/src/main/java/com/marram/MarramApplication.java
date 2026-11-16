package com.marram;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import com.marram.config.ProductionDatabaseConfigurationValidator;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MarramApplication {
    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(MarramApplication.class);
        application.addInitializers(new ProductionDatabaseConfigurationValidator());
        application.run(args);
    }
}
