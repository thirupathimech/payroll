package com.payroll.backend.controller;

import com.payroll.backend.dto.report.CalendarOffReportRow;
import com.payroll.backend.dto.report.CalendarOffType;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.CalendarOffReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/my-calendar-off")
public class MyCalendarOffController {

    private final CalendarOffReportService calendarOffReportService;

    @GetMapping
    public List<CalendarOffReportRow> list(
            @RequestParam CalendarOffType type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return calendarOffReportService.myCalendarOff(type, from, to, principal);
    }
}
