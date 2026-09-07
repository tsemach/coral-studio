export interface CommunityDictionary {
  community: {
    common: {
      anonymousMember: string
    }
    time: {
      justNow: string
      minutesAgo: string
      hoursAgoOne: string
      hoursAgoFew: string
      hoursAgoMany: string
      yesterday: string
      daysAgo: string
    }
    topbar: {
      backToSite: string
      label: string
    }
    shell: {
      badge: string
      subtitle: string
      noTapesTitle: string
      noTapesBody: string
    }
    filterStatus: {
      label: string
      all: string
      seeking: string
      matched: string
    }
    feed: {
      loadError: string
      emptyTitle: string
      emptyBody: string
      createPost: string
      loadMore: string
      loadingMore: string
    }
    postCard: {
      pinned: string
      seekingReader: string
      readerMatched: string
      closed: string
      studioAdmin: string
      reply: string
      replies: string
      deadline: string
    }
    postForm: {
      trigger: string
      title: string
      subtitle: string
      closeDialog: string
      channelLabel: string
      channels: {
        readerSos: { label: string; desc: string }
        callboard: { label: string; desc: string }
        craftChat: { label: string; desc: string }
        general: { label: string; desc: string }
      }
      readerSpecifics: string
      whenNeedLines: string
      format: string
      atStudio: string
      online: string
      sceneDetailsLabel: string
      sceneDetailsPlaceholder: string
      auditionDetails: string
      opportunityType: string
      castingTypes: {
        studentFilm: string
        theatre: string
        feature: string
        commercial: string
        crewRec: string
      }
      submissionDeadline: string
      titleLabel: string
      titlePlaceholderReaderSos: string
      titlePlaceholderCallboard: string
      titlePlaceholderGeneral: string
      contentLabel: string
      contentPlaceholder: string
      attachmentsLabel: string
      optional: string
      filesSelectedOne: string
      filesSelectedMany: string
      cancel: string
      create: string
      publishing: string
      requiredError: string
    }
    postDetail: {
      closeModal: string
      close: string
      exitFullscreen: string
      enterFullscreen: string
      admin: string
      postedOn: string
      readerSosDetails: string
      requestedTime: string
      meetingFormat: string
      sceneCharacter: string
      changeStatusTo: string
      reopenSeeking: string
      closeRequest: string
      iCanRead: string
      offersToRead: string
      sessionRead: string
      sessionsRead: string
      // Both values include the trailing verb ("read"), e.g. "session read" /
      // "sessions read" -- there's no separate word appended in JSX.
      current: string
      confirmAsReader: string
      openRehearsalRoom: string
      submissionDeadline: string
      attachments: string
      downloadDocument: string
      discussion: string
      noReplies: string
      couldNotLoad: string
    }
    commentComposer: {
      writeResponse: string
      placeholder: string
      posting: string
      reply: string
    }
    deletePost: {
      trigger: string
      title: string
      body: string
      cancel: string
      delete: string
      deleting: string
    }
    sidesViewer: {
      label: string
      download: string
    }
    rehearsalRoom: {
      connecting: string
      backToPost: string
      couldNotJoin: string
    }
    tapeCard: {
      note: string
      notes: string
    }
    tapeForm: {
      trigger: string
      title: string
      subtitle: string
      closeDialog: string
      titleLabel: string
      titlePlaceholder: string
      descriptionLabel: string
      descriptionPlaceholder: string
      videoLabel: string
      remove: string
      or: string
      cancel: string
      create: string
      uploading: string
      publishing: string
      requiredTitleDescription: string
      requiredVideo: string
      uploadFailed: string
    }
    tapeRecorder: {
      permissionError: string
      turnOnCamera: string
      startRecording: string
      stopRecording: string
      cancel: string
    }
    tapeDetail: {
      closeModal: string
      notes: string
      addNoteHere: string
      noNotesYet: string
      close: string
    }
    tapeNoteTags: {
      objectiveAction: string
      truthfulnessListening: string
      vocalPhysicality: string
      framingEyeline: string
    }
    noteComposer: {
      addingNoteAt: string
      placeholder: string
      noCategory: string
      cancel: string
      addNote: string
      posting: string
    }
    deleteTape: {
      trigger: string
      title: string
      body: string
      cancel: string
      delete: string
      deleting: string
    }
    api: {
      unauthorized: string
      notFound: string
    }
    actions: {
      createPost: {
        missingFields: string
        invalidChannel: string
      }
      postNotFound: string
      updateReaderStatus: {
        invalidStatus: string
        unauthorized: string
      }
      addComment: {
        empty: string
      }
      deleteCommunityPost: {
        unauthorized: string
      }
      offerToRead: {
        notOpen: string
        ownPost: string
      }
      confirmReader: {
        unauthorized: string
        noOffer: string
      }
      rehearsalToken: {
        notAvailable: string
        unauthorized: string
      }
      createTape: {
        missingFields: string
      }
      addTapeNote: {
        empty: string
        invalidTimestamp: string
        invalidTag: string
      }
      tapeNotFound: string
      deleteTape: {
        unauthorized: string
      }
    }
  }
}

export const community: CommunityDictionary = {
  community: {
    common: {
      anonymousMember: 'Anonymous Member',
    },
    time: {
      justNow: 'Just now',
      minutesAgo: '{n}m ago',
      hoursAgoOne: '{n}h ago',
      hoursAgoFew: '{n}h ago',
      hoursAgoMany: '{n}h ago',
      yesterday: 'Yesterday',
      daysAgo: '{n}d ago',
    },
    topbar: {
      backToSite: 'Back to site',
      label: 'Community',
    },
    shell: {
      badge: 'Glumački Studio Community',
      subtitle:
        'A live collaborative hub to find line-reading partners, discover local castings and crew recommendations, and discuss scene work.',
      noTapesTitle: 'No tapes yet',
      noTapesBody: 'Be the first to share a self-tape or rehearsal clip for feedback.',
    },
    filterStatus: {
      label: 'Filter status:',
      all: 'All Requests',
      seeking: 'Seeking Reader Only',
      matched: 'Matched',
    },
    feed: {
      loadError: "Couldn't load the board. Try refreshing.",
      emptyTitle: 'No posts in this channel yet',
      emptyBody: 'Be the first to post a line-reading request, audition notice, or craft question.',
      createPost: 'Create a Post',
      loadMore: 'Load more',
      loadingMore: 'Loading more...',
    },
    postCard: {
      pinned: 'Pinned',
      seekingReader: 'Seeking Reader',
      readerMatched: 'Reader Matched',
      closed: 'Closed',
      studioAdmin: 'Studio Admin',
      reply: 'reply',
      replies: 'replies',
      deadline: 'Deadline:',
    },
    postForm: {
      trigger: '+ New Post',
      title: 'New post',
      subtitle: 'Share an audition opportunity, request a scene partner, or discuss acting technique.',
      closeDialog: 'Close dialog',
      channelLabel: 'Channel',
      channels: {
        readerSos: { label: '#reader-sos', desc: 'Need a reader' },
        callboard: { label: '#the-callboard', desc: 'Castings & Gigs' },
        craftChat: { label: '#craft-chat', desc: 'Scene technique' },
        general: { label: '#general', desc: 'Studio talk' },
      },
      readerSpecifics: 'Reader Request Specifics',
      whenNeedLines: 'When do you need lines read?',
      format: 'Format',
      atStudio: 'At Studio',
      online: 'Online',
      sceneDetailsLabel: 'Scene Details & Characters',
      sceneDetailsPlaceholder: 'e.g. 2 pages, dramatic scene opposite Sarah',
      auditionDetails: 'Audition & Casting Details',
      opportunityType: 'Opportunity Type',
      castingTypes: {
        studentFilm: 'Student Film',
        theatre: 'Theatre Production',
        feature: 'Feature / Indie Film',
        commercial: 'Commercial / VO',
        crewRec: 'Recommendation',
      },
      submissionDeadline: 'Submission Deadline',
      titleLabel: 'Title',
      titlePlaceholderReaderSos: 'e.g. Need a reader tonight for 20 mins',
      titlePlaceholderCallboard: 'e.g. Casting Female Lead for FDU Short',
      titlePlaceholderGeneral: 'What would you like to discuss or share?',
      contentLabel: 'Content',
      contentPlaceholder: 'Provide context, character notes, audition sides, or questions...',
      attachmentsLabel: 'Attachments',
      optional: '(optional)',
      filesSelectedOne: '1 file selected ({names})',
      filesSelectedMany: '{count} files selected ({names})',
      cancel: 'Cancel',
      create: 'Create',
      publishing: 'Publishing…',
      requiredError: 'Title and content cannot be empty.',
    },
    postDetail: {
      closeModal: 'Close modal',
      close: 'Close',
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
      admin: 'Admin',
      postedOn: 'Posted on',
      readerSosDetails: 'Reader SOS Session Details',
      requestedTime: 'Requested Time:',
      meetingFormat: 'Meeting Format:',
      sceneCharacter: 'Scene & Character:',
      changeStatusTo: 'Change status to:',
      reopenSeeking: '↺ Reopen as Seeking',
      closeRequest: 'Close Request',
      iCanRead: 'I can read this',
      offersToRead: 'Offers to read:',
      sessionRead: 'session read',
      sessionsRead: 'sessions read',
      current: 'Current',
      confirmAsReader: 'Confirm as reader',
      openRehearsalRoom: '🎥 Open Rehearsal Room',
      submissionDeadline: 'Submission Deadline:',
      attachments: 'Attachments',
      downloadDocument: 'Download document',
      discussion: 'Discussion',
      noReplies: 'No replies yet. Be the first to leave a note or offer to read!',
      couldNotLoad: "Couldn't load this post.",
    },
    commentComposer: {
      writeResponse: 'Write a response',
      placeholder: 'Offer to read lines, ask a question, or reply...',
      posting: 'Posting...',
      reply: 'Reply',
    },
    deletePost: {
      trigger: 'Delete Post',
      title: 'Delete post',
      body: 'Are you sure you want to delete this post? This action cannot be undone.',
      cancel: 'Cancel',
      delete: 'Delete',
      deleting: 'Deleting…',
    },
    sidesViewer: {
      label: 'Sides —',
      download: 'Download',
    },
    rehearsalRoom: {
      connecting: 'Connecting…',
      backToPost: 'Back to post',
      couldNotJoin: 'Could not join the rehearsal room',
    },
    tapeCard: {
      note: 'note',
      notes: 'notes',
    },
    tapeForm: {
      trigger: '+ New Tape',
      title: 'New tape',
      subtitle: 'Upload a self-tape or record one right now for peer feedback.',
      closeDialog: 'Close dialog',
      titleLabel: 'Title',
      titlePlaceholder: 'e.g. Hedda Gabler monologue, take 3',
      descriptionLabel: 'Description',
      descriptionPlaceholder: "What's the scene, and what kind of feedback are you looking for?",
      videoLabel: 'Video',
      remove: 'Remove',
      or: 'or',
      cancel: 'Cancel',
      create: 'Create',
      uploading: 'Uploading…',
      publishing: 'Publishing…',
      requiredTitleDescription: 'Title and description are required.',
      requiredVideo: 'Attach a video by uploading a file or recording one.',
      uploadFailed: 'Could not upload the video. Please try again.',
    },
    tapeRecorder: {
      permissionError: 'Could not access your camera and microphone. Check your browser permissions.',
      turnOnCamera: 'Turn on camera',
      startRecording: '● Start recording',
      stopRecording: '■ Stop recording',
      cancel: 'Cancel',
    },
    tapeDetail: {
      closeModal: 'Close modal',
      notes: 'Notes',
      addNoteHere: 'Add a note here',
      noNotesYet: 'No notes yet. Be the first to leave feedback.',
      close: 'Close',
    },
    tapeNoteTags: {
      objectiveAction: 'Objective & Action',
      truthfulnessListening: 'Truthfulness & Listening',
      vocalPhysicality: 'Vocal & Physicality',
      framingEyeline: 'Framing & Eyeline',
    },
    noteComposer: {
      addingNoteAt: 'Adding a note at',
      placeholder: 'What do you want to point out at this moment?',
      noCategory: 'No category',
      cancel: 'Cancel',
      addNote: 'Add note',
      posting: 'Posting...',
    },
    deleteTape: {
      trigger: 'Delete Tape',
      title: 'Delete tape',
      body: 'Are you sure you want to delete this tape and all its notes? This action cannot be undone.',
      cancel: 'Cancel',
      delete: 'Delete',
      deleting: 'Deleting…',
    },
    api: {
      unauthorized: 'Unauthorized',
      notFound: 'Not found',
    },
    actions: {
      createPost: {
        missingFields: 'Channel, title, and content are required',
        invalidChannel: 'Invalid community channel',
      },
      postNotFound: 'Post not found',
      updateReaderStatus: {
        invalidStatus: 'Invalid status',
        unauthorized: 'Unauthorized to update this post',
      },
      addComment: {
        empty: 'Comment cannot be empty',
      },
      deleteCommunityPost: {
        unauthorized: 'Unauthorized to delete this post',
      },
      offerToRead: {
        notOpen: 'This post is not open for offers',
        ownPost: "You can't offer to read your own post",
      },
      confirmReader: {
        unauthorized: 'Unauthorized to confirm a reader for this post',
        noOffer: "This member hasn't offered to read this post",
      },
      rehearsalToken: {
        notAvailable: 'This rehearsal room is not available',
        unauthorized: 'Unauthorized to join this rehearsal room',
      },
      createTape: {
        missingFields: 'Title, description, and a video are required',
      },
      addTapeNote: {
        empty: 'Note cannot be empty',
        invalidTimestamp: 'Invalid timestamp',
        invalidTag: 'Invalid tag',
      },
      tapeNotFound: 'Tape not found',
      deleteTape: {
        unauthorized: 'Unauthorized to delete this tape',
      },
    },
  },
}
