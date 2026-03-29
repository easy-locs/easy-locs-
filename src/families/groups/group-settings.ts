/**
 * group.settings — Canonical group configuration model.
 */

export interface GroupConfig {
  title: string;
  description?: string;
  avatarUrl?: string;
  onlyAdminsCanPost?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  onlyAdminsCanAddMembers?: boolean;
  disappearTimer?: string;
  muteNotifications?: boolean;
}

export const GroupSettings = {
  /** Build default group config */
  defaults(): GroupConfig {
    return {
      title: "",
      onlyAdminsCanPost: false,
      onlyAdminsCanEditInfo: false,
      onlyAdminsCanAddMembers: false,
      muteNotifications: false,
    };
  },

  /** Merge partial settings into existing config */
  merge(current: GroupConfig, updates: Partial<GroupConfig>): GroupConfig {
    return { ...current, ...updates };
  },

  /** Check if user can post based on settings and role */
  canPost(config: GroupConfig, isAdmin: boolean): boolean {
    if (!config.onlyAdminsCanPost) return true;
    return isAdmin;
  },

  /** Check if user can edit group info */
  canEditInfo(config: GroupConfig, isAdmin: boolean): boolean {
    if (!config.onlyAdminsCanEditInfo) return true;
    return isAdmin;
  },

  /** Check if user can add members */
  canAddMembers(config: GroupConfig, isAdmin: boolean): boolean {
    if (!config.onlyAdminsCanAddMembers) return true;
    return isAdmin;
  },
};
