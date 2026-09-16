import { Injectable } from '@nestjs/common';
import { UserDocument, User } from './schemas/user.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private readonly organisationModel: Model<UserDocument>,
    ) { }

    async findOrganisationById(userId: string) {
        const organisatiionId = new Types.ObjectId(userId)
        return this.organisationModel.findById(organisatiionId)
    }
}
