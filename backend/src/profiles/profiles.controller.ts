import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Profile } from './entities/profile.entity';
import { ProfilesService } from './profiles.service';

/**
 * Perfiles oficiales de Construmétrica: solo lectura.
 * POST/PATCH/DELETE están deshabilitados; los datos se siembran al arranque.
 */
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  findAll(): Promise<Profile[]> {
    return this.profilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Profile> {
    return this.profilesService.findOne(id);
  }
}
