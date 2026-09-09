package com.payroll.backend.dto.salary;

/** Distinguishes an immediate package adjustment from a dated salary revision. */
public enum SalaryUpdateMode {
    ADJUST_CURRENT,
    CREATE_REVISION
}
