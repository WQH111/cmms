import type { CustomFields } from '../types/TreeNode';

export const AH_LEVEL_FIELD_KEY = 'cf1';
export const AH_LEVEL_LABEL = 'AH LEVEL';
export const AH_LEVEL_LABEL_HEADER = 'cf1 label (AH Level Name)';
export const AH_LEVEL_VALUE_HEADER = 'cf1 value (AH Level code)';

export function ensureAhLevelCustomField(
  customFields: CustomFields | undefined,
  level: number
): CustomFields {
  const nextFields: CustomFields = customFields
    ? JSON.parse(JSON.stringify(customFields))
    : {};

  const existingField = nextFields[AH_LEVEL_FIELD_KEY] || {};

  nextFields[AH_LEVEL_FIELD_KEY] = {
    ...existingField,
    label: AH_LEVEL_LABEL,
    value: String(level),
    labelHeader: existingField.labelHeader || AH_LEVEL_LABEL_HEADER,
    valueHeader: existingField.valueHeader || AH_LEVEL_VALUE_HEADER,
  };

  return nextFields;
}

export function normalizeCustomFieldsJson(
  customFieldsJson: string | null | undefined,
  level: number
): string {
  let parsedFields: CustomFields | undefined;

  if (customFieldsJson) {
    try {
      parsedFields = JSON.parse(customFieldsJson) as CustomFields;
    } catch (_error) {
      parsedFields = undefined;
    }
  }

  return JSON.stringify(ensureAhLevelCustomField(parsedFields, level));
}
