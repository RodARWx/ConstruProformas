import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CatalogService } from './catalog.service';
import { ItemCatalog } from './entities/item-catalog.entity';
import { CategoriesService } from '../categories/categories.service';

describe('CatalogService - searchByText', () => {
  let service: CatalogService;

  const mockItems: Partial<ItemCatalog>[] = [
    {
      id: 1,
      codigoSugerido: 'CA001',
      descripcion: 'CÁLCULO ESTRUCTURAL POR M2',
      categoriaNombre: 'CÁLCULO',
    },
    {
      id: 2,
      codigoSugerido: 'E020',
      descripcion: 'CÁLCULO DE VOLÚMENES',
      categoriaNombre: 'ELABORACIONES',
    },
    {
      id: 3,
      codigoSugerido: 'A001',
      descripcion: 'ALQUILER DE ESTACIÓN TOTAL',
      categoriaNombre: 'ALQUILER',
    },
    {
      id: 4,
      codigoSugerido: 'A004',
      descripcion: 'ALQUILER DE DRONE FOTOGRAMÉTRICO',
      categoriaNombre: 'ALQUILER',
    },
    {
      id: 5,
      codigoSugerido: 'L012',
      descripcion: 'VUELO CON DRON',
      categoriaNombre: 'LEVANTAMIENTOS',
    },
  ];

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(mockItems),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockCategoriesService = {
    ensureDefaultCategory: jest.fn(),
    assertExists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: getRepositoryToken(ItemCatalog),
          useValue: mockRepository,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getMany.mockResolvedValue(mockItems);
  });

  it('debe encontrar registros ignorando tildes (ej. calculo -> CÁLCULO)', async () => {
    const results = await service.searchByText('calculo');
    expect(results).toHaveLength(2);
    expect(results[0].descripcion).toBe('CÁLCULO ESTRUCTURAL POR M2');
    expect(results[1].descripcion).toBe('CÁLCULO DE VOLÚMENES');
  });

  it('debe encontrar registros ignorando mayúsculas (ej. estacion -> ESTACIÓN)', async () => {
    const results = await service.searchByText('estacion');
    expect(results).toHaveLength(1);
    expect(results[0].descripcion).toBe('ALQUILER DE ESTACIÓN TOTAL');
  });

  it('debe buscar por código sugerido (ej. CA001)', async () => {
    const results = await service.searchByText('ca001');
    expect(results).toHaveLength(1);
    expect(results[0].codigoSugerido).toBe('CA001');
  });

  it('debe soportar búsqueda por múltiples palabras sin importar acentos (ej. drone foto)', async () => {
    const results = await service.searchByText('drone foto');
    expect(results).toHaveLength(1);
    expect(results[0].descripcion).toBe('ALQUILER DE DRONE FOTOGRAMÉTRICO');
  });

  it('debe retornar lista vacía si el término es vacío', async () => {
    const results = await service.searchByText('   ');
    expect(results).toHaveLength(0);
  });
});
