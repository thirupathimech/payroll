package com.payroll.backend.security;

import com.payroll.backend.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final AppUserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByEmail(username)
                .map(UserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    public UserDetails loadUserByUsernameAndOrgCode(String username, String orgCode) throws UsernameNotFoundException {
        return userRepository.findByOrgCodeAndUsernameIgnoreCase(orgCode, username)
                .map(UserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
