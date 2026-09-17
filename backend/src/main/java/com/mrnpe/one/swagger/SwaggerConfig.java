package com.mrnpe.one.swagger;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityScheme.Type;
import io.swagger.v3.oas.models.servers.Server;
@Configuration
public class SwaggerConfig {
    @Bean
    public OpenAPI f2HomeOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("F2Home API")
                        .description("API documentation for F2Home - a farmer-to-customer marketplace")
                        .version("1.0")
                        .contact(new Contact()
                                .name("F2Home")
                                .email("support@f2home.com")
                                .url("https://f2home.com/")))
                .servers(List.of(
                        new Server().url("http://localhost:8081").description("Local development server"),
                        new Server().url("https://api-dev.f2home.com").description("Development server"),
                        new Server().url("https://api.f2home.com").description("Production server")
                ))
                .addSecurityItem(new SecurityRequirement().addList("JWT"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("JWT", new SecurityScheme()
                                .type(Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}