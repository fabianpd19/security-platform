-- Seeding initial data for security platform
-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator', '["*"]'),
('security_analyst', 'Security Analyst', '["security:read", "security:write", "vulnerabilities:read", "events:read"]'),
('user', 'Regular User', '["profile:read", "profile:write"]'),
('auditor', 'Security Auditor', '["security:read", "vulnerabilities:read", "events:read", "reports:read"]');

-- Insert default admin user (password: Admin123!)
-- Hash generated with bcrypt for 'Admin123!'
INSERT INTO users (email, name, password_hash) VALUES
('admin@security.com', 'Security Administrator', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Stk5v9W');

-- Insert regular user (password: User123!)
INSERT INTO users (email, name, password_hash) VALUES
('user@security.com', 'Regular User', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@security.com' AND r.name = 'admin';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'user@security.com' AND r.name = 'user';

-- Insert user attributes for ABAC
INSERT INTO user_attributes (user_id, attribute_name, attribute_value)
SELECT u.id, 'department', 'IT'
FROM users u WHERE u.email = 'admin@security.com';

INSERT INTO user_attributes (user_id, attribute_name, attribute_value)
SELECT u.id, 'clearance_level', 'high'
FROM users u WHERE u.email = 'admin@security.com';

INSERT INTO user_attributes (user_id, attribute_name, attribute_value)
SELECT u.id, 'department', 'General'
FROM users u WHERE u.email = 'user@security.com';

INSERT INTO user_attributes (user_id, attribute_name, attribute_value)
SELECT u.id, 'clearance_level', 'low'
FROM users u WHERE u.email = 'user@security.com';

-- Insert default ABAC policies
INSERT INTO abac_policies (name, description, resource, action, conditions, effect, priority) VALUES
('Admin Full Access', 'Administrators have full access to all resources', '*', '*', '{"user.role": "admin"}', 'allow', 100),
('Security Analyst Access', 'Security analysts can access security features', 'security', '*', '{"user.role": "security_analyst"}', 'allow', 90),
('User Profile Access', 'Users can access their own profile', 'profile', 'read', '{"user.id": "${resource.owner_id}"}', 'allow', 80),
('High Clearance Data', 'Only high clearance users can access sensitive data', 'sensitive_data', '*', '{"user.clearance_level": "high"}', 'allow', 85),
('Department Restriction', 'Users can only access their department data', 'department_data', '*', '{"user.department": "${resource.department}"}', 'allow', 75);

-- Insert sample vulnerabilities
INSERT INTO vulnerabilities (cve_id, title, description, severity, cvss_score, affected_component, fixed_version, published_date) VALUES
('CVE-2024-0001', 'Cross-Site Scripting in React Components', 'Potential XSS vulnerability in user input handling', 'high', 7.5, 'React Components', '18.2.1', '2024-01-15'),
('CVE-2024-0002', 'SQL Injection in Database Queries', 'Improper input sanitization leading to SQL injection', 'critical', 9.8, 'Database Layer', '2.1.0', '2024-01-20'),
('CVE-2024-0003', 'Weak SSL/TLS Configuration', 'Outdated cipher suites and protocols', 'medium', 5.3, 'SSL/TLS Config', '1.3.0', '2024-01-25');

-- Insert sample security events
INSERT INTO security_events (event_type, severity, ip_address, user_agent, resource, action, details) VALUES
('failed_login', 'medium', '192.168.1.100', 'Mozilla/5.0', 'auth', 'login', '{"attempts": 3, "reason": "invalid_password"}'),
('successful_login', 'low', '192.168.1.101', 'Mozilla/5.0', 'auth', 'login', '{"method": "password"}'),
('privilege_escalation_attempt', 'high', '10.0.0.50', 'curl/7.68.0', 'admin', 'access', '{"blocked": true, "reason": "insufficient_permissions"}'),
('suspicious_activity', 'critical', '203.0.113.1', 'Python-requests/2.25.1', 'api', 'bulk_request', '{"requests_per_minute": 1000, "blocked": true}');

-- Insert certificate monitoring entries
INSERT INTO certificate_monitors (domain, port, certificate_info, expires_at, is_valid) VALUES
('localhost', 443, '{"issuer": "Let''s Encrypt", "algorithm": "RSA", "key_size": 2048}', '2024-12-31 23:59:59', true),
('api.security.com', 443, '{"issuer": "DigiCert", "algorithm": "ECDSA", "key_size": 256}', '2024-11-15 23:59:59', true);

-- Insert initial vulnerability scan
INSERT INTO vulnerability_scans (scan_type, status, vulnerabilities_found, critical_count, high_count, medium_count, low_count, scan_results, completed_at) VALUES
('full_system', 'completed', 3, 1, 1, 1, 0, '{"scanned_components": ["web_app", "database", "ssl_config"], "scan_duration": "00:05:30"}', CURRENT_TIMESTAMP);
