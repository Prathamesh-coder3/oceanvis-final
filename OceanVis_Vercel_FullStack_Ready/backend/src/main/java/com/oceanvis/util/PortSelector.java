package com.oceanvis.util;

import java.io.IOException;
import java.net.ServerSocket;

/**
 * Utility for robust dynamic port selection.
 * Priority:
 * 1. Command-line argument: --server.port=XXXX
 * 2. System property: server.port
 * 3. Environment variable: PORT or SERVER_PORT
 * 4. Automatic sequential search: 8080 -> 8081 -> 8082 -> ...
 */
public final class PortSelector {

    public static final int DEFAULT_PORT = 8080;
    public static final int MAX_SEARCH_RANGE = 100;

    private PortSelector() {}

    /**
     * Checks if a given port is available for binding.
     */
    public static boolean isPortAvailable(int port) {
        if (port < 1024 || port > 65535) {
            return false;
        }
        try (ServerSocket socket = new ServerSocket(port)) {
            socket.setReuseAddress(true);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Searches sequentially for the first available port starting from startPort.
     */
    public static int findAvailablePort(int startPort, int maxAttempts) {
        for (int i = 0; i < maxAttempts; i++) {
            int candidate = startPort + i;
            if (isPortAvailable(candidate)) {
                return candidate;
            }
            System.out.println("[OceanVis] Port " + candidate + " is occupied. Trying " + (candidate + 1) + "...");
        }
        throw new IllegalStateException(
            "No available port found in range [" + startPort + " - " + (startPort + maxAttempts - 1) + "]"
        );
    }

    /**
     * Determines the appropriate port based on priority rules:
     * 1. Command-line args (--server.port=XXXX)
     * 2. System property (server.port)
     * 3. Environment variable (PORT / SERVER_PORT)
     * 4. Sequential search starting from 8080
     */
    public static int determinePort(String[] args) {
        // 1. Explicit CLI argument
        if (args != null) {
            for (String arg : args) {
                if (arg != null && arg.startsWith("--server.port=")) {
                    try {
                        int explicitPort = Integer.parseInt(arg.substring("--server.port=".length()).trim());
                        System.out.println("[OceanVis] Using explicitly requested CLI port: " + explicitPort);
                        return explicitPort;
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        // 2. System property
        String sysProp = System.getProperty("server.port");
        if (sysProp != null && !sysProp.trim().isEmpty()) {
            try {
                int explicitPort = Integer.parseInt(sysProp.trim());
                System.out.println("[OceanVis] Using system property server.port: " + explicitPort);
                return explicitPort;
            } catch (NumberFormatException ignored) {}
        }

        // 3. Environment variable
        String envPort = System.getenv("PORT");
        if (envPort == null || envPort.trim().isEmpty()) {
            envPort = System.getenv("SERVER_PORT");
        }
        if (envPort != null && !envPort.trim().isEmpty()) {
            try {
                int explicitPort = Integer.parseInt(envPort.trim());
                System.out.println("[OceanVis] Using environment variable PORT: " + explicitPort);
                return explicitPort;
            } catch (NumberFormatException ignored) {}
        }

        // 4. Automatic search starting at DEFAULT_PORT (8080)
        return findAvailablePort(DEFAULT_PORT, MAX_SEARCH_RANGE);
    }
}
