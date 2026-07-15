package com.payroll.backend.service;

import com.payroll.backend.domain.Branch;
import com.payroll.backend.dto.branch.BranchRequest;
import com.payroll.backend.dto.branch.BranchResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
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

    @Transactional
    public List<BranchResponse> active() {
        ensureDefaultBranch(currentOrgService.orgCode());
        return branchRepository.findByOrgCodeAndActiveTrueOrderByName(currentOrgService.orgCode()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BranchResponse create(BranchRequest request) {
        String orgCode = currentOrgService.orgCode();
        ensureUniqueName(request.name(), null);
        ensureUniqueCode(request.code(), null);

        Branch branch = new Branch();
        branch.setOrgCode(orgCode);
        apply(request, branch);
        Branch saved = branchRepository.save(branch);
        auditService.log("BRANCH_CREATED", "Branch", saved.getId(), saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public BranchResponse update(Long id, BranchRequest request) {
        Branch branch = findBranch(id);
        ensureUniqueName(request.name(), id);
        ensureUniqueCode(request.code(), id);
        apply(request, branch);
        Branch saved = branchRepository.save(branch);
        auditService.log("BRANCH_UPDATED", "Branch", saved.getId(), saved.getName());
        return toResponse(saved);
    }

    public Branch ensureDefaultBranch(String orgCode) {
        return branchRepository.findByOrgCodeAndNameIgnoreCase(orgCode, "Main Branch")
                .or(() -> branchRepository.findByOrgCodeAndCodeIgnoreCase(orgCode, "MAIN"))
                .or(() -> branchRepository.findFirstByOrgCodeOrderById(orgCode))
                .orElseGet(() -> {
                    Branch branch = new Branch();
                    branch.setOrgCode(orgCode);
                    branch.setName("Main Branch");
                    branch.setCode("MAIN");
                    return branchRepository.save(branch);
                });
    }

    private Branch findBranch(Long id) {
        return branchRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
    }

    private void apply(BranchRequest request, Branch branch) {
        branch.setName(request.name().trim());
        branch.setCode(request.code() == null || request.code().isBlank() ? null : request.code().trim().toUpperCase());
    }

    private void ensureUniqueName(String name, Long currentId) {
        branchRepository.findByOrgCodeAndNameIgnoreCase(currentOrgService.orgCode(), name).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Branch name already exists");
            }
        });
    }

    private void ensureUniqueCode(String code, Long currentId) {
        if (code == null || code.isBlank()) {
            return;
        }
        branchRepository.findByOrgCodeAndCodeIgnoreCase(currentOrgService.orgCode(), code.trim()).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Branch code already exists");
            }
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
