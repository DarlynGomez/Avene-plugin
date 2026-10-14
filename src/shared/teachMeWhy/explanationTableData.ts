import tableData from "./explanationTable.json";
import type { ExplanationTable } from "./explanationTypes";

/** The reviewed table as shipped, the only place explanation text comes from */
export const EXPLANATION_TABLE = tableData as unknown as ExplanationTable;
