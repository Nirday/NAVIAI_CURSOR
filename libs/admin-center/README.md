# Module 10: AI Admin Control Center

The **AI Admin Control Center** provides platform administration tools for managing users, feature flags, system monitoring, and platform-wide settings. It's accessible only to admin and super_admin users.

## Overview

This module provides:
- **User Management**: View users, send password resets, impersonate
- **Feature Flags**: Global feature toggles
- **System Monitoring**: Dashboard with metrics, job status, errors
- **SEO Opportunity Review**: Admin review of AI-generated SEO opportunities
- **Admin Management**: Invite and manage admin users
- **Platform Settings**: Global configuration management
- **Admin Broadcasts**: Platform-wide announcements

## Key Components

### `access_control.ts`
Role-based access control:
- `isAdmin(userId: string)`: Check if user is admin
- `isSuperAdmin(userId: string)`: Check if user is super admin
- `hasRole(userId: string, role: UserRole)`: Check specific role
- `requireAdmin(userId: string)`: Require admin (throws if not)
- `requireSuperAdmin(userId: string)`: Require super admin (throws if not)

### `data.ts`
Data access functions:
- User profiles, feature flags, audit logs, admin invites, job run logs, platform settings

### `types.ts`
Type definitions:
- `UserRole`: 'user' | 'admin' | 'super_admin'
- `FeatureFlag`: Feature flag structure
- `AdminAuditLog`: Audit log entry
- `PlatformSetting`: Global setting

## Database Tables

### `user_profiles`
User role storage:
- `id`: UUID primary key
- `user_id`: References auth.users (unique)
- `role`: 'user' | 'admin' | 'super_admin'
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### `feature_flags`
Global feature toggles:
- `id`: UUID primary key
- `flag_id`: Unique flag identifier
- `description`: Flag description
- `is_enabled`: Boolean enabled status

### `admin_audit_logs`
Audit trail:
- `id`: UUID primary key
- `admin_user_id`: References auth.users
- `action`: Action type (e.g., 'feature_flag_toggled')
- `details`: Contextual data (JSONB)
- `created_at`: Action timestamp

### `admin_invites`
Admin invitation system:
- `id`: UUID primary key
- `email`: Invitee email
- `token`: Secure UUID token
- `invited_by`: References auth.users
- `role_to_assign`: 'admin' | 'super_admin'
- `status`: 'pending' | 'accepted' | 'expired'
- `expires_at`: Token expiration (24 hours)
- `created_at`: Invitation timestamp
- `accepted_at`: Acceptance timestamp (nullable)

### `job_run_logs`
Background job tracking:
- `id`: UUID primary key
- `job_name`: Job identifier
- `status`: 'success' | 'failed'
- `started_at`: Job start time
- `completed_at`: Job completion time (nullable)
- `error_message`: Error message (nullable)
- `details`: Additional context (JSONB)

### `platform_settings`
Global platform configuration:
- `id`: UUID primary key
- `key`: Setting key (unique)
- `value`: Setting value (string)
- `description`: Setting description
- `is_editable_by_admin`: Boolean edit permission
- `updated_at`: Last update timestamp
- `updated_by`: References auth.users (nullable)

## Admin Roles

### Admin
Can access:
- Dashboard
- User Management
- Feature Flags
- SEO Opportunities
- Audit Logs

### Super Admin
Can access everything Admin can, plus:
- Admin Management
- Platform Settings
- Admin Broadcasts

## API Endpoints

### User Management
- `GET /api/admin/users`: List users (paginated, searchable)
- `GET /api/admin/users/[userId]`: Get user details
- `POST /api/admin/users/[userId]/password-reset`: Send password reset
- `GET /api/admin/users/[userId]/activity`: Get user activity log
- `POST /api/admin/users/[userId]/impersonate`: Impersonate user

### Feature Flags
- `GET /api/admin/feature-flags`: List all flags
- `POST /api/admin/feature-flags/[flagId]/toggle`: Toggle flag

### System Health
- `GET /api/admin/system-health/metrics`: Get system metrics
- `GET /api/admin/system-health/jobs`: Get job status
- `GET /api/admin/system-health/errors`: Get recent errors (Sentry)

### Admin Management
- `GET /api/admin/admins`: List admins and pending invites
- `POST /api/admin/admins/invite`: Send admin invite
- `POST /api/admin/admins/[userId]/remove`: Remove admin access
- `POST /api/admin/invites/[id]/revoke`: Revoke invite
- `POST /api/admin/invites/accept`: Accept invite

### Platform Settings
- `GET /api/admin/platform-settings`: List settings
- `POST /api/admin/platform-settings`: Update settings

### Admin Broadcasts
- `GET /api/admin/broadcasts/recipient-count`: Get recipient count
- `POST /api/admin/broadcasts/send`: Send broadcast

## Integration Points

### All Modules
Feature flags can gate module functionality.

### Module 4 (SEO)
Admin reviews `SeoOpportunity` records.

### Module 6 (Communication Hub)
Admin broadcasts use email sending infrastructure.

## Security

- All endpoints verify admin/super_admin role server-side
- JWT includes role claim for fast authorization
- Audit logging for all admin actions
- Secure token-based admin invitations (24-hour expiry)

## Usage Example

```typescript
import { requireSuperAdmin } from '@/libs/admin-center/src/access_control'
import { updateFeatureFlag } from '@/libs/admin-center/src/data'

await requireSuperAdmin(userId)
await updateFeatureFlag('new_feature', true)
```

