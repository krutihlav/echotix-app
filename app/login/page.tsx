import AuthForm from './auth-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>
}) {
  const sp = await searchParams
  return <AuthForm error={sp.error} msg={sp.msg} />
}
