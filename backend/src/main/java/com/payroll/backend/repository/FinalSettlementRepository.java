package com.payroll.backend.repository;

import com.payroll.backend.domain.FinalSettlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FinalSettlementRepository extends JpaRepository<FinalSettlement, Long> {
    Optional<FinalSettlement> findByOrgCodeAndResignationId(String orgCode, Long resignationId);
}
