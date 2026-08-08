package com.payroll.backend.controller;

import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.holiday.HolidayRequest;
import com.payroll.backend.dto.holiday.HolidayResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.HolidayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/holidays")
public class HolidayController {
    private final HolidayService holidayService;

    @GetMapping
    public List<HolidayResponse> search(@AuthenticationPrincipal UserPrincipal principal) { return holidayService.search(principal); }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')")
    public HolidayResponse create(@Valid @RequestBody HolidayRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return holidayService.create(request, principal);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')")
    public MessageResponse delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        holidayService.delete(id, principal); return new MessageResponse("Holiday deleted");
    }
}
