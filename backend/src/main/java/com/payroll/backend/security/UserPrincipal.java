package com.payroll.backend.security;

import com.payroll.backend.domain.AppUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public record UserPrincipal(
        Long id,
        String orgCode,
        String username,
        String email,
        String fullName,
        String password,
        Collection<? extends GrantedAuthority> authorities,
        boolean enabled
) implements UserDetails {

    public static UserPrincipal from(AppUser user) {
        return new UserPrincipal(
                user.getId(),
                user.getOrgCode(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
                user.isEnabled()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}
