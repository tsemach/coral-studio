import type { AdminDictionary } from '../en/admin'

export const admin: AdminDictionary = {
  admin: {
    settingsPage: {
      metaTitle: 'Podešavanja — Glumački Studio',
      backToSite: 'Nazad na sajt',
      eyebrow: 'Admin',
      title: 'Podešavanja',
      signedInAs: 'Prijavljeni ste kao',
      roleLabel: 'uloga',
      roleAdmin: 'Administrator',
      navLabel: 'Podešavanja',
      usersNavItem: 'Korisnici',
    },
    usersView: {
      navLabel: 'Pregled korisnika',
      activeUsersLabel: 'Aktivni korisnici',
      pendingUsersLabel: 'Korisnici na čekanju',
      approveAll: 'Odobri sve',
    },
    pendingUsersPanel: {
      empty: 'Nema registracija koje čekaju odobrenje.',
      approve: 'Odobri',
      reject: 'Odbij',
    },
    registeredUsersPanel: {
      empty: 'Još nema registrovanih korisnika.',
      roleAdmin: 'Administrator',
      roleUser: 'Korisnik',
    },
    deleteUserButton: {
      delete: 'Obriši',
      confirmTitle: 'Obrisati korisnika?',
      confirmBodyPrefix: 'Obrisati',
      confirmBodySuffix: 'Ovo trajno uklanja njihov nalog i ne može se poništiti.',
      cancel: 'Otkaži',
    },
    refreshButton: {
      ariaLabel: 'Osveži korisnike na čekanju',
    },
  },
}
