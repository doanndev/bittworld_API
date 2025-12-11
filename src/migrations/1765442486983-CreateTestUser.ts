import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from 'bcrypt';
import { ethers } from 'ethers';

export class CreateTestUser1765442486983 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123123', salt);

        // Generate unique referral code (6 characters alphanumeric)
        const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
        const CODE_LENGTH = 6;
        let referralCode = '';
        let isUnique = false;
        
        // Keep generating until we get a unique code
        while (!isUnique) {
            referralCode = '';
            for (let i = 0; i < CODE_LENGTH; i++) {
                const randomIndex = Math.floor(Math.random() * CHARS.length);
                referralCode += CHARS.charAt(randomIndex);
            }
            
            // Check if code already exists
            const existing = await queryRunner.query(`
                SELECT wallet_id FROM list_wallets WHERE wallet_code_ref = $1
            `, [referralCode]);
            
            if (existing.length === 0) {
                isUnique = true;
            }
        }

        // Generate user ID (similar to BeforeInsert logic)
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 1000);
        const userId = 7251125 + timestamp % 10000 + random;

        // Generate wallet ID (similar to BeforeInsert logic)
        const walletId = 3251125 + timestamp % 10000 + random + 1;

        // Generate Ethereum wallet from random private key
        // Since we only have Solana private key, we'll create a new ETH wallet
        const ethWallet = ethers.Wallet.createRandom();
        const ethAddress = ethWallet.address;
        const ethPrivateKey = ethWallet.privateKey;

        // Check if isBittworld column exists
        const columns = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_wallets'
        `);
        
        const columnNames = columns.map((col: any) => col.column_name);
        const hasIsBittworld = columnNames.some((name: string) => 
            name.toLowerCase() === 'isbittworld' || name === 'isBittworld'
        );
        
        // Create user - only include isBittworld if column exists
        if (hasIsBittworld) {
            // Find the actual column name (case-sensitive)
            const isBittworldCol = columnNames.find((name: string) => 
                name.toLowerCase() === 'isbittworld'
            );
            await queryRunner.query(`
                INSERT INTO user_wallets (
                    uw_id,
                    uw_email,
                    uw_password,
                    active_email,
                    "${isBittworldCol}",
                    created_at,
                    updated_at
                ) VALUES (
                    $1,
                    $2,
                    $3,
                    true,
                    false,
                    NOW(),
                    NOW()
                )
            `, [userId, 'a@a.a', hashedPassword]);
        } else {
            // Column doesn't exist, insert without it
            await queryRunner.query(`
                INSERT INTO user_wallets (
                    uw_id,
                    uw_email,
                    uw_password,
                    active_email,
                    created_at,
                    updated_at
                ) VALUES (
                    $1,
                    $2,
                    $3,
                    true,
                    NOW(),
                    NOW()
                )
            `, [userId, 'a@a.a', hashedPassword]);
        }

        // Create wallet
        // Note: wallet_private_key should be JSON string with solana and ethereum keys
        const privateKeyJson = JSON.stringify({
            solana: '2meBhEhGwbnAFM7WfyP7WDZLo4q1R2Rei1F4mALJMXJtTZRbFaBYV3mYD7Y2N3ZDTqtvCgUjYX1VPG5fodE941HQ',
            ethereum: ethPrivateKey
        });

        // Check if isBittworld column exists in list_wallets
        const listWalletColumns = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'list_wallets'
        `);
        
        const listWalletColumnNames = listWalletColumns.map((col: any) => col.column_name);
        const hasListWalletIsBittworld = listWalletColumnNames.some((name: string) => 
            name.toLowerCase() === 'isbittworld'
        );
        
        // Create wallet - only include isBittworld if column exists
        if (hasListWalletIsBittworld) {
            const isBittworldCol = listWalletColumnNames.find((name: string) => 
                name.toLowerCase() === 'isbittworld'
            );
            await queryRunner.query(`
                INSERT INTO list_wallets (
                    wallet_id,
                    wallet_private_key,
                    wallet_solana_address,
                    wallet_eth_address,
                    wallet_auth,
                    wallet_status,
                    wallet_code_ref,
                    "${isBittworldCol}"
                ) VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    'member',
                    true,
                    $5,
                    false
                )
            `, [walletId, privateKeyJson, '74erB61Jq1QvhrgEk59qN9Vystfa76eruV4t1P3kLnmU', ethAddress, referralCode]);
        } else {
            await queryRunner.query(`
                INSERT INTO list_wallets (
                    wallet_id,
                    wallet_private_key,
                    wallet_solana_address,
                    wallet_eth_address,
                    wallet_auth,
                    wallet_status,
                    wallet_code_ref
                ) VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    'member',
                    true,
                    $5
                )
            `, [walletId, privateKeyJson, '74erB61Jq1QvhrgEk59qN9Vystfa76eruV4t1P3kLnmU', ethAddress, referralCode]);
        }

        // Create wallet_auth link
        await queryRunner.query(`
            INSERT INTO wallet_auth (
                wa_user_id,
                wa_wallet_id,
                wa_type
            ) VALUES (
                $1,
                $2,
                'main'
            )
        `, [userId, walletId]);

        console.log(`✅ Created test user:
            - Email: a@a.a
            - Password: 123123
            - User ID: ${userId}
            - Wallet ID: ${walletId}
            - Wallet Address: 74erB61Jq1QvhrgEk59qN9Vystfa76eruV4t1P3kLnmU
            - Referral Code: ${referralCode}
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove test user and wallet
        await queryRunner.query(`
            DELETE FROM wallet_auth 
            WHERE wa_user_id IN (
                SELECT uw_id FROM user_wallets WHERE uw_email = 'a@a.a'
            )
        `);

        await queryRunner.query(`
            DELETE FROM list_wallets 
            WHERE wallet_solana_address = '74erB61Jq1QvhrgEk59qN9Vystfa76eruV4t1P3kLnmU'
        `);

        await queryRunner.query(`
            DELETE FROM user_wallets 
            WHERE uw_email = 'a@a.a'
        `);

        console.log('✅ Removed test user and wallet');
    }

}
