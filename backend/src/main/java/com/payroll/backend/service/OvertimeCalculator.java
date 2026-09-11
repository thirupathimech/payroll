package com.payroll.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.domain.AttendanceRecord;
import com.payroll.backend.domain.Shift;
import com.payroll.backend.dto.shift.ShiftSegmentResponse;
import com.payroll.backend.dto.shift.ShiftSegmentType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Calculates the part of a completed punch that is not inside a scheduled work segment. */
@Component
@RequiredArgsConstructor
public class OvertimeCalculator {

    private static final TypeReference<List<ShiftSegmentResponse>> SHIFT_SEGMENTS_TYPE = new TypeReference<>() { };

    private final ObjectMapper objectMapper;

    public int punchOvertimeMinutes(Shift shift, LocalDate shiftDate, AttendanceRecord attendance) {
        if (attendance == null || attendance.getClockIn() == null || attendance.getClockOut() == null) {
            return 0;
        }

        LocalDate clockInDate = attendance.getClockInDate() == null ? attendance.getAttendanceDate() : attendance.getClockInDate();
        LocalDate clockOutDate = attendance.getClockOutDate() == null ? attendance.getAttendanceDate() : attendance.getClockOutDate();
        LocalDateTime punchStart = clockInDate.atTime(attendance.getClockIn());
        LocalDateTime punchEnd = clockOutDate.atTime(attendance.getClockOut());
        if (!punchEnd.isAfter(punchStart)) {
            return 0;
        }

        long punchMinutes = Duration.between(punchStart, punchEnd).toMinutes();
        long scheduledWorkMinutes = 0;
        LocalDateTime segmentStart = shiftDate.atTime(shift.getStartTime());
        for (ShiftSegmentResponse segment : segmentsFor(shift)) {
            int segmentMinutes = Math.max(0, (segment.hours() == null ? 0 : segment.hours()) * 60
                    + (segment.minutes() == null ? 0 : segment.minutes()));
            LocalDateTime segmentEnd = segmentStart.plusMinutes(segmentMinutes);
            if (segment.type() == ShiftSegmentType.WORK) {
                scheduledWorkMinutes += overlapMinutes(punchStart, punchEnd, segmentStart, segmentEnd);
            }
            segmentStart = segmentEnd;
        }

        return (int) Math.min(Integer.MAX_VALUE, Math.max(0, punchMinutes - scheduledWorkMinutes));
    }

    /** An overtime request can never increase the punch-supported duration. */
    public int eligibleMinutes(int requestedMinutes, int punchOvertimeMinutes) {
        return Math.min(Math.max(0, requestedMinutes), Math.max(0, punchOvertimeMinutes));
    }

    private long overlapMinutes(LocalDateTime firstStart, LocalDateTime firstEnd, LocalDateTime secondStart, LocalDateTime secondEnd) {
        LocalDateTime start = firstStart.isAfter(secondStart) ? firstStart : secondStart;
        LocalDateTime end = firstEnd.isBefore(secondEnd) ? firstEnd : secondEnd;
        return end.isAfter(start) ? Duration.between(start, end).toMinutes() : 0;
    }

    private List<ShiftSegmentResponse> segmentsFor(Shift shift) {
        if (shift.getSegmentsJson() != null && !shift.getSegmentsJson().isBlank()) {
            try {
                List<ShiftSegmentResponse> segments = objectMapper.readValue(shift.getSegmentsJson(), SHIFT_SEGMENTS_TYPE);
                if (segments != null && !segments.isEmpty()) {
                    return segments;
                }
            } catch (JsonProcessingException ignored) {
                // Legacy shifts without valid segment JSON are treated as one continuous work block.
            }
        }
        return List.of(new ShiftSegmentResponse(
                ShiftSegmentType.WORK,
                shift.getDurationHours(),
                shift.getDurationMinutes(),
                0
        ));
    }
}
