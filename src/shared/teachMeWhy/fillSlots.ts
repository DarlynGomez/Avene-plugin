export interface SlotValues {
  measured: string;
  required: string;
}

/** Measured to two decimals and required as the panel prints it, 4.5:1 and 3:1 */
export function slotValues(measuredRatio: number, requiredRatio: number): SlotValues {
  return { measured: `${measuredRatio.toFixed(2)}:1`, required: `${requiredRatio}:1` };
}

/** Puts the plugin's own measurements where the stored text holds a placeholder */
export function fillSlots(text: string, measuredRatio: number, requiredRatio: number): string {
  const values = slotValues(measuredRatio, requiredRatio);
  return text.replaceAll("{measured}", values.measured).replaceAll("{required}", values.required);
}
