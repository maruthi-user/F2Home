package com.mrnpe.one.f2home.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Stateless Bearer-token filter for the F2HOME chain. Runs before the
 * standard authentication filter position and only populates the
 * SecurityContext when a valid F2HOME access token is presented.
 */
@Component
public class F2HomeJwtAuthenticationFilter extends OncePerRequestFilter {

    private final F2HomeJwtService jwtService;

    public F2HomeJwtAuthenticationFilter(F2HomeJwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            F2HomeUserPrincipal principal = jwtService.parseToken(header.substring(7));
            if (principal != null && principal.role() != null) {
                var authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + principal.role().name()));
                var authentication = new UsernamePasswordAuthenticationToken(
                        principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }
}