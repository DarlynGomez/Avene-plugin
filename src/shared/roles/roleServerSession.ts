/**
 * What the panel has learned about the server this session
 * Only a transport failure marks it unavailable, a 5xx or an unsure reply never does
 */
export class RoleServerSession {
  private down = false;
  private readonly asked = new Set<string>();

  get unavailable(): boolean {
    return this.down;
  }

  /** For tests, a new panel starts with a fresh one */
  reset(): void {
    this.down = false;
    this.asked.clear();
  }

  markTransportFailure(): void {
    this.down = true;
  }

  /** True the first time a node is asked about, so a failing node is not asked again and again */
  shouldAsk(nodeId: string): boolean {
    if (this.down || this.asked.has(nodeId)) return false;
    this.asked.add(nodeId);
    return true;
  }
}
