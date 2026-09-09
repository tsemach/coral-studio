import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { AboutSection } from '@/components/about-section'
import { DisciplinesSection } from '@/components/disciplines-section'
import { ApproachSection } from '@/components/approach-section'
import { ClassesSection } from '@/components/classes-section'
import { WorkshopSection } from '@/components/workshop-section'
import { TeacherSection } from '@/components/teacher-section'
import { CommunitySection } from '@/components/community-section'
import { FaqSection } from '@/components/faq-section'
import { FinalCta } from '@/components/final-cta'

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <Hero />
      <AboutSection />
      <DisciplinesSection />
      <ApproachSection />
      <ClassesSection />
      <WorkshopSection />
      <TeacherSection />
      <CommunitySection />
      <FaqSection />
      <FinalCta />
    </main>
  )
}
