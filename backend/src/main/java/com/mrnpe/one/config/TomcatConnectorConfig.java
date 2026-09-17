package com.mrnpe.one.config;

import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Some Windows/sandboxed network stacks refuse the AF_UNIX loopback pipe the
 * JDK's default NIO {@code Selector} implementation uses for its wakeup
 * mechanism (java.io.IOException: "Unable to establish loopback connection"),
 * which otherwise prevents Tomcat's default NIO connector from starting at
 * all. NIO2 uses a different (non-Selector-based) async I/O mechanism on
 * Windows and isn't affected.
 */
@Configuration
public class TomcatConnectorConfig {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatNio2Customizer() {
        return factory -> factory.setProtocol("org.apache.coyote.http11.Http11Nio2Protocol");
    }
}