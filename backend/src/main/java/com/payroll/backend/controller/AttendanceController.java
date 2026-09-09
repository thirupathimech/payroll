package com.payroll.backend.controller;

import com.payroll.backend.dto.attendance.AttendanceRequest;
import com.payroll.backend.dto.attendance.AttendanceResponse;
import com.payroll.backend.dto.attendance.AttendanceSettingsRequest;
import com.payroll.backend.dto.attendance.AttendanceSettingsResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping("/settings")
    public AttendanceSettingsResponse settings() {
        return attendanceService.getSettings();
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public AttendanceSettingsResponse update(@Valid @RequestBody AttendanceSettingsRequest request) {
        return attendanceService.updateSettings(request);
    }

    @GetMapping
    public List<AttendanceResponse> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return attendanceService.list(from, to, principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public AttendanceResponse save(
            @Valid @RequestBody AttendanceRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return attendanceService.save(request, principal);
    }
}
