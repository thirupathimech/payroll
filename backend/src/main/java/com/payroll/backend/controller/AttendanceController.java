package com.payroll.backend.controller;
import com.payroll.backend.dto.attendance.*; import com.payroll.backend.security.UserPrincipal; import com.payroll.backend.service.AttendanceService; import jakarta.validation.Valid; import lombok.RequiredArgsConstructor; import org.springframework.format.annotation.DateTimeFormat; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.annotation.AuthenticationPrincipal; import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/attendance")
public class AttendanceController {
 private final AttendanceService service;
 @GetMapping("/settings") public AttendanceSettingsResponse settings(){return service.getSettings();}
 @PutMapping("/settings") @PreAuthorize("hasAnyRole('ADMIN','HR')") public AttendanceSettingsResponse update(@Valid @RequestBody AttendanceSettingsRequest r){return service.updateSettings(r);}
 @GetMapping public List<AttendanceResponse> list(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,@AuthenticationPrincipal UserPrincipal principal){return service.list(from,to,principal);}
 @PostMapping @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')") public AttendanceResponse save(@Valid @RequestBody AttendanceRequest r,@AuthenticationPrincipal UserPrincipal principal){return service.save(r,principal);}
}
