import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async findAll(): Promise<Profile[]> {
    return this.profileRepository.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({ where: { id } });

    if (!profile) {
      throw new NotFoundException(`Perfil con id ${id} no encontrado`);
    }

    return profile;
  }
}
