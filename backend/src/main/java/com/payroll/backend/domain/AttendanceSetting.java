package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.AttendanceMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor @Entity @Table(name = "attendance_settings", uniqueConstraints = @UniqueConstraint(name="uk_attendance_settings_org", columnNames="org_code"))
public class AttendanceSetting extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name="org_code", nullable=false, length=3) private String orgCode;
    @Enumerated(EnumType.STRING) @Column(name="attendance_mode", nullable=false, length=20) private AttendanceMode attendanceMode = AttendanceMode.MANUAL;
    @Column(nullable=false) private boolean biometricEnabled;
    @Column(length=120) private String biometricName;
    @Column(length=300) private String biometricUrl;
    @Column(length=300) private String biometricApiKey;
}
