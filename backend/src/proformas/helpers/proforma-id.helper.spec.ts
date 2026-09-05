import {
  PROFORMA_ID_PREFIX,
  buildProformaId,
  findMaxSequenceForYear,
  parseProformaId,
} from './proforma-id.helper';

describe('proforma-id.helper', () => {
  describe('buildProformaId', () => {
    it('construye ID con formato CM_PROF-{numero}-{año}', () => {
      expect(buildProformaId(200, 2026)).toBe('CM_PROF-200-2026');
      expect(buildProformaId(1, 2026)).toBe('CM_PROF-1-2026');
    });
  });

  describe('parseProformaId', () => {
    it('parsea formato nuevo CM_PROF-200-2026', () => {
      expect(parseProformaId('CM_PROF-200-2026')).toEqual({
        sequence: 200,
        year: 2026,
      });
    });

    it('parsea formato heredado CM-PROF-200-2026', () => {
      expect(parseProformaId('CM-PROF-200-2026')).toEqual({
        sequence: 200,
        year: 2026,
      });
    });

    it('rechaza strings inválidos', () => {
      expect(parseProformaId('CM-PROF')).toBeNull();
      expect(parseProformaId('')).toBeNull();
    });
  });

  describe('findMaxSequenceForYear', () => {
    it('retorna el número máximo para el año dado', () => {
      const ids = ['CM_PROF-200-2026', 'CM_PROF-205-2026', 'CM_PROF-300-2025'];
      expect(findMaxSequenceForYear(ids, 2026)).toBe(205);
    });

    it('retorna 0 si no hay coincidencias para el año', () => {
      expect(findMaxSequenceForYear(['CM_PROF-10-2025'], 2026)).toBe(0);
    });
  });
});
