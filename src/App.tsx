import { Navigation } from './components/Navigation'
import { useReveal } from './hooks/useReveal'
import { useInitialHash } from './hooks/useInitialHash'
import { About } from './sections/About'
import { Activities } from './sections/Activities'
import { Career } from './sections/Career'
import { Footer } from './sections/Footer'
import { Goals } from './sections/Goals'
import { Home } from './sections/Home'
import { Projects } from './sections/Projects'
import { Skills } from './sections/Skills'

function App() {
  useReveal()
  useInitialHash()

  return (
    <>
      <div className="page-background" aria-hidden="true"><span /><span /><span /></div>
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <Home />
        <About />
        <Career />
        <Skills />
        <Activities />
        <Projects />
        <Goals />
      </main>
      <Footer />
    </>
  )
}

export default App
