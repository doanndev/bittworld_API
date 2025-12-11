/**
 * Script để reset dữ liệu mẫu trong bảng user_wallets
 * 
 * Cách sử dụng:
 * 1. Chạy: npm run ts-node src/scripts/reset-user-wallets-sample-data.ts
 * 2. Hoặc: npx ts-node -r tsconfig-paths/register src/scripts/reset-user-wallets-sample-data.ts
 */

import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import * as bcrypt from 'bcrypt';

async function resetSampleData() {
    try {
        // Initialize DataSource
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connection initialized');
        }

        const queryRunner = AppDataSource.createQueryRunner();

        // Check if table exists
        const tableExists = await queryRunner.hasTable('user_wallets');
        if (!tableExists) {
            console.log('⚠️ Table user_wallets does not exist.');
            await queryRunner.release();
            await AppDataSource.destroy();
            return;
        }

        // Delete existing sample data
        console.log('🗑️  Deleting existing sample data...');
        await queryRunner.query(`
            DELETE FROM "user_wallets" 
            WHERE "uw_id" IN (725112501, 725112502, 725112503, 725112504, 725112505);
        `);
        console.log('✅ Existing sample data deleted');

        // Hash password for sample users (password: user123)
        const hashedPassword = await bcrypt.hash('user123', 10);
        const escapedPassword = hashedPassword.replace(/'/g, "''");

        // Insert sample data
        console.log('📝 Inserting sample data...');
        await queryRunner.query(`
            INSERT INTO "user_wallets" (
                "uw_id",
                "uw_telegram_id",
                "uw_phone",
                "uw_email",
                "uw_password",
                "google_auth",
                "active_gg_auth",
                "active_email",
                "isBittworld",
                "created_at",
                "updated_at"
            )
            VALUES 
                (
                    725112501,
                    '123456789',
                    '+84901234567',
                    'user1@example.com',
                    '${escapedPassword}',
                    NULL,
                    false,
                    true,
                    false,
                    NOW(),
                    NOW()
                ),
                (
                    725112502,
                    '987654321',
                    '+84909876543',
                    'user2@example.com',
                    '${escapedPassword}',
                    NULL,
                    false,
                    true,
                    false,
                    NOW(),
                    NOW()
                ),
                (
                    725112503,
                    '555555555',
                    '+84905555555',
                    'user3@example.com',
                    '${escapedPassword}',
                    'GA123456789',
                    true,
                    true,
                    false,
                    NOW(),
                    NOW()
                ),
                (
                    725112504,
                    NULL,
                    '+84901111111',
                    'bittworld@example.com',
                    '${escapedPassword}',
                    NULL,
                    false,
                    false,
                    true,
                    NOW(),
                    NOW()
                ),
                (
                    725112505,
                    '111222333',
                    NULL,
                    'telegram@example.com',
                    '${escapedPassword}',
                    NULL,
                    false,
                    true,
                    false,
                    NOW(),
                    NOW()
                );
        `);

        console.log('✅ Sample data inserted successfully');
        console.log('\n📋 Sample users:');
        console.log('   - User 1: user1@example.com (password: user123)');
        console.log('   - User 2: user2@example.com (password: user123)');
        console.log('   - User 3: user3@example.com (password: user123, Google Auth enabled)');
        console.log('   - User 4: bittworld@example.com (password: user123, Bittworld user)');
        console.log('   - User 5: telegram@example.com (password: user123)');

        await queryRunner.release();
        await AppDataSource.destroy();
        console.log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
resetSampleData();

