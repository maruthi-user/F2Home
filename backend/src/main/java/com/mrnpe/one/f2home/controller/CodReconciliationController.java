package com.mrnpe.one.f2home.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.service.CodReconciliationService;

@RestController
@RequestMapping("/api/f2home/admin/cod-reconciliation")
@PreAuthorize("hasRole('ADMIN')")
public class CodReconciliationController {
    private final CodReconciliationService reconciliation;

    public CodReconciliationController(CodReconciliationService reconciliation) {
        this.reconciliation = reconciliation;
    }

    @GetMapping
    public CodReconciliationService.Report report(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate through) {
        return reconciliation.report(from, through);
    }
}
