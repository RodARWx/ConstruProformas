import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proforma } from '../proformas/entities/proforma.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

/** Límite máximo de resultados para autocompletado en proformas */
const MAX_SEARCH_RESULTS = 50;
const DEFAULT_SEARCH_LIMIT = 20;

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Proforma)
    private readonly proformaRepository: Repository<Proforma>,
  ) {}

  async findAll(): Promise<Customer[]> {
    return this.customerRepository.find({ order: { nombreCliente: 'ASC' } });
  }

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } });

    if (!customer) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    await this.assertRucCedulaAvailable(dto.rucCedula);

    const customer = this.customerRepository.create({
      nombreCliente: dto.nombreCliente,
      rucCedula: dto.rucCedula,
      direccion: dto.direccion ?? null,
      telefono: dto.telefono ?? null,
      correo: dto.correo ?? null,
      discountPercentage: dto.discountPercentage ?? 0,
    });

    return this.customerRepository.save(customer);
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);

    if (dto.rucCedula !== undefined && dto.rucCedula !== customer.rucCedula) {
      await this.assertRucCedulaAvailable(dto.rucCedula, id);
      customer.rucCedula = dto.rucCedula;
    }

    if (dto.nombreCliente !== undefined) customer.nombreCliente = dto.nombreCliente;
    if (dto.direccion !== undefined) customer.direccion = dto.direccion;
    if (dto.telefono !== undefined) customer.telefono = dto.telefono;
    if (dto.correo !== undefined) customer.correo = dto.correo;
    if (dto.discountPercentage !== undefined) {
      customer.discountPercentage = dto.discountPercentage;
    }

    return this.customerRepository.save(customer);
  }

  /**
   * Elimina un cliente solo si no está referenciado por proformas existentes.
   */
  async remove(id: number): Promise<void> {
    await this.findOne(id);

    const proformasCount = await this.proformaRepository.count({
      where: { customerId: id },
    });

    if (proformasCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el cliente ${id}: está asociado a ${proformasCount} proforma(s)`,
      );
    }

    await this.customerRepository.delete(id);
  }

  /**
   * Búsqueda por coincidencia parcial (LIKE) sobre nombre del cliente o RUC/Cédula.
   * Patrón alineado con GET /catalog/search para selección en Nueva Proforma.
   */
  async searchByText(term: string, limit = DEFAULT_SEARCH_LIMIT): Promise<Customer[]> {
    const normalizedTerm = term.trim();

    if (!normalizedTerm) {
      return [];
    }

    const safeLimit = Math.min(Math.max(limit, 1), MAX_SEARCH_RESULTS);
    const likePattern = `%${normalizedTerm}%`;

    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.nombreCliente LIKE :term', { term: likePattern })
      .orWhere('customer.rucCedula LIKE :term', { term: likePattern })
      .orderBy('customer.nombreCliente', 'ASC')
      .take(safeLimit)
      .getMany();
  }

  private async assertRucCedulaAvailable(
    rucCedula: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.customerRepository.findOne({
      where: { rucCedula },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `El RUC/Cédula "${rucCedula}" ya está registrado`,
      );
    }
  }
}
