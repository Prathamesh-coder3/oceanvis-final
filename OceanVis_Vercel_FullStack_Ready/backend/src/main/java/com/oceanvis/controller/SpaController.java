package com.oceanvis.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    // Forward non-API client routes to React SPA index.html
    @RequestMapping(value = {
        "/overview", "/map", "/globe", "/alerts", "/data-sources",
        "/visualization/**", "/analysis/**", "/interop/**", "/output/**",
        "/settings", "/help", "/import", "/reports"
    })
    public String forwardToSpa() {
        return "forward:/index.html";
    }
}
