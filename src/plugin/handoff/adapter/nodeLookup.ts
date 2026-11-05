/** A layer by id, null when it is not there or the id is not one Figma can read, so a bad id is an answer and not a silence */
export async function nodeById(id: string): Promise<BaseNode | null> {
  try {
    return await figma.getNodeByIdAsync(id);
  } catch {
    return null;
  }
}
