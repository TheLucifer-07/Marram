import { Link } from 'react-router-dom'
import Logo from '../components/ui/Logo'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center px-6">
      <Logo />
      <h1 className="mt-8 text-4xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">The address may be mistyped, or the page has moved.</p>
      <Link to="/" className="mt-6 font-medium text-primary hover:underline">Go to the home page</Link>
    </main>
  )
}
