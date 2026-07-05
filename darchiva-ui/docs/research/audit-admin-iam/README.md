# Admin and IAM Workspace Source Audit

Audit scope: `src/features/admin`, `src/features/iam`, missing page entrypoints, and adjacent user, role, permission, access, org, tenant, and super-admin management surfaces discovered under `src/pages` and `src/features`.

## Findings

| Component | File | Severity | Finding | Line Range |
| --- | --- | --- | --- | --- |
| Admin page entrypoint | `src/pages/Admin.tsx` | high | Missing page entrypoint; Admin workspace exists only as feature exports/components, so routing/discoverability is possibly delegated elsewhere. | N/A (missing) |
| IAM page entrypoint | `src/pages/IAM.tsx` | high | Missing page entrypoint; IAM workspace exists only as feature exports/components, so routing/discoverability is possibly delegated elsewhere. | N/A (missing) |
| Admin RoleManagement | `src/features/admin/RoleManagement.tsx` | high | Edit role saves `permission_ids: []`, which can wipe role permissions while the dialog only exposes name/description. | 76-83 |
| Admin RoleManagement | `src/features/admin/RoleManagement.tsx` | medium | Create/edit/delete mutations have pending states and delete confirmation, but no success/error toast or local catch. | 76-83, 159-162, 311-316 |
| SearchIndexPanel | `src/features/admin/SearchIndexPanel.tsx` | medium | Per-document retry silently reverts on failure without a visible toast/error row; only the bulk reindex error is surfaced. | 225-236 |
| SearchIndexPanel | `src/features/admin/SearchIndexPanel.tsx` | low | Bulk reindex has inline confirmation, loading, success, error, and endpoint error states. | 317-430 |
| Admin UserManagement | `src/features/admin/UserManagement.tsx` | medium | Invite, role update, active toggle, and delete mutations have no success/error toast or local catch. | 85-94, 173-177, 249-257 |
| Admin UserManagement | `src/features/admin/UserManagement.tsx` | high | Edit-role dialog initializes `selectedRoleIds` from the first `user` prop and never resets it when a different user is opened in the same mounted dialog. | 158-176 |
| Admin UserManagement | `src/features/admin/UserManagement.tsx` | medium | Disable/enable user is destructive for access but executes immediately from the menu without confirmation. | 399-405 |
| Admin user API hooks | `src/features/admin/api-users.ts` | low | Real API hooks exist for list/detail/invite/revoke/update/delete; feedback is delegated to callers. | 62-151 |
| Admin group API hooks | `src/features/admin/api-groups.ts` | low | Real API hooks exist for group list/member/create/update/delete; no direct UI in Admin tree consumes full CRUD here. | 49-120 |
| Admin API barrel | `src/features/admin/api.ts` | low | Re-export-only file; no dead action or data-flow issue visible. | 1-37 |
| TenantManagement | `src/features/admin/components/TenantManagement.tsx` | medium | Search and status filters run only against the currently loaded `useTenants()` result; no server-side filter/page params are passed. | 21-45 |
| TenantManagement | `src/features/admin/components/TenantManagement.tsx` | low | Tenant list has loading, error, empty, and create navigation states. | 135-151 |
| Admin TenantDetailPanel | `src/features/admin/components/TenantDetailPanel.tsx` | high | Overview usage meters hardcode `45 GB` and `8 users` instead of using tenant usage API data. | 141-158 |
| Admin TenantDetailPanel | `src/features/admin/components/TenantDetailPanel.tsx` | medium | Suspend/activate, storage verify, and reset token mutations have no success/error feedback and no confirmation for suspend/activate. | 93-111, 179-186, 223-235 |
| Admin TenantDetailPanel | `src/features/admin/components/TenantDetailPanel.tsx` | medium | Tenant detail/storage/AI/subscription queries do not expose loading/error states; missing data renders defaults like `OpenAI` and `gpt-4o-mini`. | 33-43, 164-220 |
| TenantDetailPanel styles | `src/features/admin/components/TenantDetailPanel.module.css` | low | Style-only file; no actionable Admin/IAM behavior finding. | 1-472 |
| TenantProvisionWizard | `src/features/admin/components/TenantProvisionWizard.tsx` | high | Required organization/email fields can advance through every step and submit without validation; only the backend can reject. | 80-101, 191-202, 224-288 |
| TenantProvisionWizard | `src/features/admin/components/TenantProvisionWizard.tsx` | medium | Plan, storage providers, regions, AI providers/models are static local lists rather than API/config-driven options. | 13-46, 294-365, 443-447 |
| TenantProvisionWizard | `src/features/admin/components/TenantProvisionWizard.tsx` | medium | AI feature checkboxes are uncontrolled `defaultChecked` inputs and are not written into `formData`, so they do not affect provisioning. | 482-500 |
| TenantProvisionWizard styles | `src/features/admin/components/TenantProvisionWizard.module.css` | low | Style-only file; no actionable Admin/IAM behavior finding. | 1-590 |
| TenantManagement styles | `src/features/admin/components/TenantManagement.module.css` | low | Style-only file; no actionable Admin/IAM behavior finding. | 1-497 |
| Admin index barrel | `src/features/admin/index.ts` | low | Re-export-only file; no actionable behavior finding. | 1-9 |
| Admin tenant API hooks | `src/features/admin/api-tenant.ts` | medium | Tenant activity errors are caught and converted to `[]`, so the UI cannot distinguish no activity from a failed audit-log request. | 185-196 |
| IAM API hooks | `src/features/iam/api/hooks.ts` | low | Real API hooks cover users, sessions, roles, groups, invitations, permission matrix, tasks, notifications, and favorites; feedback is delegated to callers. | 51-430 |
| IAMDashboard | `src/features/iam/components/IAMDashboard.tsx` | critical | User action menu items `Edit User`, `Reset Password`, and `Suspend/Activate` are rendered without `onClick` handlers or mutations. | 373-384 |
| IAMDashboard | `src/features/iam/components/IAMDashboard.tsx` | critical | Group action menu items `Edit`, `Add Members`, and `Delete` are rendered without `onClick` handlers or mutations. | 566-575 |
| IAMDashboard | `src/features/iam/components/IAMDashboard.tsx` | high | Stats, users, roles, groups, policies, and sessions tabs handle loading/empty states but do not render query error states. | 90-150, 228-295, 394-418, 473-515, 585-619, 629-679 |
| IAMDashboard | `src/features/iam/components/IAMDashboard.tsx` | medium | Invite, create role, create group, and revoke session mutations lack success/error toast feedback. | 805-815, 886-897, 1002-1013, 688-719 |
| IAMDashboard | `src/features/iam/components/IAMDashboard.tsx` | medium | Role cards are read-only; the tab has create but no edit/delete/clone entry despite API hooks existing. | 394-459 |
| IAM PermissionMatrix | `src/features/iam/components/PermissionMatrix.tsx` | high | Permission cell updates call `updateCell.mutate` without success/error feedback or rollback, so failed permission edits look accepted after the picker closes. | 74-82, 299-338 |
| IAM PermissionMatrix | `src/features/iam/components/PermissionMatrix.tsx` | medium | No query error state; failed matrix load falls through to an empty matrix after loading. | 39-40, 118-297 |
| IAM PermissionMatrix | `src/features/iam/components/PermissionMatrix.tsx` | low | `onExport` prop is declared but ignored; export always generates a local CSV. | 14-17, 93-110 |
| RoleBuilder | `src/features/iam/components/RoleBuilder.tsx` | medium | Save failure has toast, but successful create/update has no success toast unless parent `onSave` handles it. | 174-199 |
| RoleBuilder | `src/features/iam/components/RoleBuilder.tsx` | medium | Permission/template loads have a skeleton but no error state. | 70-71, 202-204 |
| IAM MetricCard | `src/features/iam/components/core/MetricCard.tsx` | low | Presentational component only; no actionable behavior finding. | 1-123 |
| IAM PermissionBadge | `src/features/iam/components/core/PermissionBadge.tsx` | low | Presentational selector/badge component only; no actionable behavior finding. | 1-122 |
| IAM theme | `src/features/iam/styles/theme.css` | low | Style-only file; no actionable Admin/IAM behavior finding. | 1-301 |
| IAM types | `src/features/iam/types/index.ts` | low | Type-only file; no actionable behavior finding. | 1-313 |
| IAM index barrel | `src/features/iam/index.ts` | low | Re-export-only file; no actionable behavior finding. | 1-6 |
| Users API hooks | `src/features/users/api.ts` | low | Real API hooks exist for user CRUD, password reset/change, and MFA; feedback is delegated to callers. | 15-147 |
| UserList | `src/features/users/components/UserList.tsx` | medium | User query has loading/empty states but no `isError` state; failed loads render as empty users. | 65-104, 140-144 |
| UserList | `src/features/users/components/UserList.tsx` | medium | Delete and reset-password mutations have confirmations but no success/error toast or local catch. | 78-88, 285-330 |
| UserForm | `src/features/users/components/UserForm.tsx` | medium | Create/update submits close the sheet without success/error feedback and without local catch. | 112-122, 265-273 |
| UserForm | `src/features/users/components/UserForm.tsx` | low | Group/role assignment UI exists and uses real role/group lists, but list load errors are not rendered. | 39-42, 208-256 |
| ActivityHistoryModal | `src/features/users/components/ActivityHistoryModal.tsx` | medium | Activity feed query has loading/empty states but no error state. | 27-44 |
| CreateUserModal | `src/features/users/components/CreateUserModal.tsx` | low | Thin wrapper around `UserForm`; behavior delegated. | 1-10 |
| ManageFavoritesModal | `src/features/users/components/ManageFavoritesModal.tsx` | medium | Favorites query has loading/empty states but no error state. | 20-59 |
| UserProfileModal | `src/features/users/components/UserProfileModal.tsx` | high | Account Settings, Security & Privacy, and Sign Out buttons are visible but have no handlers. | 65-78 |
| UserList tests | `src/features/users/components/UserList.test.tsx` | low | Tests cover loading, empty, rendering, create callback, filters, and pagination, but not query errors or mutation failure UX. | 38-192 |
| Users index barrel | `src/features/users/index.ts` | low | Re-export-only file; no actionable behavior finding. | 1-9 |
| Users types | `src/features/users/types.ts` | low | Type-only file; no actionable behavior finding. | 1-77 |
| Roles API hooks | `src/features/roles/api.ts` | low | Real role and permission API hooks exist; clone uses `/iam/roles/:id/clone` while other role hooks use `/roles`. | 15-126 |
| RoleList | `src/features/roles/components/RoleList.tsx` | medium | Role query has loading/empty states but no `isError` state; failed loads render as empty roles. | 63-99, 124-128 |
| RoleList | `src/features/roles/components/RoleList.tsx` | medium | Delete and clone mutations have confirmation/dialog flows but no success/error toast or local catch. | 75-85, 214-256, 259-289 |
| RoleForm | `src/features/roles/components/RoleForm.tsx` | medium | Create/update submits close the sheet without success/error feedback and without local catch. | 93-103, 291-299 |
| RoleForm | `src/features/roles/components/RoleForm.tsx` | medium | Permissions query has loading skeletons but no error state. | 47, 192-276 |
| CreateRoleModal | `src/features/roles/components/CreateRoleModal.tsx` | low | Thin wrapper around `RoleForm`; behavior delegated. | 1-10 |
| RoleList tests | `src/features/roles/components/RoleList.test.tsx` | low | Tests cover loading, empty, rendering, create callback, counts, and clone dialog, but not query errors or mutation failure UX. | 38-179 |
| Roles index barrel | `src/features/roles/index.ts` | low | Re-export-only file; no actionable behavior finding. | 1-9 |
| Roles types | `src/features/roles/types.ts` | low | Type-only file; no actionable behavior finding. | 1-68 |
| Tenants API client | `src/features/tenants/api.ts` | low | Real current/system tenant API functions exist for tenant CRUD, branding/settings, usage, and tenant users. | 11-138 |
| TenantsPage | `src/features/tenants/components/TenantsPage.tsx` | high | Selected-tenant branding/settings saves call current-tenant update APIs, so editing a tenant from the system list can target the operator's current tenant instead of the selected tenant. | 125-140 |
| TenantsPage | `src/features/tenants/components/TenantsPage.tsx` | medium | Status filter is server-side, but plan and search filters are client-side over the current page only, producing partial results. | 46-57, 148-161 |
| TenantsPage | `src/features/tenants/components/TenantsPage.tsx` | medium | Activate tenant runs immediately without confirmation, unlike suspend/delete. | 92-98 |
| TenantTable | `src/features/tenants/components/TenantTable.tsx` | low | Action callbacks are fully delegated to parent and include select/suspend/activate/delete affordances. | 193-249 |
| TenantCreationWizard | `src/features/tenants/components/TenantCreationWizard.tsx` | medium | Branding colors are collected but stripped before `createTenant`, so the branding step is misleading. | 33-49, 91-93, 242-307 |
| TenantCreationWizard | `src/features/tenants/components/TenantCreationWizard.tsx` | medium | Required basic fields only gate `name` and `slug`; contact/billing email fields are not validated before create. | 115-189, 425-433 |
| TenantBrandingEditor | `src/features/tenants/components/TenantBrandingEditor.tsx` | critical | Upload Logo and Upload Background only click a hidden file input; there is no `onChange` upload handler, so uploads do nothing. | 27-32, 65-80, 165-194 |
| TenantBrandingEditor | `src/features/tenants/components/TenantBrandingEditor.tsx` | medium | Save has loading state but no local success/error toast; failures are only handled if parent catches them. | 21-26, 281-286 |
| TenantDetailPanel | `src/features/tenants/components/TenantDetailPanel.tsx` | medium | Overview save awaits parent update and exits edit mode without local success/error feedback. | 53-56, 183-200 |
| TenantFilters | `src/features/tenants/components/TenantFilters.tsx` | low | Filter UI is complete, but result completeness depends on parent/server pagination handling. | 1-81 |
| TenantSettingsEditor | `src/features/tenants/components/TenantSettingsEditor.tsx` | medium | Save has loading state but no local success/error toast; failures are only handled if parent catches them. | 67-74, 235-240 |
| TenantStatusBadge | `src/features/tenants/components/TenantStatusBadge.tsx` | low | Presentational status badge only; no actionable behavior finding. | 1-22 |
| TenantUsageStats | `src/features/tenants/components/TenantUsageStats.tsx` | medium | Usage Trends section is explicitly unavailable/static, leaving a prominent analytics gap. | 92-110 |
| TenantUsersList | `src/features/tenants/components/TenantUsersList.tsx` | high | Invite user posts `role_ids: []` and exposes no role/group assignment UI for tenant invitations. | 55-64, 179-238 |
| TenantUsersList | `src/features/tenants/components/TenantUsersList.tsx` | medium | Invite/remove flows show error toasts but no success feedback. | 55-71, 75-84 |
| Tenants component index | `src/features/tenants/components/index.ts` | low | Re-export-only file; no actionable behavior finding. | 1-11 |
| Tenants index barrel | `src/features/tenants/index.ts` | low | Re-export-only file; no actionable behavior finding. | 1-4 |
| Tenants styles | `src/features/tenants/tenants.module.css` | low | Style-only file; no actionable Admin/IAM behavior finding. | 1-111 |
| Tenants types | `src/features/tenants/types.ts` | medium | `AVAILABLE_PLANS` is a hardcoded plan catalog used by creation UI instead of a billing/tenant API source. | 127-218 |
| Current-tenant BrandingSettings | `src/features/tenant/BrandingSettings.tsx` | low | API-backed branding settings include loading, upload, save success, and save failure feedback. | 261-317, 410-426, 599-614 |
| Current-tenant branding API | `src/features/tenant/api.ts` | low | Real query/mutation hooks exist for current tenant branding and logo upload. | 17-67 |
| SuperAdmin API hooks | `src/features/superadmin/api.ts` | low | Real superadmin hooks cover stats, tenants, config, jobs, flags, and system actions; some feedback is handled in hooks. | 65-264 |
| SuperAdminPage | `src/features/superadmin/SuperAdminPage.tsx` | high | System config and feature flag tabs fall back to `DEFAULT_CONFIG`/`DEFAULT_FLAGS` when APIs return empty arrays, which can display fake platform state. | 76-92, 446-458, 666-694 |
| SuperAdminPage | `src/features/superadmin/SuperAdminPage.tsx` | medium | Tenant active toggle mutates immediately without confirmation or success/error feedback. | 360-365, 816-817 |
| SuperAdminPage | `src/features/superadmin/SuperAdminPage.tsx` | medium | System config save, queue purge, and feature flag toggle lack visible success/error feedback in the component. | 458, 582, 694 |
| SuperAdmin index barrel | `src/features/superadmin/index.ts` | low | Re-export-only file; no actionable behavior finding. | 1-3 |
| AccessGraph | `src/features/security/components/AccessGraph.tsx` | medium | Search and department filters recompute `initialNodes`, but React Flow state is seeded through `useNodesState(initialNodes)`, so filter changes can leave stale graph nodes visible. | 174-244 |
| AccessGraph | `src/features/security/components/AccessGraph.tsx` | low | Visualization component is read-only and callback-driven; no direct CRUD or mutation gap visible. | 1-521 |
| DepartmentAccessMatrix | `src/features/security/components/DepartmentAccessMatrix.tsx` | high | Per-user permission fetch failures are caught and replaced with `[]`, hiding partial load failures as empty permission sets. | 302-307 |
| DepartmentAccessMatrix | `src/features/security/components/DepartmentAccessMatrix.tsx` | medium | Grant/revoke API calls have confirmation/loading but no success/error toast; failures rely on caller/API rejection with no local message. | 40-54, 166-179, 318-333 |
| Security PermissionMatrix | `src/features/security/components/PermissionMatrix.tsx` | high | `isLoading` prop is renamed `_isLoading` and never rendered, so parent loading state is ignored. | 55-61 |
| Security PermissionMatrix | `src/features/security/components/PermissionMatrix.tsx` | medium | Save calls `onUpdate` for each pending cell with no confirmation, error feedback, or rollback path in the component. | 103-108 |
| UsersAccessSettings | `src/features/settings/components/sections/UsersAccessSettings.tsx` | low | Aggregates user/group/role management and delegates CRUD modals via `openModal`; no direct dead action visible in this file. | 25-121 |
| ManageCaseAccessModal | `src/features/cases/components/modals/ManageCaseAccessModal.tsx` | high | Access grant supports only adding a user permission; there is no list of existing access, edit, revoke, or confirmation flow. | 18-33, 45-75 |
| UserProfile page | `src/pages/UserProfile.tsx` | high | MFA setup marks two-factor auth enabled immediately after receiving setup data; no verification-code step is required before the UI reports it enabled. | 188-210 |
| UserProfile page | `src/pages/UserProfile.tsx` | medium | API token revoke runs from a row button with no destructive confirmation. | 232-245, 418-421 |
| UserProfile page | `src/pages/UserProfile.tsx` | low | Profile/security/token page has loading, status/error banners, API-backed actions, and confirmation for account deactivation. | 83-462 |
| UserHome page | `src/pages/UserHomePage.tsx` | low | Re-export-only page; behavior delegated to `src/features/home/components/UserHomePage`. | 1 |

## Top 5 Actionable Fixes

1. Fix dead IAM action menus in `IAMDashboard` (`src/features/iam/components/IAMDashboard.tsx`): wire user edit/reset/suspend and group edit/add-members/delete to existing hooks/dialogs, add confirmations for destructive actions, and show toast success/error feedback.
2. Prevent permission loss in `RoleManagement` (`src/features/admin/RoleManagement.tsx`): when editing, preserve existing permission IDs or route edits to a real permission editor instead of submitting `permission_ids: []`.
3. Correct selected-tenant mutations in `TenantsPage` (`src/features/tenants/components/TenantsPage.tsx`): replace current-tenant branding/settings calls with selected tenant ID-aware system APIs, then add regression coverage for editing a non-current tenant.
4. Complete tenant branding upload in `TenantBrandingEditor` (`src/features/tenants/components/TenantBrandingEditor.tsx`): implement file `onChange` upload for logo/background, store returned URLs, and add success/error feedback.
5. Replace fake tenant metrics and defaults in `TenantDetailPanel` (`src/features/admin/components/TenantDetailPanel.tsx`): fetch/render tenant usage, show per-query loading/error states, and remove default AI/storage values that look real when APIs fail.
