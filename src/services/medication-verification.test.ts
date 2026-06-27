jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64encodedimage=='),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: null },
}));

import {
  MedicationVerificationError,
  verifyMedicationPhoto,
} from './medication-verification';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockOkResponse(body: object) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function mockErrorResponse(status: number, body = '') {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  });
}

describe('verifyMedicationPhoto', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('success cases', () => {
    it('returns containsMedication=true with high confidence', async () => {
      mockOkResponse({ contains_medication: true, confidence: 'high' });
      const result = await verifyMedicationPhoto('file://photo.jpg');
      expect(result.containsMedication).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('returns containsMedication=false with high confidence', async () => {
      mockOkResponse({ contains_medication: false, confidence: 'high' });
      const result = await verifyMedicationPhoto('file://photo.jpg');
      expect(result.containsMedication).toBe(false);
      expect(result.confidence).toBe('high');
    });

    it('accepts medium confidence response', async () => {
      mockOkResponse({ contains_medication: true, confidence: 'medium' });
      const result = await verifyMedicationPhoto('file://photo.jpg');
      expect(result.confidence).toBe('medium');
    });

    it('accepts camelCase containsMedication field from API', async () => {
      mockOkResponse({ containsMedication: true, confidence: 'high' });
      const result = await verifyMedicationPhoto('file://photo.jpg');
      expect(result.containsMedication).toBe(true);
    });

    it('returns low confidence result (not a service-level failure)', async () => {
      mockOkResponse({ contains_medication: true, confidence: 'low' });
      const result = await verifyMedicationPhoto('file://photo.jpg');
      expect(result.containsMedication).toBe(true);
      expect(result.confidence).toBe('low');
    });
  });

  describe('API error cases', () => {
    it('throws MedicationVerificationError on non-ok HTTP status', async () => {
      mockErrorResponse(500, JSON.stringify({ detail: 'Server error' }));
      await expect(verifyMedicationPhoto('file://photo.jpg')).rejects.toThrow(
        MedicationVerificationError
      );
    });

    it('throws MedicationVerificationError when response has invalid shape', async () => {
      mockOkResponse({ contains_medication: 'yes', confidence: 'high' });
      await expect(verifyMedicationPhoto('file://photo.jpg')).rejects.toThrow(
        MedicationVerificationError
      );
    });

    it('throws when confidence value is unrecognised', async () => {
      mockOkResponse({ contains_medication: true, confidence: 'extreme' });
      await expect(verifyMedicationPhoto('file://photo.jpg')).rejects.toThrow(
        MedicationVerificationError
      );
    });
  });

  describe('network error cases', () => {
    it('throws MedicationVerificationError when fetch rejects (network error)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));
      await expect(verifyMedicationPhoto('file://photo.jpg')).rejects.toThrow(
        MedicationVerificationError
      );
      await expect(verifyMedicationPhoto('file://photo.jpg')).rejects.toThrow(
        'Unable to reach the medication verification API.'
      );
    });

    it('throws timeout error when AbortController fires', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);
      await expect(verifyMedicationPhoto('file://photo.jpg')).rejects.toThrow(
        'Medication verification timed out.'
      );
    });

    it('thrown error is always a MedicationVerificationError instance', async () => {
      mockFetch.mockRejectedValueOnce(new Error('some error'));
      try {
        await verifyMedicationPhoto('file://photo.jpg');
        fail('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(MedicationVerificationError);
        expect((err as Error).name).toBe('MedicationVerificationError');
      }
    });
  });
});
