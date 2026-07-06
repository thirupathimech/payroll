package com.payroll.backend.service;

import com.payroll.backend.domain.Shift;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.shift.ShiftRequest;
import com.payroll.backend.dto.shift.ShiftResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<ShiftResponse> search(String search, Boolean active, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        return PageResponse.from(shiftRepository
                .search(currentOrgService.orgCode(), blankToNull(search), active, pageable)
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public List<ShiftResponse> active() {
        return shiftRepository.findByOrgCodeAndActiveTrueOrderByName(currentOrgService.orgCode()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ShiftResponse create(ShiftRequest request) {
        validateDuration(request);
        ensureUniqueCode(request.code(), null);
        Shift shift = new Shift();
        shift.setOrgCode(currentOrgService.orgCode());
        apply(request, shift);
        Shift saved = shiftRepository.save(shift);
        auditService.log("SHIFT_CREATED", "Shift", saved.getId(), saved.getCode());
        return toResponse(saved);
    }

    @Transactional
    public ShiftResponse update(Long id, ShiftRequest request) {
        validateDuration(request);
        Shift shift = findShift(id);
        ensureUniqueCode(request.code(), id);
        apply(request, shift);
        Shift saved = shiftRepository.save(shift);
        auditService.log("SHIFT_UPDATED", "Shift", saved.getId(), saved.getCode());
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Shift shift = findShift(id);
        shift.setActive(false);
        shiftRepository.save(shift);
        auditService.log("SHIFT_DEACTIVATED", "Shift", shift.getId(), shift.getCode());
    }

    private Shift findShift(Long id) {
        return shiftRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));
    }

    private void apply(ShiftRequest request, Shift shift) {
        shift.setName(request.name().trim());
        shift.setCode(request.code().trim().toUpperCase());
        shift.setStartTime(request.startTime());
        shift.setDurationHours(request.durationHours());
        shift.setDurationMinutes(request.durationMinutes());
        shift.setActive(request.active() == null || request.active());
    }

    private void ensureUniqueCode(String code, Long currentId) {
        shiftRepository.findByOrgCodeAndCodeIgnoreCase(currentOrgService.orgCode(), code).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Shift code already exists");
            }
        });
    }

    private void validateDuration(ShiftRequest request) {
        if ((request.durationHours() == null || request.durationHours() == 0)
                && (request.durationMinutes() == null || request.durationMinutes() == 0)) {
            throw new BadRequestException("Shift duration must be greater than zero");
        }
    }

    private ShiftResponse toResponse(Shift shift) {
        return new ShiftResponse(
                shift.getId(),
                shift.getName(),
                shift.getCode(),
                shift.getStartTime(),
                shift.getDurationHours(),
                shift.getDurationMinutes(),
                shift.isActive(),
                shift.getCreatedAt(),
                shift.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
