export const ID_PATTERN = /\{([A-Za-z0-9_]+)\}/g;

/** A color code is a hash and three or more hex digits, a longer run is never a slot value either */
export const HEX_PATTERN = /#[0-9A-Fa-f]{3,}(?![0-9A-Za-z_])/g;

/** Digits, joined by dots or dashes so a ratio, a criterion or a date is one token */
export const NUMBER_PATTERN = /\d+(?:[.-]\d+)*/g;

export const QUOTED_PATTERN = /"([^"]*)"|`([^`]*)`|“([^”]*)”/g;
