package com.payroll.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "attendance_records",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_attendance_employee_date",
                columnNames = {"org_code", "employee_id", "attendance_date"}
        )
)
public class AttendanceRecord extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "clock_in_date")
    private LocalDate clockInDate;

    @Column(name = "clock_out_date")
    private LocalDate clockOutDate;

    private LocalTime clockIn;

    private LocalTime clockOut;

    @Column(nullable = false, length = 20)
    private String source;
}
