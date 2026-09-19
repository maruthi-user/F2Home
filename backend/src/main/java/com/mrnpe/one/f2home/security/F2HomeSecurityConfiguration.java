package com.mrnpe.one.f2home.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * F2HOME security wiring. A dedicated {@link SecurityFilterChain} scoped to
 * {@code /api/f2home/**} with its own JWT filter + signing secret; a
 * catch-all chain keeps actuator/swagger/docs reachable.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class F2HomeSecurityConfiguration {

    private final F2HomeJwtAuthenticationFilter jwtAuthenticationFilter;

    public F2HomeSecurityConfiguration(@Lazy F2HomeJwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    @Order(1)
    public SecurityFilterChain f2HomeSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/f2home/**")
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // All auth endpoints (register/login/refresh/logout/
                        // forgot/reset) are public; the tokens they issue
                        // protect /api/f2home/** resources added later.
                        .requestMatchers("/api/f2home/auth/**").permitAll()
                        .anyRequest().authenticated())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.getWriter().write(
                                    "{\"statusCode\":401,\"message\":\"Unauthorized: authentication is required\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            String msg = accessDeniedException.getMessage() != null
                                    ? accessDeniedException.getMessage().replace("\"", "\\\"")
                                    : "Access denied";
                            response.getWriter().write(
                                    "{\"statusCode\":403,\"message\":\"" + msg + "\"}");
                        }))
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()));
        return http.build();
    }

    /**
     * Catch-all chain for everything outside /api/f2home/** (actuator,
     * swagger, static docs) so those stay reachable without an F2HOME token.
     */
    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher(request -> true)
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/actuator/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/error").permitAll()
                        .anyRequest().denyAll())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()));
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Web names: local + production = f2home.com, dev = dev.f2home.com.
        // The :3001 / :5173 entries keep the local Vite dev server working on
        // both localhost and the local f2home.com host name.
        configuration.setAllowedOrigins(List.of(
                "http://localhost:3001", "http://127.0.0.1:3001",
                "http://localhost:5173", "http://127.0.0.1:5173",
                "http://192.168.0.151:3001",
                "http://f2home.com", "https://f2home.com",
                "http://www.f2home.com", "https://www.f2home.com",
                "http://f2home.com:3001",
                "http://dev.f2home.com", "https://dev.f2home.com",
                "http://api.f2home.com", "https://api.f2home.com",
                "http://api-dev.f2home.com", "https://api-dev.f2home.com"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        configuration.setExposedHeaders(List.of(HttpHeaders.CONTENT_DISPOSITION));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}