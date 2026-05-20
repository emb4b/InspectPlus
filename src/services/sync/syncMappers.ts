import { SyncEntityName } from './syncSchema';
import { getBackendFieldMap, getLocalFieldMap } from './syncSchema';

export type SyncDto = object;
export type LocalSyncRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Maps one backend DTO object into a local app record
 * using the backend -> local field map from syncSchema.
 */
export function mapBackendToLocal<TLocal extends LocalSyncRecord = LocalSyncRecord>(
  entity: SyncEntityName,
  dto: SyncDto
): TLocal {
  const fieldMap = getBackendFieldMap(entity);
  const source = dto as Record<string, unknown>;

  const localRecord: LocalSyncRecord = {};

  for (const [backendField, localField] of Object.entries(fieldMap)) {
    localRecord[localField] = source[backendField];
  }

  return localRecord as TLocal;
}

/**
 * Maps one local app record into a backend DTO object
 * using the local -> backend field map from syncSchema.
 */
export function mapLocalToBackend<TDto extends Record<string, unknown> = Record<string, unknown>>(
  entity: SyncEntityName,
  record: LocalSyncRecord
): TDto {
  const fieldMap = getLocalFieldMap(entity);

  const backendDto: Record<string, unknown> = {};

  for (const [localField, backendField] of Object.entries(fieldMap)) {
    backendDto[backendField] = record[localField];
  }

  return backendDto as TDto;
}

/**
 * Maps an array of backend DTOs into local records.
 */
export function mapBackendListToLocal<TLocal extends LocalSyncRecord = LocalSyncRecord>(
  entity: SyncEntityName,
  dtos: SyncDto[]
): TLocal[] {
  return dtos.map((dto) => mapBackendToLocal<TLocal>(entity, dto));
}

/**
 * Maps an array of local records into backend DTOs.
 */
export function mapLocalListToBackend<TDto extends Record<string, unknown> = Record<string, unknown>>(
  entity: SyncEntityName,
  records: LocalSyncRecord[]
): TDto[] {
  return records.map((record) => mapLocalToBackend<TDto>(entity, record));
}

/**
 * Creates a local partial update payload from a backend DTO,
 * omitting fields that are undefined.
 */
export function mapBackendToLocalPartial(
  entity: SyncEntityName,
  dto: SyncDto
): LocalSyncRecord {
  const fieldMap = getBackendFieldMap(entity);
  const source = dto as Record<string, unknown>;

  const partial: LocalSyncRecord = {};

  for (const [backendField, localField] of Object.entries(fieldMap)) {
    if (source[backendField] !== undefined) {
      partial[localField] = source[backendField];
    }
  }

  return partial;
}

/**
 * Creates a backend partial update payload from a local record,
 * omitting fields that are undefined.
 */
export function mapLocalToBackendPartial(
  entity: SyncEntityName,
  record: LocalSyncRecord
): Record<string, unknown> {
  const fieldMap = getLocalFieldMap(entity);

  const partial: Record<string, unknown> = {};

  for (const [localField, backendField] of Object.entries(fieldMap)) {
    if (record[localField] !== undefined) {
      partial[backendField] = record[localField];
    }
  }

  return partial;
}

/**
 * Utility for normalizing pulled DTO payloads.
 * Keeps arrays as arrays, objects as objects, and converts missing values to null only if requested.
 */
export function normalizeMappedRecord<T extends Record<string, unknown>>(
  record: T,
  options: { nullifyUndefined?: boolean } = {}
): T {
  const { nullifyUndefined = false } = options;

  const normalized = Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (value === undefined && nullifyUndefined) {
        return [key, null];
      }

      if (Array.isArray(value)) {
        return [key, value];
      }

      if (isPlainObject(value)) {
        return [key, value];
      }

      return [key, value];
    })
  );

  return normalized as T;
}