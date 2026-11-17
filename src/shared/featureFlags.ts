/** Off by default because variable scope edits shared tokens and is untested in Figma */
export const FEATURE_VARIABLE_SCOPE = false;

/**
 * On outside a session, so the exploration segment after the study shows markers
 * They draw one temporary frame into the designer's file, during a session they follow what the participant may see
 */
export const FEATURE_MARKERS = true;
