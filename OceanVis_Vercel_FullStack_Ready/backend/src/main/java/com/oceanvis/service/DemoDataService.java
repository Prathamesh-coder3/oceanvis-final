package com.oceanvis.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class DemoDataService {

    private static final double LAT_MIN = -10.0;
    private static final double LAT_MAX = 30.0;
    private static final double LON_MIN = 55.0;
    private static final double LON_MAX = 95.0;
    private static final int GRID_SIZE = 20;

    @Cacheable("demoDataset")
    public Map<String, Object> getDemoDataset() {
        Map<String, Object> dataset = new LinkedHashMap<>();
        dataset.put("name", "OceanVis Demo Dataset");
        dataset.put("region", "Indian Ocean / Arabian Sea / Bay of Bengal");
        dataset.put("mode", "DEMO");
        dataset.put("timeAxis", generateTimeAxis());
        dataset.put("depthAxis", List.of(0, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000));
        dataset.put("latMin", LAT_MIN);
        dataset.put("latMax", LAT_MAX);
        dataset.put("lonMin", LON_MIN);
        dataset.put("lonMax", LON_MAX);
        dataset.put("gridSize", GRID_SIZE);
        dataset.put("variables", generateVariableMetadata());
        return dataset;
    }

    @Cacheable("demoObservations")
    public List<Map<String, Object>> getDemoObservations() {
        List<Map<String, Object>> obs = new ArrayList<>();
        obs.add(createObs("TB07593", "ARGO Float", 12.5, 72.1, "2024-01-15", 2000, List.of("temperature","salinity","oxygen")));
        obs.add(createObs("TB07594", "ARGO Float", 18.3, 65.2, "2024-01-15", 2000, List.of("temperature","salinity")));
        obs.add(createObs("TB07595", "ARGO Float", 8.7, 78.4, "2024-01-15", 1500, List.of("temperature","salinity","oxygen","chlorophyll")));
        obs.add(createObs("TB07596", "ARGO Float", 15.1, 60.8, "2024-01-14", 2000, List.of("temperature","salinity")));
        obs.add(createObs("TB07597", "ARGO Float", 22.4, 68.3, "2024-01-14", 1800, List.of("temperature","salinity","oxygen")));
        obs.add(createObs("GL001", "Glider", 10.2, 74.5, "2024-01-15", 500, List.of("temperature","salinity","chlorophyll")));
        obs.add(createObs("GL002", "Glider", 14.8, 71.2, "2024-01-15", 600, List.of("temperature","salinity","oxygen")));
        obs.add(createObs("CTD001", "CTD Station", 16.5, 82.3, "2024-01-15", 1000, List.of("temperature","salinity","oxygen","nutrients")));
        obs.add(createObs("CTD002", "CTD Station", 11.3, 77.8, "2024-01-14", 800, List.of("temperature","salinity")));
        obs.add(createObs("CTD003", "CTD Station", 20.1, 70.4, "2024-01-13", 1200, List.of("temperature","salinity","oxygen")));
        obs.add(createObs("BGC001", "BGC Sensor", 9.6, 80.1, "2024-01-15", 300, List.of("chlorophyll","oxygen","nitrate")));
        obs.add(createObs("BGC002", "BGC Sensor", 17.2, 63.5, "2024-01-15", 200, List.of("chlorophyll","oxygen")));
        obs.add(createObs("MR001", "Mooring", 0.0, 80.5, "2024-01-15", 500, List.of("temperature","salinity","currents")));
        obs.add(createObs("MR002", "Mooring", 15.0, 90.0, "2024-01-15", 700, List.of("temperature","salinity")));
        obs.add(createObs("BY001", "Buoy", 6.8, 73.2, "2024-01-15", 5, List.of("temperature","wind","wave")));
        obs.add(createObs("BY002", "Buoy", 24.5, 67.1, "2024-01-15", 5, List.of("temperature","wind")));
        return obs;
    }

    @Cacheable("demoAlerts")
    public List<Map<String, Object>> getDemoAlerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();
        alerts.add(createAlert("ALT001", "High Ocean Temperature", "DEMO ALERT: SST anomaly +2.3C in Arabian Sea", "High", "Arabian Sea", "2 hours ago", "temperature"));
        alerts.add(createAlert("ALT002", "Strong Surface Currents", "DEMO ALERT: Current speed 1.8 m/s detected", "Moderate", "Bay of Bengal", "4 hours ago", "currents"));
        alerts.add(createAlert("ALT003", "Model vs Observation Deviation", "DEMO ALERT: RMSE > 1.5C threshold exceeded", "Info", "10N-15N, 70E-75E", "8 hours ago", "comparison"));
        alerts.add(createAlert("ALT004", "Low Chlorophyll-a", "DEMO ALERT: Chl-a below seasonal mean by 40%", "Low", "Indian Ocean", "12 hours ago", "chlorophyll"));
        alerts.add(createAlert("ALT005", "Data Source Reconnected", "SIMULATED ALERT: ARGO float TB07593 reconnected", "Info", "Arabian Sea", "1 day ago", "system"));
        return alerts;
    }

    @Cacheable("dataSources")
    public List<Map<String, Object>> getDataSources() {
        List<Map<String, Object>> sources = new ArrayList<>();
        sources.add(createSource("HYCOM", "Ocean Model", "DEMO", "Global 1/12 degree HYCOM model"));
        sources.add(createSource("ROMS", "Ocean Model", "DEMO", "Regional ROMS model"));
        sources.add(createSource("ARGO", "Float Network", "DEMO", "245 active floats"));
        sources.add(createSource("GLIDER", "Glider Network", "DEMO", "18 active missions"));
        sources.add(createSource("CTD", "Hydrography", "DEMO", "56 recent profiles"));
        sources.add(createSource("BGC", "Biogeochemistry", "DEMO", "Chemical sensors"));
        sources.add(createSource("MOORING", "Fixed Platform", "DEMO", "Long-term stations"));
        sources.add(createSource("BUOY", "Surface Buoy", "DEMO", "42 live stations"));
        sources.add(createSource("WMS", "OGC Service", "UNAVAILABLE", "External WMS provider"));
        sources.add(createSource("WCS", "OGC Service", "UNAVAILABLE", "External WCS provider"));
        return sources;
    }

    @Cacheable("overviewStats")
    public Map<String, Object> getOverviewStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("oceanModels", mapOf("count", 3, "label", "Active Datasets"));
        stats.put("argoFloats", mapOf("count", 245, "label", "Live Stations"));
        stats.put("gliders", mapOf("count", 18, "label", "Active Missions"));
        stats.put("ctdStations", mapOf("count", 56, "label", "Recent Profiles"));
        stats.put("buoys", mapOf("count", 42, "label", "Live Stations"));
        stats.put("activeAlerts", mapOf("count", 4, "label", "View Alerts"));
        stats.put("bgcSensors", mapOf("count", 12, "label", "Active Sensors"));
        return stats;
    }

    public Map<String, Object> getModelSlice(String variable, int depthIndex, int timeIndex) {
        Random rng = new Random(variable.hashCode() + depthIndex * 100L + timeIndex * 10000L);
        int n = GRID_SIZE;
        double[][] raw = new double[n][n];
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                raw[i][j] = rng.nextGaussian();
        double[] range = getVariableRange(variable);
        double min = range[0], max = range[1];
        double[][] grid = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                double sum = 0; int cnt = 0;
                for (int di = -2; di <= 2; di++)
                    for (int dj = -2; dj <= 2; dj++) {
                        int ni2 = i + di, nj = j + dj;
                        if (ni2 >= 0 && ni2 < n && nj >= 0 && nj < n) { sum += raw[ni2][nj]; cnt++; }
                    }
                grid[i][j] = Math.max(min, Math.min(max, min + (sum / cnt + 2.5) / 5.0 * (max - min)));
                grid[i][j] = Math.round(grid[i][j] * 100.0) / 100.0;
            }
        }
        List<List<Double>> flatGrid = new ArrayList<>();
        for (double[] row : grid) {
            List<Double> r = new ArrayList<>();
            for (double v : row) r.add(v);
            flatGrid.add(r);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("variable", variable);
        result.put("depthIndex", depthIndex);
        result.put("timeIndex", timeIndex);
        result.put("latMin", LAT_MIN);
        result.put("latMax", LAT_MAX);
        result.put("lonMin", LON_MIN);
        result.put("lonMax", LON_MAX);
        result.put("gridSize", n);
        result.put("data", flatGrid);
        result.put("min", min);
        result.put("max", max);
        result.put("unit", getVariableUnit(variable));
        return result;
    }

    public Map<String, Object> getObservationProfile(String id) {
        Random rng = new Random(id.hashCode());
        List<Map<String, Object>> profile = new ArrayList<>();
        int[] depths = {0, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000};
        for (int d : depths) {
            Map<String, Object> pt = new LinkedHashMap<>();
            pt.put("depth", d);
            pt.put("temperatureObs", Math.round((28.5 - d * 0.012 + rng.nextGaussian() * 0.3) * 10.0) / 10.0);
            pt.put("temperatureModel", Math.round((28.5 - d * 0.012 + rng.nextGaussian() * 0.5) * 10.0) / 10.0);
            pt.put("salinityObs", Math.round((34.5 + d * 0.002 + rng.nextGaussian() * 0.1) * 100.0) / 100.0);
            pt.put("salinityModel", Math.round((34.5 + d * 0.002 + rng.nextGaussian() * 0.15) * 100.0) / 100.0);
            pt.put("oxygenObs", Math.round((210 - d * 0.05 + rng.nextGaussian() * 5) * 10.0) / 10.0);
            pt.put("oxygenModel", Math.round((210 - d * 0.05 + rng.nextGaussian() * 8) * 10.0) / 10.0);
            profile.add(pt);
        }
        return mapOf("id", id, "profile", profile);
    }

    public Map<String, Object> getModelObservationComparison(String variable) {
        Random rng = new Random(variable.hashCode() + 42L);
        List<Map<String, Object>> data = new ArrayList<>();
        double[] range = getVariableRange(variable);
        for (int i = 0; i < 50; i++) {
            double obs = range[0] + rng.nextDouble() * (range[1] - range[0]);
            double mod = obs + rng.nextGaussian() * (range[1] - range[0]) * 0.05;
            Map<String, Object> pt = new LinkedHashMap<>();
            pt.put("obs", Math.round(obs * 100.0) / 100.0);
            pt.put("model", Math.round(mod * 100.0) / 100.0);
            data.add(pt);
        }
        double bias = data.stream().mapToDouble(d -> (Double) d.get("model") - (Double) d.get("obs")).average().orElse(0);
        double mae = data.stream().mapToDouble(d -> Math.abs((Double) d.get("model") - (Double) d.get("obs"))).average().orElse(0);
        double rmse = Math.sqrt(data.stream().mapToDouble(d -> Math.pow((Double) d.get("model") - (Double) d.get("obs"), 2)).average().orElse(0));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("variable", variable);
        result.put("data", data);
        result.put("bias", Math.round(bias * 100.0) / 100.0);
        result.put("mae", Math.round(mae * 100.0) / 100.0);
        result.put("rmse", Math.round(rmse * 100.0) / 100.0);
        result.put("correlation", 0.92);
        return result;
    }

    public Map<String, Object> getTimeSeries(String variable, double lat, double lon) {
        Random rng = new Random((long)(lat * 100 + lon * 10));
        double[] range = getVariableRange(variable);
        double base = (range[0] + range[1]) / 2;
        String[] months = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};
        List<Map<String, Object>> series = new ArrayList<>();
        for (int m = 0; m < 12; m++) {
            double seasonal = Math.sin(m * Math.PI / 6) * (range[1] - range[0]) * 0.15;
            Map<String, Object> pt = new LinkedHashMap<>();
            pt.put("time", "2024-" + months[m]);
            pt.put("observation", Math.round((base + seasonal + rng.nextGaussian() * (range[1] - range[0]) * 0.03) * 100.0) / 100.0);
            pt.put("model", Math.round((base + seasonal + rng.nextGaussian() * (range[1] - range[0]) * 0.04) * 100.0) / 100.0);
            series.add(pt);
        }
        return mapOf("variable", variable, "lat", lat, "lon", lon, "series", series, "unit", getVariableUnit(variable));
    }

    public Map<String, Object> getTransect(String variable) {
        Random rng = new Random(variable.hashCode() + 99L);
        int nx = 30, nz = 15;
        double[] range = getVariableRange(variable);
        List<List<Double>> grid = new ArrayList<>();
        for (int z = 0; z < nz; z++) {
            List<Double> row = new ArrayList<>();
            double depthFactor = 1 - (double) z / nz;
            for (int x = 0; x < nx; x++) {
                row.add(Math.round((range[0] + (range[1] - range[0]) * (depthFactor * 0.7 + rng.nextDouble() * 0.3)) * 100.0) / 100.0);
            }
            grid.add(row);
        }
        List<Double> distances = new ArrayList<>();
        for (int i = 0; i < nx; i++) distances.add(Math.round(i * 1000.0 / nx * 10.0) / 10.0);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("variable", variable);
        result.put("data", grid);
        result.put("distances", distances);
        result.put("depths", List.of(0,10,25,50,75,100,150,200,300,500,750,1000,1500,2000,3000));
        result.put("min", range[0]);
        result.put("max", range[1]);
        result.put("unit", getVariableUnit(variable));
        return result;
    }

    // ===== Helpers =====

    @SuppressWarnings("unchecked")
    private <K, V> Map<K, V> mapOf(Object... args) {
        Map<Object, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < args.length - 1; i += 2) map.put(args[i], args[i + 1]);
        return (Map<K, V>) map;
    }

    private List<Map<String, Object>> generateTimeAxis() {
        List<Map<String, Object>> axis = new ArrayList<>();
        String[] dates = {"2024-01-01","2024-01-08","2024-01-15","2024-01-22","2024-02-01","2024-02-08","2024-02-15"};
        int i = 0;
        for (String d : dates) { axis.add(mapOf("index", i++, "date", d, "label", d)); }
        return axis;
    }

    private List<Map<String, Object>> generateVariableMetadata() {
        List<Map<String, Object>> vars = new ArrayList<>();
        vars.add(varMeta("temperature","Sea Surface Temperature","C",18.0,31.0,"thermal"));
        vars.add(varMeta("salinity","Salinity","PSU",32.0,38.0,"haline"));
        vars.add(varMeta("currents","Currents (U/V)","m/s",0.0,2.0,"speed"));
        vars.add(varMeta("chlorophyll","Chlorophyll-a","mg/m3",0.01,3.0,"algae"));
        vars.add(varMeta("mld","Mixed Layer Depth","m",10.0,120.0,"deep"));
        vars.add(varMeta("ssh","Sea Surface Height","m",-0.5,0.5,"balance"));
        vars.add(varMeta("oxygen","Dissolved Oxygen","umol/kg",150.0,280.0,"matter"));
        vars.add(varMeta("nutrients","Nutrients","umol/L",0.0,30.0,"turbid"));
        return vars;
    }

    private Map<String, Object> varMeta(String id, String name, String unit, double min, double max, String colormap) {
        return mapOf("id",id,"name",name,"unit",unit,"min",min,"max",max,"colormap",colormap);
    }

    private Map<String, Object> createObs(String id, String type, double lat, double lon, String date, int maxDepth, List<String> vars) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id); m.put("type", type); m.put("lat", lat); m.put("lon", lon);
        m.put("date", date); m.put("maxDepth", maxDepth); m.put("variables", vars);
        return m;
    }

    private Map<String, Object> createAlert(String id, String title, String msg, String level, String region, String time, String category) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id); m.put("title", title); m.put("message", msg);
        m.put("level", level); m.put("region", region); m.put("time", time);
        m.put("category", category); m.put("isDemo", true);
        return m;
    }

    private Map<String, Object> createSource(String id, String type, String status, String desc) {
        return mapOf("id", id, "type", type, "status", status, "description", desc);
    }

    private double[] getVariableRange(String variable) {
        return switch (variable) {
            case "salinity" -> new double[]{32.0, 38.0};
            case "chlorophyll" -> new double[]{0.01, 3.0};
            case "mld" -> new double[]{10.0, 120.0};
            case "ssh" -> new double[]{-0.5, 0.5};
            case "oxygen" -> new double[]{150.0, 280.0};
            case "nutrients" -> new double[]{0.0, 30.0};
            case "currents" -> new double[]{0.0, 2.0};
            default -> new double[]{18.0, 31.0};
        };
    }

    private String getVariableUnit(String variable) {
        return switch (variable) {
            case "salinity" -> "PSU";
            case "chlorophyll" -> "mg/m3";
            case "mld" -> "m";
            case "ssh" -> "m";
            case "oxygen" -> "umol/kg";
            case "nutrients" -> "umol/L";
            case "currents" -> "m/s";
            default -> "degC";
        };
    }
}