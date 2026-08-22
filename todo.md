# Project TODO

- [x] Extend the user role model to support citizen, bank, authority, and admin roles, with citizen as the safe default.
- [x] Add database tables for user-facing role-change notifications and immutable role-change audit records.
- [x] Apply the database migration and verify the updated schema.
- [x] Implement server-side role guards and protected user-management procedures.
- [x] Implement secure administrator role assignment that records an audit event and creates an in-app notification for the affected user.
- [x] Create a refined public sign-in experience using the existing Manus OAuth flow.
- [x] Create role-aware protected dashboards for citizens, banks, authorities, and administrators.
- [x] Create an administrator user-management workflow for reviewing users, changing roles, and viewing role-change history.
- [x] Create an in-app notification experience for access-change transparency.
- [x] Add automated tests for server-side role enforcement and role-change notifications.
- [x] Validate the build, tests, responsive visual presentation, and protected-access behavior.
- [x] Add transactional tests proving that role assignment writes both an audit record and an in-app notification.
- [x] Run the production build and resolve any build-time issues.
- [x] Verify unauthenticated and non-administrator protected-access states.
- [x] Verify administrator-only API and user-interface access with an authenticated non-administrator identity.
