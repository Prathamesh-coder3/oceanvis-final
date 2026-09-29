package com.oceanvis.controller;

import com.oceanvis.service.OceanDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired
    private OceanDataService oceanDataService;

    @Value("${oceanvis.demo-mode:false}")
    private boolean demoMode;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "application", "OceanVis",
            "version", "1.0.0",
            "mode", demoMode ? "DEMO" : "LIVE",
            "timestamp", System.currentTimeMillis()
        ));
    }

    @GetMapping("/data-status")
    public ResponseEntity<Map<String, Object>> dataStatus() {
        return ResponseEntity.ok(oceanDataService.getDataStatus());
    }

    @GetMapping({"/datasets", "/demo/dataset"})
    public ResponseEntity<Map<String, Object>> getDatasets() {
        return ResponseEntity.ok(oceanDataService.getDatasetMetadata());
    }

    @GetMapping({"/observations", "/demo/observations"})
    public ResponseEntity<Object> getObservations() {
        return ResponseEntity.ok(oceanDataService.getRealObservations());
    }

    @GetMapping({"/alerts", "/demo/alerts"})
    public ResponseEntity<Object> getAlerts() {
        return ResponseEntity.ok(oceanDataService.getLiveAlerts());
    }

    @GetMapping({"/sources", "/demo/sources"})
    public ResponseEntity<Object> getSources() {
        return ResponseEntity.ok(oceanDataService.getDataSources());
    }

    @GetMapping({"/overview", "/demo/overview"})
    public ResponseEntity<Object> getOverview() {
        return ResponseEntity.ok(oceanDataService.getOverviewStats());
    }

    @GetMapping({"/model-slice", "/demo/model-slice", "/model/slice", "/ocean-data"})
    public ResponseEntity<Object> getModelSlice(
            @RequestParam(defaultValue = "temperature") String variable,
            @RequestParam(defaultValue = "0") int depthIndex,
            @RequestParam(defaultValue = "0") int timeIndex) {
        return ResponseEntity.ok(oceanDataService.getModelSlice(variable, depthIndex, timeIndex));
    }

    @GetMapping({"/profile/{observationId}", "/demo/profile/{observationId}"})
    public ResponseEntity<Object> getProfile(@PathVariable String observationId) {
        return ResponseEntity.ok(oceanDataService.getObservationProfile(observationId));
    }

    @GetMapping({"/comparison", "/demo/comparison"})
    public ResponseEntity<Object> getComparison(
            @RequestParam(defaultValue = "temperature") String variable) {
        return ResponseEntity.ok(oceanDataService.getModelObservationComparison(variable));
    }

    @GetMapping({"/timeseries", "/demo/timeseries"})
    public ResponseEntity<Object> getTimeSeries(
            @RequestParam(defaultValue = "temperature") String variable,
            @RequestParam(defaultValue = "12.5") double lat,
            @RequestParam(defaultValue = "72.1") double lon) {
        return ResponseEntity.ok(oceanDataService.getTimeSeries(variable, lat, lon));
    }

    @GetMapping({"/transect", "/demo/transect"})
    public ResponseEntity<Object> getTransect(
            @RequestParam(defaultValue = "temperature") String variable) {
        return ResponseEntity.ok(oceanDataService.getTransect(variable));
    }
}
