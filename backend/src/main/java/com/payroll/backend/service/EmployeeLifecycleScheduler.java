package com.payroll.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Keeps approved dated employment changes accurate even without an active user session. */
@Component
@RequiredArgsConstructor
public class EmployeeLifecycleScheduler {

    private final EmployeeTransferService employeeTransferService;
    private final ResignationService resignationService;

    @Scheduled(fixedDelayString = "${app.employee-lifecycle.sync-delay-ms:3600000}")
    public void applyDueEmploymentChanges() {
        employeeTransferService.applyApprovedTransfersDueForAllOrganizations();
        resignationService.applyDueResignationsForAllOrganizations();
    }
}
