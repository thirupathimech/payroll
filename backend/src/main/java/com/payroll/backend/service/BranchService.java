package com.payroll.backend.service;

import com.payroll.backend.domain.Branch;
import com.payroll.backend.dto.branch.BranchRequest;
import com.payroll.backend.dto.branch.BranchResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<BranchResponse> active() {
        ensureDefaultBranch(currentOrgService.orgCode());
        return branchRepository.findByOrgCodeAndActiveTrueOrderByName(currentOrgService.orgCode()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BranchResponse create(BranchRequest request) {
        String orgCode = currentOrgService.orgCode();
        branchRepository.findByOrgCodeAndNameIgnoreCase(orgCode, request.name().trim()).ifPresent(existing -> {
            throw new BadRequestException("Branch name already exists");
        });

        Branch branch = new Branch();
        branch.setOrgCode(orgCode);
        branch.setName(request.name().trim());
        branch.setCode(request.code() == null ? null : request.code().trim().toUpperCase());
        Branch saved = branchRepository.save(branch);
        auditService.log("BRANCH_CREATED", "Branch", saved.getId(), saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public Branch ensureDefaultBranch(String orgCode) {
        return branchRepository.findByOrgCodeAndNameIgnoreCase(orgCode, "Main Branch")
                .orElseGet(() -> {
                    Branch branch = new Branch();
                    branch.setOrgCode(orgCode);
                    branch.setName("Main Branch");
                    branch.setCode("MAIN");
                    return branchRepository.save(branch);
                });
    }

    private BranchResponse toResponse(Branch branch) {
        return new BranchResponse(
                branch.getId(),
                branch.getName(),
                branch.getCode(),
                branch.isActive(),
                branch.getCreatedAt(),
                branch.getUpdatedAt()
        );
    }
}
