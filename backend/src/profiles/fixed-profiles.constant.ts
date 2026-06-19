import { Profile } from './entities/profile.entity';

/** Datos fijos de los dos perfiles oficiales de Construmétrica (ids 1 y 2). */
export type FixedProfileSeed = Pick<
  Profile,
  'id' | 'nombre' | 'cargo' | 'registroSenescyt' | 'telefono' | 'correo'
>;

export const FIXED_PROFILES: FixedProfileSeed[] = [
  {
    id: 1,
    nombre: 'Ing. Mario David Lincango Callatasig',
    cargo: 'Gerente General',
    registroSenescyt: '1005-2018-1984075',
    telefono: '0992914455',
    correo: 'mario.lincango@construmetrica.com',
  },
  {
    id: 2,
    nombre: 'Ing. Francisco Paul López Males',
    cargo: 'Presidente',
    registroSenescyt: '1005-2018-1984076',
    telefono: '0997373003',
    correo: 'francisco.lopez@construmetrica.com',
  },
];

export function profileMatchesFixed(
  profile: Profile,
  expected: FixedProfileSeed,
): boolean {
  return (
    profile.id === expected.id &&
    profile.nombre === expected.nombre &&
    profile.cargo === expected.cargo &&
    profile.registroSenescyt === expected.registroSenescyt &&
    profile.telefono === expected.telefono &&
    profile.correo === expected.correo
  );
}
