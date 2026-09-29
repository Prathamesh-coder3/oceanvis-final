package com.oceanvis;

import com.oceanvis.util.BrowserLauncher;
import com.oceanvis.util.PortSelector;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.context.WebServerApplicationContext;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.event.EventListener;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;

@SpringBootApplication
@EnableCaching
public class OceanVisApplication {

    public static void main(String[] args) {
        // Allow Desktop API to function if a graphical environment is present
        System.setProperty("java.awt.headless", "false");

        // Clean up port file on shutdown
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            cleanupPortFiles();
        }));

        int targetPort = PortSelector.determinePort(args);
        int maxRetries = 10;

        for (int attempt = 0; attempt < maxRetries; attempt++) {
            int portToUse = targetPort + attempt;
            try {
                System.setProperty("server.port", String.valueOf(portToUse));
                SpringApplication app = new SpringApplication(OceanVisApplication.class);
                app.setDefaultProperties(Collections.singletonMap("server.port", String.valueOf(portToUse)));
                app.run(args);
                return;
            } catch (Exception e) {
                if (isPortBindFailure(e) && attempt < maxRetries - 1) {
                    System.out.println("[OceanVis] Port " + portToUse + " bind failed. Retrying on port "
                            + (portToUse + 1) + "...");
                } else {
                    System.err.println("[OceanVis] Fatal error starting application: " + e.getMessage());
                    throw e;
                }
            }
        }
    }

    private static boolean isPortBindFailure(Throwable t) {
        while (t != null) {
            if (t instanceof java.net.BindException) {
                return true;
            }
            String msg = t.getMessage();
            if (msg != null && (msg.contains("Port") && msg.contains("in use")
                    || msg.contains("Address already in use")
                    || msg.contains("Failed to bind to"))) {
                return true;
            }
            t = t.getCause();
        }
        return false;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady(ApplicationReadyEvent event) {
        int actualPort = ((WebServerApplicationContext) event.getApplicationContext()).getWebServer().getPort();
        String localUrl = "http://localhost:" + actualPort;

        writePortFiles(actualPort);

        System.out.println();
        System.out.println("==============================================================");
        System.out.println(" OCEANVIS");
        System.out.println(" SCIENTIFIC OCEAN VISUALIZATION PLATFORM");
        System.out.println("==============================================================");
        System.out.println(" DATA MODE       = DEMO");
        System.out.println(" SERVER PORT     = " + actualPort);
        System.out.println(" LOCAL URL       = " + localUrl);
        System.out.println(" HEALTH          = " + localUrl + "/api/health");
        System.out.println(" STATUS          = " + localUrl + "/api/data-status");
        System.out.println(" DATASETS        = " + localUrl + "/api/datasets");
        System.out.println("==============================================================");
        System.out.println();

        // Vercel/container deployments are headless. Keep browser auto-launch for
        // explicit local opt-in only.
        boolean openBrowser = Boolean.parseBoolean(
                System.getenv().getOrDefault("OCEANVIS_OPEN_BROWSER", "false"));
        if (openBrowser) {
            BrowserLauncher.openBrowser(localUrl);
        }
    }

    private static void writePortFiles(int port) {
        try {
            // Write to project root .backend-port
            Files.writeString(Paths.get(".backend-port"), String.valueOf(port));

            // If backend subfolder exists, write there too
            Path backendDir = Paths.get("backend");
            if (Files.isDirectory(backendDir)) {
                Files.writeString(backendDir.resolve(".backend-port"), String.valueOf(port));
            }

            // If running inside backend folder, write to parent too
            Path parent = Paths.get("..").toAbsolutePath().normalize();
            if (Files.isDirectory(parent) && Files.exists(parent.resolve("frontend"))) {
                Files.writeString(parent.resolve(".backend-port"), String.valueOf(port));
            }
        } catch (Exception e) {
            System.err.println("[OceanVis] Warning: Could not write .backend-port: " + e.getMessage());
        }
    }

    private static void cleanupPortFiles() {
        try {
            Files.deleteIfExists(Paths.get(".backend-port"));
            Path backendDir = Paths.get("backend");
            if (Files.isDirectory(backendDir)) {
                Files.deleteIfExists(backendDir.resolve(".backend-port"));
            }
            Path parent = Paths.get("..").toAbsolutePath().normalize();
            if (Files.isDirectory(parent) && Files.exists(parent.resolve("frontend"))) {
                Files.deleteIfExists(parent.resolve(".backend-port"));
            }
        } catch (Exception ignored) {
        }
    }
}
