package com.payroll.backend.controller;

import com.payroll.backend.dto.attendance.AttendanceRequest;
import com.payroll.backend.dto.attendance.AttendanceResponse;
import com.payroll.backend.dto.attendance.AttendanceSettingsRequest;
import com.payroll.backend.dto.attendance.AttendanceSettingsResponse;
import com.payroll.backend.dto.attendance.MissingPunchCreateRequest;
import com.payroll.backend.dto.attendance.MissingPunchDecisionRequest;
import com.payroll.backend.dto.attendance.MissingPunchResponse;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.domain.enums.MissingPunchStatus;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.AttendanceService;
import com.payroll.backend.service.MissingPunchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    private final MissingPunchService missingPunchService;

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

    @GetMapping("/missing-punch-requests")
    public PageResponse<MissingPunchResponse> missingPunchRequests(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) MissingPunchStatus status,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return missingPunchService.search(search, status, mine, page, size, principal);
    }

    @PostMapping("/missing-punch-requests")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public MissingPunchResponse createMissingPunchRequest(
            @Valid @RequestBody MissingPunchCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return missingPunchService.create(request, principal);
    }

    @PatchMapping("/missing-punch-requests/{id}/decision")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public MissingPunchResponse decideMissingPunchRequest(
            @PathVariable Long id,
            @Valid @RequestBody MissingPunchDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return missingPunchService.decide(id, request, principal);
    }
}
