# Deployment Initialization Plan

## Tasks

- [x] 1. Modify `src/config/index.js` - Add admin account configuration options
- [x] 2. Create `src/utils/deployInit.js` - Deployment initialization script
- [x] 3. Modify `src/app.js` - Call initialization after database connection
- [x] 4. Create `.env.example` - Document new environment variables

## Summary

Admin accounts will now be automatically created on deployment:

- **Super Admin**: Created automatically with configurable credentials
- **Default Tenant**: Created with configurable name and plan
- **Shop Admin**: Created for the default tenant

Set `ADMIN_AUTO_CREATE=false` to disable auto-creation.
