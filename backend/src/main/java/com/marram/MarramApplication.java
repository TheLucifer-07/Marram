package com.marram;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MarramApplication {
    public static void main(String[] args) {
        SpringApplication.run(MarramApplication.class, args);
    }
}
