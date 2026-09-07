export interface WorkshopsDictionary {
  workshops: {
    topbar: {
      backToSite: string
      sectionLabel: string
      title: string
    }
    goLiveButton: {
      goLive: string
      liveJoin: string
    }
    sidebar: {
      searchPlaceholder: string
      noMatchPrefix: string
      noMatchSuffix: string
      resizeLabel: string
    }
    card: {
      memberCount: (count: number) => string
    }
    cardMenu: {
      optionsLabel: string
      edit: string
      addUser: string
      scheduleRehearsal: string
      leaveWorkshop: string
      delete: string
      deleteDialogTitle: string
      deleteDialogBodyPrefix: string
      deleteDialogBodySuffix: string
      cancel: string
    }
    formDialog: {
      newWorkshopLabel: string
      editTitle: string
      createTitle: string
      editSubtitle: string
      createSubtitle: string
      titleLabel: string
      titlePlaceholder: string
      scriptLabel: string
      optional: string
      noScript: string
      addPeopleLabel: string
      addPersonPlaceholder: string
      partPlaceholder: string
      removeLabel: string
      cancel: string
      save: string
      create: string
      actorOption: string
      viewerOption: string
    }
    addMemberDialog: {
      trigger: string
      title: string
      subtitle: string
      userLabel: string
      typeLabel: string
      partLabel: string
      add: string
      cancel: string
      genericError: string
    }
    userPicker: {
      defaultPlaceholder: string
      noOthersAvailable: string
      noMatches: string
    }
    scheduleRehearsalDialog: {
      trigger: string
      title: string
      subtitle: string
      studioOption: string
      onlineOption: string
      syncCalendarLabel: string
      cancel: string
      save: string
    }
    cancelRehearsalButton: {
      ariaLabel: string
      confirmTitle: string
      confirmBody: string
      keepIt: string
      confirmButton: string
    }
    detailsPanel: {
      groupLabel: string
      noMembers: string
      rehearsalLabel: string
      noRehearsalScheduled: string
      online: string
      studio: string
      setFromHint: string
    }
    memberRow: {
      actor: string
      viewer: string
      edit: string
      close: string
      remove: string
      save: string
      partPlaceholder: string
    }
    main: {
      sectionLabel: string
      noWorkshopSelected: string
      emptyHintCreate: string
      emptyHintChoose: string
    }
    scriptPanel: {
      scriptLabel: string
      noScriptAttached: string
      increaseFontSize: string
      decreaseFontSize: string
      boldMarkedLines: string
      unboldMarkedLines: string
      markAPartFirst: string
      erasePartMark: string
      markAPart: string
      attachScriptToMark: string
      showAsOneColumn: string
      splitByCharacter: string
      needsCharactersToSplit: string
      showGroupDetails: string
      expandPanel: string
      noScriptsAvailable: string
      attachHint: string
      chooseScript: string
      attach: string
      resizeLabel: string
    }
    markPartDialog: {
      title: string
      subtitle: string
      highlightColorLabel: string
      useColorPrefix: string
      useColorSuffix: string
      markForMe: string
      cancel: string
    }
    videoRoom: {
      joining: string
      addMe: string
      couldNotJoin: string
      backToWorkshop: string
      connecting: string
    }
    errors: {
      unknownScript: string
      invalidEmail: string
      noActiveUserFound: string
      genericError: string
      deleteInsteadOfLeave: string
    }
  }
}

function memberCount(count: number): string {
  return `${count} ${count === 1 ? 'member' : 'members'}`
}

export const workshops: WorkshopsDictionary = {
  workshops: {
    topbar: {
      backToSite: 'Back to site',
      sectionLabel: 'Workshops',
      title: 'Rehearsal Room',
    },
    goLiveButton: {
      goLive: 'Go live',
      liveJoin: 'Live · Join',
    },
    sidebar: {
      searchPlaceholder: 'Search workshops',
      noMatchPrefix: 'No workshops match "',
      noMatchSuffix: '".',
      resizeLabel: 'Resize workshop list',
    },
    card: {
      memberCount,
    },
    cardMenu: {
      optionsLabel: 'Workshop options',
      edit: 'Edit',
      addUser: 'Add user',
      scheduleRehearsal: 'Schedule Rehearsal',
      leaveWorkshop: 'Leave workshop',
      delete: 'Delete',
      deleteDialogTitle: 'Delete workshop?',
      deleteDialogBodyPrefix: 'Delete ',
      deleteDialogBodySuffix: '? This permanently removes it and cannot be undone.',
      cancel: 'Cancel',
    },
    formDialog: {
      newWorkshopLabel: 'New workshop',
      editTitle: 'Edit workshop',
      createTitle: 'New workshop',
      editSubtitle: 'Update the title or script, or add more people to the group.',
      createSubtitle: 'Only a title is required -- attach a script and add people now, or come back later.',
      titleLabel: 'Title',
      titlePlaceholder: 'Untitled workshop',
      scriptLabel: 'Script',
      optional: '(optional)',
      noScript: 'No script',
      addPeopleLabel: 'Add people',
      addPersonPlaceholder: 'Add a person…',
      partPlaceholder: 'Part',
      removeLabel: 'Remove',
      cancel: 'Cancel',
      save: 'Save',
      create: 'Create',
      actorOption: 'Actor',
      viewerOption: 'Viewer',
    },
    addMemberDialog: {
      trigger: 'Add user',
      title: 'Add a member',
      subtitle: 'Type a name or email, or pick from the list, to add an existing active user.',
      userLabel: 'User',
      typeLabel: 'Type',
      partLabel: 'Part',
      add: 'Add',
      cancel: 'Cancel',
      genericError: 'Something went wrong',
    },
    userPicker: {
      defaultPlaceholder: 'Select a user…',
      noOthersAvailable: 'No other active users available',
      noMatches: 'No matches',
    },
    scheduleRehearsalDialog: {
      trigger: 'Schedule Rehearsal',
      title: 'Schedule rehearsal',
      subtitle: "Set when this workshop's group next meets.",
      studioOption: 'Studio',
      onlineOption: 'Online',
      syncCalendarLabel: 'Set google calendar',
      cancel: 'Cancel',
      save: 'Save',
    },
    cancelRehearsalButton: {
      ariaLabel: 'Cancel rehearsal',
      confirmTitle: 'Cancel rehearsal?',
      confirmBody: 'This clears the scheduled date and sends a cancellation notice to everyone who was invited.',
      keepIt: 'Keep it',
      confirmButton: 'Cancel rehearsal',
    },
    detailsPanel: {
      groupLabel: 'Group',
      noMembers: 'No members yet.',
      rehearsalLabel: 'Rehearsal',
      noRehearsalScheduled: 'No rehearsal scheduled',
      online: 'Online',
      studio: 'Studio',
      setFromHint: 'Set from "Schedule Rehearsal" in the top bar or the workshop\'s menu.',
    },
    memberRow: {
      actor: 'Actor',
      viewer: 'Viewer',
      edit: 'Edit',
      close: 'Close',
      remove: 'Remove',
      save: 'Save',
      partPlaceholder: 'Part (optional)',
    },
    main: {
      sectionLabel: 'Workshops',
      noWorkshopSelected: 'No workshop selected',
      emptyHintCreate:
        'Create a workshop from the sidebar to start building a group, scheduling a rehearsal, and attaching a script.',
      emptyHintChoose: 'Choose a workshop from the sidebar.',
    },
    scriptPanel: {
      scriptLabel: 'Script',
      noScriptAttached: 'No script attached',
      increaseFontSize: 'Increase font size',
      decreaseFontSize: 'Decrease font size',
      boldMarkedLines: 'Bold marked lines',
      unboldMarkedLines: 'Unbold marked lines',
      markAPartFirst: 'Mark a part first',
      erasePartMark: 'Erase part mark',
      markAPart: 'Mark a part',
      attachScriptToMark: 'Attach a script with speaking characters to mark a part',
      showAsOneColumn: 'Show script as one column',
      splitByCharacter: 'Split script by character',
      needsCharactersToSplit: 'Needs 2-3 speaking characters to split',
      showGroupDetails: 'Show group details',
      expandPanel: 'Expand script panel',
      noScriptsAvailable: 'No scripts are available to attach yet.',
      attachHint: 'Attach a script to render it here.',
      chooseScript: 'Choose a script',
      attach: 'Attach',
      resizeLabel: 'Resize script panel',
    },
    markPartDialog: {
      title: 'Mark a part',
      subtitle: "Choose which character's lines to highlight.",
      highlightColorLabel: 'Highlight color',
      useColorPrefix: 'Use',
      useColorSuffix: 'highlight',
      markForMe: 'Mark for me',
      cancel: 'Cancel',
    },
    videoRoom: {
      joining: 'Joining…',
      addMe: 'Add me',
      couldNotJoin: 'Could not join the live session',
      backToWorkshop: 'Back to workshop',
      connecting: 'Connecting…',
    },
    errors: {
      unknownScript: 'Unknown script',
      invalidEmail: 'Enter a valid email address',
      noActiveUserFound: 'No active user found with that email',
      genericError: 'Something went wrong',
      deleteInsteadOfLeave: 'Leave the workshop instead -- delete only works once you are the last member',
    },
  },
}
