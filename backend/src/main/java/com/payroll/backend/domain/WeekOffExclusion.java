package com.payroll.backend.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @Entity
@Table(name = "week_off_exclusions", uniqueConstraints = @UniqueConstraint(
        name = "uk_week_off_exclusion_scope_date",
        columnNames = {"org_code", "branch_id", "department_id", "designation_id", "excluded_date"}))
public class WeekOffExclusion extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "org_code", nullable = false, length = 3) private String orgCode;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "branch_id", nullable = false) private Branch branch;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "department_id", nullable = false) private Department department;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "designation_id", nullable = false) private Designation designation;
    @Column(name = "excluded_date", nullable = false) private LocalDate excludedDate;
}
