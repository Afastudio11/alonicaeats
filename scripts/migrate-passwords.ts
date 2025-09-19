import { storage } from '../server/storage.js';
import { hashPassword } from '../server/auth-utils.js';

/**
 * Script untuk membuat admin user default dengan password yang di-hash
 * Akan membuat user admin jika belum ada user dengan username 'admin'
 */

async function createDefaultAdmin() {
  console.log('🔐 Creating default admin user...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByUsername('admin');
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      
      // Check if password is already hashed
      if (existingAdmin.password && existingAdmin.password.match(/^\$2[aby]\$/)) {
        console.log('✅ Admin password is already hashed');
        return;
      } else {
        console.log('🔄 Migrating existing admin password...');
        
        // Hash existing plaintext password and persist it
        const hashedPassword = await hashPassword(existingAdmin.password);
        await storage.updateUserPassword(existingAdmin.id, hashedPassword);
        
        console.log('✅ Admin password successfully migrated and secured');
        return;
      }
    }
    
    // Create default admin user with secure password
    const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD;
    
    if (!defaultPassword) {
      console.error('❌ INITIAL_ADMIN_PASSWORD environment variable is required');
      console.log('Please set a secure password:');
      console.log('export INITIAL_ADMIN_PASSWORD="your-secure-password"');
      process.exit(1);
    }
    
    if (defaultPassword.length < 8) {
      console.error('❌ INITIAL_ADMIN_PASSWORD must be at least 8 characters long');
      process.exit(1);
    }
    
    const hashedPassword = await hashPassword(defaultPassword);
    
    await storage.createUser({
      username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
      password: hashedPassword,
      role: 'admin'
    });
    
    console.log('✅ Default admin user created');
    console.log(`   Username: ${process.env.INITIAL_ADMIN_USERNAME || 'admin'}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log('   ⚠️  Please change the default password after first login!');
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

// Check if running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  createDefaultAdmin()
    .then(() => {
      console.log('🏁 Admin setup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin setup failed:', error);
      process.exit(1);
    });
}

export { createDefaultAdmin };