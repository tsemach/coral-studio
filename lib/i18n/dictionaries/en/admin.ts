export interface AdminDictionary {
  admin: {
    settingsPage: {
      metaTitle: string
      backToSite: string
      eyebrow: string
      title: string
      signedInAs: string
      roleLabel: string
      roleAdmin: string
      navLabel: string
      usersNavItem: string
    }
    usersView: {
      navLabel: string
      activeUsersLabel: string
      pendingUsersLabel: string
      approveAll: string
    }
    pendingUsersPanel: {
      empty: string
      approve: string
      reject: string
    }
    registeredUsersPanel: {
      empty: string
      roleAdmin: string
      roleUser: string
    }
    deleteUserButton: {
      delete: string
      confirmTitle: string
      confirmBodyPrefix: string
      confirmBodySuffix: string
      cancel: string
    }
    refreshButton: {
      ariaLabel: string
    }
  }
}

export const admin: AdminDictionary = {
  admin: {
    settingsPage: {
      metaTitle: 'Settings — Glumački Studio',
      backToSite: 'Back to site',
      eyebrow: 'Admin',
      title: 'Settings',
      signedInAs: 'Signed in as',
      roleLabel: 'role',
      roleAdmin: 'Admin',
      navLabel: 'Settings',
      usersNavItem: 'Users',
    },
    usersView: {
      navLabel: 'Users view',
      activeUsersLabel: 'Active users',
      pendingUsersLabel: 'Pending users',
      approveAll: 'Approve all',
    },
    pendingUsersPanel: {
      empty: 'No registrations are waiting for approval.',
      approve: 'Approve',
      reject: 'Reject',
    },
    registeredUsersPanel: {
      empty: 'No registered users yet.',
      roleAdmin: 'Admin',
      roleUser: 'User',
    },
    deleteUserButton: {
      delete: 'Delete',
      confirmTitle: 'Delete user?',
      confirmBodyPrefix: 'Delete',
      confirmBodySuffix: 'This permanently removes their account and cannot be undone.',
      cancel: 'Cancel',
    },
    refreshButton: {
      ariaLabel: 'Refresh pending users',
    },
  },
}
