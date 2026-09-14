import 'dotenv/config';
import mongoose from 'mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Account, AccountSchema } from '../users/schemas/account.schema';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('📦 Connected to MongoDB');

        const businessEmail = 'admin@adcustex.com';
        const BCRYPT_ROUNDS = 12;

        // Create User model
        const UserModel = mongoose.model(User.name, UserSchema);


        // Check if advertiser already exists
        const existingAdvertiser = await UserModel.findOne({ businessEmail }).exec();

        if (existingAdvertiser) {
            console.log('✅ Advertiser user already exists');
            return;
        }

        const password = await bcrypt.hash('Admin@123', BCRYPT_ROUNDS);
        const user = await UserModel.create({
            firstName: 'AdCustex',
            lastName: 'Admin',
            businessEmail,
            organizationName: 'AdCustex Admin',
            accountType: 'advertiser',
            password,
        });
        console.log('✅ User created successfully');
        return user;
    } catch (error) {
        console.error('❌ Error during user setup:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

bootstrap(); 