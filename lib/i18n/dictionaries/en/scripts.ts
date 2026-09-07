export interface ScriptsDictionary {
  scripts: {
    shell: {
      adminLabel: string
      title: string
      backToSite: string
    }
    sidebar: {
      searchPlaceholder: string
      empty: string
      noMatchPrefix: string
      noMatchSuffix: string
    }
    addDialog: {
      addScript: string
      title: string
      description: string
      cancel: string
      submit: string
      submitting: string
      chooseFileError: string
      uploadFailedError: string
    }
    cardMenu: {
      optionsLabel: string
      delete: string
      deleteDialogTitle: string
      deleteDialogBodyPrefix: string
      deleteDialogBodySuffix: string
      cancel: string
    }
    preview: {
      noScriptSelected: string
      selectPrompt: string
      label: string
      unboldMarkedLines: string
      boldMarkedLines: string
      markAPartFirst: string
      erasePartMark: string
      markAPart: string
      attachScriptTooltip: string
      showAsOneColumn: string
      splitByCharacter: string
      needsCharactersTooltip: string
    }
    panels: {
      prompt: string
    }
    promptPanel: {
      heading: string
      copy: string
      copied: string
      closeLabel: string
    }
  }
}

export const scripts: ScriptsDictionary = {
  scripts: {
    shell: {
      adminLabel: 'Admin',
      title: 'Scripts',
      backToSite: 'Back to site',
    },
    sidebar: {
      searchPlaceholder: 'Search scripts',
      empty: 'No scripts uploaded yet.',
      noMatchPrefix: 'No scripts match "',
      noMatchSuffix: '".',
    },
    addDialog: {
      addScript: 'Add script',
      title: 'Add a script',
      description: 'Upload a JSON file matching the script schema (title, scene, script_flow).',
      cancel: 'Cancel',
      submit: 'Add',
      submitting: 'Uploading…',
      chooseFileError: 'Choose a JSON file to upload.',
      uploadFailedError: 'Something went wrong uploading the script. Try again.',
    },
    cardMenu: {
      optionsLabel: 'Script options',
      delete: 'Delete',
      deleteDialogTitle: 'Delete script?',
      deleteDialogBodyPrefix: 'Delete ',
      deleteDialogBodySuffix:
        '? Any workshop with it attached will show "no script attached" afterward. This cannot be undone.',
      cancel: 'Cancel',
    },
    preview: {
      noScriptSelected: 'No script selected',
      selectPrompt: 'Select a script from the list on the left.',
      label: 'Script',
      unboldMarkedLines: 'Unbold marked lines',
      boldMarkedLines: 'Bold marked lines',
      markAPartFirst: 'Mark a part first',
      erasePartMark: 'Erase part mark',
      markAPart: 'Mark a part',
      attachScriptTooltip: 'Attach a script with speaking characters to mark a part',
      showAsOneColumn: 'Show script as one column',
      splitByCharacter: 'Split script by character',
      needsCharactersTooltip: 'Needs 2-3 speaking characters to split',
    },
    panels: {
      prompt: 'Prompt',
    },
    promptPanel: {
      heading: 'AI conversion prompt',
      copy: 'Copy',
      copied: 'Copied',
      closeLabel: 'Close prompt',
    },
  },
}
