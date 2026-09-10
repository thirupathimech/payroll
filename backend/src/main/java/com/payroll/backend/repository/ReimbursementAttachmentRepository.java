package com.payroll.backend.repository;

import com.payroll.backend.domain.ReimbursementAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReimbursementAttachmentRepository extends JpaRepository<ReimbursementAttachment, Long> {
    List<ReimbursementAttachment> findByOrgCodeAndReimbursementRequestIdOrderByUploadedAtAsc(String orgCode, Long reimbursementRequestId);

    Optional<ReimbursementAttachment> findByOrgCodeAndReimbursementRequestIdAndId(
            String orgCode, Long reimbursementRequestId, Long id
    );

    long countByOrgCodeAndReimbursementRequestId(String orgCode, Long reimbursementRequestId);
}
