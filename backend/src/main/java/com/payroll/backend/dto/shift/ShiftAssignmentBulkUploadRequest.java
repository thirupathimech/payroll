package com.payroll.backend.dto.shift;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ShiftAssignmentBulkUploadRequest(
        boolean overrideExisting,
        @NotEmpty(message = "Add at least one shift assignment")
        @Size(max = 500, message = "A maximum of 500 shift rows can be uploaded at once")
        List<@Valid ShiftAssignmentBulkUploadRowRequest> assignments
) {
}
