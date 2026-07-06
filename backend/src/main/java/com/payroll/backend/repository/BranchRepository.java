package com.payroll.backend.repository;

import com.payroll.backend.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    Optional<Branch> findByOrgCodeAndId(String orgCode, Long id);

    Optional<Branch> findByOrgCodeAndNameIgnoreCase(String orgCode, String name);

    List<Branch> findByOrgCodeAndActiveTrueOrderByName(String orgCode);
}
