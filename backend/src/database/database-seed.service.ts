import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import {
  FIXED_PROFILES,
  profileMatchesFixed,
} from '../profiles/fixed-profiles.constant';
import { Profile } from '../profiles/entities/profile.entity';
import { Proforma } from '../proformas/entities/proforma.entity';

/**
 * Siembra datos mínimos al iniciar la aplicación.
 * Perfiles: exactamente dos registros fijos de Construmétrica (ids 1 y 2).
 * Cliente id=1: dato de prueba para validación referencial de proformas.
 */
@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Proforma)
    private readonly proformaRepository: Repository<Proforma>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedProfiles();
    await this.seedCustomer();
  }

  /**
   * Garantiza EXACTAMENTE los dos perfiles oficiales.
   * Si hay perfiles distintos (p. ej. el de prueba anterior), los elimina
   * tras reasignar proformas huérfanas al perfil id=1.
   */
  private async seedProfiles(): Promise<void> {
    const existing = await this.profileRepository.find({ order: { id: 'ASC' } });

    const alreadyCanonical =
      existing.length === FIXED_PROFILES.length &&
      FIXED_PROFILES.every((expected) => {
        const found = existing.find((profile) => profile.id === expected.id);
        return found !== undefined && profileMatchesFixed(found, expected);
      });

    if (alreadyCanonical) {
      return;
    }

    const allowedIds = FIXED_PROFILES.map((profile) => profile.id);
    const extraProfileIds = existing
      .map((profile) => profile.id)
      .filter((id) => !allowedIds.includes(id));

    if (extraProfileIds.length > 0) {
      await this.proformaRepository.update(
        { profileId: In(extraProfileIds) },
        { profileId: 1 },
      );
      await this.profileRepository.delete({ id: In(extraProfileIds) });
      this.logger.warn(
        `Perfiles no oficiales eliminados: [${extraProfileIds.join(', ')}]`,
      );
    }

    for (const profile of FIXED_PROFILES) {
      await this.profileRepository.save(profile);
    }

    this.logger.log(
      `Perfiles oficiales sincronizados (${FIXED_PROFILES.length} registros, ids 1 y 2)`,
    );
  }

  private async seedCustomer(): Promise<void> {
    const exists = await this.customerRepository.exists({ where: { id: 1 } });
    if (exists) {
      return;
    }

    await this.customerRepository.save({
      id: 1,
      nombreCliente: 'Constructora Andina S.A.',
      rucCedula: '1790123456001',
      direccion: 'Av. Amazonas N12-34, Quito',
      telefono: '022345678',
      correo: 'contacto@constructoraandina.com',
    });

    this.logger.log('Cliente de prueba insertado (id: 1)');
  }
}
