package com.oceanvis.controller;

import com.oceanvis.service.DemoDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired
    private DemoDataService demoDataService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "application", "OceanVis",
            "version", "1.0.0",
            "mode", "DEMO",
            "timestamp", System.currentTimeMillis()
        ));
    }

    @GetMapping("/demo/dataset")
    public ResponseEntity<Map<String, Object>> getDemoDataset() {
        return ResponseEntity.ok(demoDataService.getDemoDataset());
    }

    @GetMapping("/demo/observations")
    public ResponseEntity<Object> getDemoObservations() {
        return ResponseEntity.ok(demoDataService.getDemoObservations());
    }

    @GetMapping("/demo/alerts")
    public ResponseEntity<Object> getDemoAlerts() {
        return ResponseEntity.ok(demoDataService.getDemoAlerts());
    }

    @GetMapping("/demo/sources")
    public ResponseEntity<Object> getDemoSources() {
        return ResponseEntity.ok(demoDataService.getDataSources());
    }

    @GetMapping("/demo/overview")
    public ResponseEntity<Object> getDemoOverview() {
        return ResponseEntity.ok(demoDataService.getOverviewStats());
    }

    @GetMapping("/demo/model-slice")
    public ResponseEntity<Object> getModelSlice(
            @RequestParam(defaultValue = "temperature") String variable,
            @RequestParam(defaultValue = "0") int depthIndex,
            @RequestParam(defaultValue = "0") int timeIndex) {
        return ResponseEntity.ok(demoDataService.getModelSlice(variable, depthIndex, timeIndex));
    }

    @GetMapping("/demo/profile/{observationId}")
    public ResponseEntity<Object> getProfile(@PathVariable String observationId) {
        return ResponseEntity.ok(demoDataService.getObservationProfile(observationId));
    }

    @GetMapping("/demo/comparison")
    public ResponseEntity<Object> getComparison(
            @RequestParam(defaultValue = "temperature") String variable) {
        return ResponseEntity.ok(demoDataService.getModelObservationComparison(variable));
    }

    @GetMapping("/demo/timeseries")
    public ResponseEntity<Object> getTimeSeries(
            @RequestParam(defaultValue = "temperature") String variable,
            @RequestParam(defaultValue = "12.5") double lat,
            @RequestParam(defaultValue = "72.1") double lon) {
        return ResponseEntity.ok(demoDataService.getTimeSeries(variable, lat, lon));
    }

    @GetMapping("/demo/transect")
    public ResponseEntity<Object> getTransect(
            @RequestParam(defaultValue = "temperature") String variable) {
        return ResponseEntity.ok(demoDataService.getTransect(variable));
    }

    @GetMapping("/data-status")
    public ResponseEntity<Map<String, Object>> dataStatus() {
        return ResponseEntity.ok(Map.of(
            "status", "READY",
            "dataMode", "DEMO",
            "providers", Map.of(
                "HYCOM", "SIMULATED",
                "ARGO", "SIMULATED",
                "GLIDER", "SIMULATED",
                "CTD", "SIMULATED",
                "BUOY", "SIMULATED"
            ),
            "cacheEnabled", true,
            "observationsLoaded", 16,
            "modelsLoaded", 4
        ));
    }

    @GetMapping("/datasets")
    public ResponseEntity<Object> getDatasets() {
        return ResponseEntity.ok(demoDataService.getDemoDataset());
    }
}
