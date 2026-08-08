package com.payroll.backend.controller;
import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.weekoff.*;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.WeekOffExclusionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/week-off-exclusions")
public class WeekOffExclusionController {
    private final WeekOffExclusionService service;
    @GetMapping public List<WeekOffExclusionResponse> search(@AuthenticationPrincipal UserPrincipal principal) { return service.search(principal); }
    @PostMapping @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')") public WeekOffExclusionResponse create(@Valid @RequestBody WeekOffExclusionRequest request, @AuthenticationPrincipal UserPrincipal principal) { return service.create(request, principal); }
    @DeleteMapping("/{id}") @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')") public MessageResponse delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) { service.delete(id, principal); return new MessageResponse("Week off exclusion deleted"); }
}
