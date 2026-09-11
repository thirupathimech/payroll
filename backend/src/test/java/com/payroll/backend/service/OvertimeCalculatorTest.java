package com.payroll.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.domain.AttendanceRecord;
import com.payroll.backend.domain.Shift;
import com.payroll.backend.dto.shift.ShiftSegmentResponse;
import com.payroll.backend.dto.shift.ShiftSegmentType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OvertimeCalculatorTest {

    private final OvertimeCalculator calculator = new OvertimeCalculator(new ObjectMapper());
    private final LocalDate date = LocalDate.of(2026, 9, 10);

    @Test
    void countsAnUninterruptedBreakAndPostShiftWorkAsPunchOvertime() throws Exception {
        AttendanceRecord attendance = attendance(LocalTime.of(9, 0), LocalTime.of(19, 0));

        assertThat(calculator.punchOvertimeMinutes(shiftWithLunchBreak(), date, attendance)).isEqualTo(120);
    }

    @Test
    void capsCountedOvertimeAtTheLowerOfRequestedAndPunchSupportedTime() {
        assertThat(calculator.eligibleMinutes(180, 120)).isEqualTo(120);
        assertThat(calculator.eligibleMinutes(120, 180)).isEqualTo(120);
    }

    @Test
    void doesNotTreatRegularScheduledWorkAsOvertime() throws Exception {
        AttendanceRecord attendance = attendance(LocalTime.of(9, 0), LocalTime.of(18, 0));

        assertThat(calculator.punchOvertimeMinutes(continuousShift(), date, attendance)).isZero();
    }

    private AttendanceRecord attendance(LocalTime in, LocalTime out) {
        AttendanceRecord attendance = new AttendanceRecord();
        attendance.setAttendanceDate(date);
        attendance.setClockInDate(date);
        attendance.setClockOutDate(date);
        attendance.setClockIn(in);
        attendance.setClockOut(out);
        return attendance;
    }

    private Shift shiftWithLunchBreak() throws Exception {
        Shift shift = baseShift(9, 0);
        shift.setSegmentsJson(new ObjectMapper().writeValueAsString(List.of(
                new ShiftSegmentResponse(ShiftSegmentType.WORK, 4, 0, 0),
                new ShiftSegmentResponse(ShiftSegmentType.BREAK, 1, 0, 0),
                new ShiftSegmentResponse(ShiftSegmentType.WORK, 4, 0, 0)
        )));
        return shift;
    }

    private Shift continuousShift() throws Exception {
        Shift shift = baseShift(9, 0);
        shift.setSegmentsJson(new ObjectMapper().writeValueAsString(List.of(
                new ShiftSegmentResponse(ShiftSegmentType.WORK, 9, 0, 0)
        )));
        return shift;
    }

    private Shift baseShift(int hours, int minutes) {
        Shift shift = new Shift();
        shift.setStartTime(LocalTime.of(9, 0));
        shift.setDurationHours(hours);
        shift.setDurationMinutes(minutes);
        return shift;
    }
}
