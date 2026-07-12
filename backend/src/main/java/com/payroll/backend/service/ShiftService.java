package com.payroll.backend.service;

import com.payroll.backend.domain.Shift;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.shift.ShiftRequest;
import com.payroll.backend.dto.shift.ShiftResponse;
import com.payroll.backend.dto.shift.ShiftSegmentRequest;
import com.payroll.backend.dto.shift.ShiftSegmentResponse;
import com.payroll.backend.dto.shift.ShiftSegmentType;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.ShiftRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private static final TypeReference<List<ShiftSegmentResponse>> SHIFT_SEGMENTS_TYPE = new TypeReference<>() {
    };

    private final ShiftRepository shiftRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

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
        List<ShiftSegmentRequest> segments = normalizeSegments(request);
        ensureUniqueCode(request.code(), null);
        Shift shift = new Shift();
        shift.setOrgCode(currentOrgService.orgCode());
        apply(request, shift, segments);
        Shift saved = shiftRepository.save(shift);
        auditService.log("SHIFT_CREATED", "Shift", saved.getId(), saved.getCode());
        return toResponse(saved);
    }

    @Transactional
    public ShiftResponse update(Long id, ShiftRequest request) {
        List<ShiftSegmentRequest> segments = normalizeSegments(request);
        Shift shift = findShift(id);
        ensureUniqueCode(request.code(), id);
        apply(request, shift, segments);
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

    private void apply(ShiftRequest request, Shift shift, List<ShiftSegmentRequest> segments) {
        int totalMinutes = totalMinutes(segments);
        shift.setName(request.name().trim());
        shift.setCode(request.code().trim().toUpperCase());
        shift.setStartTime(request.startTime());
        shift.setDurationHours(totalMinutes / 60);
        shift.setDurationMinutes(totalMinutes % 60);
        shift.setSegmentsJson(writeSegments(segments));
        shift.setActive(request.active() == null || request.active());
    }

    private void ensureUniqueCode(String code, Long currentId) {
        shiftRepository.findByOrgCodeAndCodeIgnoreCase(currentOrgService.orgCode(), code).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Shift code already exists");
            }
        });
    }

    private List<ShiftSegmentRequest> normalizeSegments(ShiftRequest request) {
        List<ShiftSegmentRequest> rawSegments = request.segments();
        if (rawSegments == null || rawSegments.isEmpty()) {
            if (request.durationHours() == null || request.durationMinutes() == null) {
                throw new BadRequestException("Shift duration is required");
            }
            rawSegments = List.of(new ShiftSegmentRequest(
                    ShiftSegmentType.WORK,
                    request.durationHours(),
                    request.durationMinutes(),
                    0
            ));
        }

        List<ShiftSegmentRequest> segments = new ArrayList<>();
        boolean hasWorkSegment = false;
        int totalMinutes = 0;

        for (ShiftSegmentRequest segment : rawSegments) {
            int hours = segment.hours() == null ? 0 : segment.hours();
            int minutes = segment.minutes() == null ? 0 : segment.minutes();
            int segmentMinutes = hours * 60 + minutes;
            if (segment.type() == null) {
                throw new BadRequestException("Shift segment type is required");
            }
            if (segmentMinutes <= 0) {
                throw new BadRequestException("Shift segment duration must be greater than zero");
            }

            int graceMinutes = segment.type() == ShiftSegmentType.WORK
                    ? Math.max(0, segment.graceMinutes() == null ? 0 : segment.graceMinutes())
                    : 0;
            hasWorkSegment = hasWorkSegment || segment.type() == ShiftSegmentType.WORK;
            totalMinutes += segmentMinutes;
            segments.add(new ShiftSegmentRequest(segment.type(), hours, minutes, graceMinutes));
        }

        if (!hasWorkSegment) {
            throw new BadRequestException("Shift must include at least one work segment");
        }
        if (totalMinutes <= 0) {
            throw new BadRequestException("Shift duration must be greater than zero");
        }
        if (totalMinutes > (23 * 60) + 59) {
            throw new BadRequestException("Shift duration cannot exceed 23 hours 59 minutes");
        }

        return segments;
    }

    private int totalMinutes(List<ShiftSegmentRequest> segments) {
        return segments.stream()
                .mapToInt(segment -> segment.hours() * 60 + segment.minutes())
                .sum();
    }

    private String writeSegments(List<ShiftSegmentRequest> segments) {
        List<ShiftSegmentResponse> payload = segments.stream()
                .map(segment -> new ShiftSegmentResponse(
                        segment.type(),
                        segment.hours(),
                        segment.minutes(),
                        segment.graceMinutes() == null ? 0 : segment.graceMinutes()
                ))
                .toList();
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new BadRequestException("Unable to save shift segments");
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
                readSegments(shift),
                shift.isActive(),
                shift.getCreatedAt(),
                shift.getUpdatedAt()
        );
    }

    private List<ShiftSegmentResponse> readSegments(Shift shift) {
        if (shift.getSegmentsJson() == null || shift.getSegmentsJson().isBlank()) {
            return List.of(new ShiftSegmentResponse(
                    ShiftSegmentType.WORK,
                    shift.getDurationHours(),
                    shift.getDurationMinutes(),
                    0
            ));
        }

        try {
            return objectMapper.readValue(shift.getSegmentsJson(), SHIFT_SEGMENTS_TYPE);
        } catch (JsonProcessingException exception) {
            return List.of(new ShiftSegmentResponse(
                    ShiftSegmentType.WORK,
                    shift.getDurationHours(),
                    shift.getDurationMinutes(),
                    0
            ));
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
