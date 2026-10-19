import { RoleServerSession } from "../../shared/roles/roleServerSession";

/** One for the whole panel, a transport failure switches live requests off until the panel is reopened */
export const roleServerSession = new RoleServerSession();
