# User Management Workflows

## User Registration Workflow

The registration process involves multiple steps:

1. User submits registration form with email and password
2. Backend validates input and checks for existing accounts
3. Password is hashed using bcrypt
4. User record is created in the user-database
5. Verification email is sent via email-service
6. User is redirected to verification pending page

**Services involved:** user-service, email-service, auth-service

## User Login Workflow

1. User submits credentials
2. auth-service validates credentials against user-database
3. JWT token is generated with user roles
4. Token is returned to client
5. Client stores token for subsequent requests

## Password Reset Workflow

1. User requests password reset with email
2. Reset token is generated and stored
3. email-service sends reset link
4. User submits new password with reset token
5. Password is updated in user-database

## Account Deletion Process

1. User requests account deletion
2. Confirmation email is sent
3. User confirms deletion
4. User data is soft-deleted (30-day grace period)
5. After 30 days, data is permanently removed by cleanup-worker
