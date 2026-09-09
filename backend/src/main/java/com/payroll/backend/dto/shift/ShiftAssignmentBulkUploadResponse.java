package com.payroll.backend.dto.shift;

import java.util.List;

public record ShiftAssignmentBulkUploadResponse(
        int uploadedRows,
        int savedAssignments,
        int replacedAssignments,
        List<ShiftAssignmentResponse> assignments
) {
}
