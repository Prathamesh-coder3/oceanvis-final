package com.oceanvis.util;

import java.awt.Desktop;
import java.net.URI;
import java.util.Locale;

/**
 * Reliable cross-platform browser launcher for the OceanVis single-process app.
 *
 * Windows intentionally uses the OS URL handler first. In some IDE/Java-runtime
 * combinations Desktop.browse() can report success without visibly opening the
 * user's browser, so Desktop API is kept as a fallback rather than the primary
 * mechanism.
 */
public final class BrowserLauncher {

    private BrowserLauncher() {}

    public static void openBrowser(String url) {
        System.out.println("[OceanVis] Opening browser at: " + url);

        String os = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);

        // 1. Windows: let Windows shell resolve the user's default browser.
        if (os.contains("win")) {
            if (startWindowsUrlHandler(url)) {
                return;
            }
        }

        // 2. macOS/Linux/Unix: native URL opener.
        if (os.contains("mac")) {
            if (startProcess(new String[] {"open", url}, "macOS open")) {
                return;
            }
        } else if (!os.contains("win")) {
            if (startProcess(new String[] {"xdg-open", url}, "xdg-open")) {
                return;
            }
        }

        // 3. Java Desktop API fallback.
        try {
            if (Desktop.isDesktopSupported()) {
                Desktop desktop = Desktop.getDesktop();
                if (desktop.isSupported(Desktop.Action.BROWSE)) {
                    desktop.browse(new URI(url));
                    System.out.println("[OceanVis] Browser opened via Java Desktop API fallback.");
                    return;
                }
            }
        } catch (Throwable t) {
            System.err.println("[OceanVis] Desktop browser fallback failed: " + t.getMessage());
        }

        System.err.println("[OceanVis] Could not open the browser automatically.");
        System.err.println("[OceanVis] Please open manually: " + url);
    }

    private static boolean startWindowsUrlHandler(String url) {
        // Most reliable shell-level URL opener on Windows.
        if (startProcess(new String[] {"rundll32.exe", "url.dll,FileProtocolHandler", url}, "Windows URL handler")) {
            return true;
        }

        // Secondary Windows fallback.
        if (startProcess(new String[] {"cmd.exe", "/c", "start", "", url}, "Windows cmd start")) {
            return true;
        }

        // Final Windows fallback via PowerShell.
        String psCommand = "Start-Process -FilePath '" + url.replace("'", "''") + "'";
        return startProcess(new String[] {
            "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-Command", psCommand
        }, "PowerShell Start-Process");
    }

    private static boolean startProcess(String[] command, String label) {
        try {
            Process process = new ProcessBuilder(command)
                    .redirectErrorStream(true)
                    .start();
            // Give the shell a brief chance to reject an invalid command, but do not
            // wait for the browser itself because browser processes are long-lived.
            process.waitFor(300, java.util.concurrent.TimeUnit.MILLISECONDS);
            if (!process.isAlive()) {
                int exit = process.exitValue();
                if (exit != 0) {
                    System.err.println("[OceanVis] " + label + " exited with code " + exit + ".");
                    return false;
                }
            }
            System.out.println("[OceanVis] Browser launch requested via " + label + ".");
            return true;
        } catch (Exception e) {
            System.err.println("[OceanVis] " + label + " failed: " + e.getMessage());
            return false;
        }
    }
}
