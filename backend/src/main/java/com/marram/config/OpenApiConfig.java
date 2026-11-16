package com.marram.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI marramOpenApi() {
        return new OpenAPI()
                .info(new Info().title("Marram API").version("1.0.0")
                        .description("Workspaces, projects, tasks, comments and task history. Authenticate with a Supabase access token."))
                .components(new Components().addSecuritySchemes("supabase",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("supabase"));
    }
}
