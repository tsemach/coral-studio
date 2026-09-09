import type { ScriptsDictionary } from '../en/scripts'

export const scripts: ScriptsDictionary = {
  scripts: {
    shell: {
      adminLabel: 'Administracija',
      title: 'Skripte',
      backToSite: 'Nazad na sajt',
    },
    sidebar: {
      searchPlaceholder: 'Pretraži skripte',
      empty: 'Još uvek nema otpremljenih skripti.',
      noMatchPrefix: 'Nema skripti koje odgovaraju upitu "',
      noMatchSuffix: '".',
    },
    addDialog: {
      addScript: 'Dodaj skriptu',
      title: 'Dodaj skriptu',
      description: 'Otpremite JSON fajl koji odgovara šemi skripte (title, scene, script_flow).',
      cancel: 'Otkaži',
      submit: 'Dodaj',
      submitting: 'Otpremanje…',
      chooseFileError: 'Izaberite JSON fajl za otpremanje.',
      uploadFailedError: 'Nešto je pošlo po zlu prilikom otpremanja skripte. Pokušajte ponovo.',
    },
    cardMenu: {
      optionsLabel: 'Opcije skripte',
      delete: 'Obriši',
      deleteDialogTitle: 'Obrisati skriptu?',
      deleteDialogBodyPrefix: 'Obrisati ',
      deleteDialogBodySuffix:
        '? Svaka radionica uz koju je prikačena će nakon toga prikazivati "skripta nije prikačena". Ovo se ne može poništiti.',
      cancel: 'Otkaži',
    },
    preview: {
      noScriptSelected: 'Nijedna skripta nije izabrana',
      selectPrompt: 'Izaberite skriptu sa liste sa leve strane.',
      label: 'Skripta',
      unboldMarkedLines: 'Ukloni podebljanje označenih replika',
      boldMarkedLines: 'Podebljaj označene replike',
      markAPartFirst: 'Prvo označite deo',
      erasePartMark: 'Ukloni oznaku dela',
      markAPart: 'Označi deo',
      attachScriptTooltip: 'Prikačite skriptu sa govornim likovima da biste označili deo',
      showAsOneColumn: 'Prikaži skriptu u jednoj koloni',
      splitByCharacter: 'Podeli skriptu po liku',
      needsCharactersTooltip: 'Potrebna su 2-3 govorna lika za podelu',
    },
    panels: {
      prompt: 'Prompt',
    },
    promptPanel: {
      heading: 'AI prompt za konverziju',
      copy: 'Kopiraj',
      copied: 'Kopirano',
      closeLabel: 'Zatvori prompt',
    },
  },
}
