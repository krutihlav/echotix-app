'use server'
// Přihlášení / registrace / odhlášení běží na serveru (bezpečně, session do cookie).
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') || '').trim().toLowerCase(),
    password: String(formData.get('password') || ''),
  })
  if (error) redirect('/login?error=' + encodeURIComponent(error.message))
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const name = String(formData.get('name') || '').trim()
  const { error } = await supabase.auth.signUp({
    email: String(formData.get('email') || '').trim().toLowerCase(),
    password: String(formData.get('password') || ''),
    // "name" se uloží do metadat → DB trigger handle_new_user ho zapíše do profiles.name
    options: { data: { name } },
  })
  if (error) redirect('/login?error=' + encodeURIComponent(error.message))
  redirect(
    '/login?msg=' +
      encodeURIComponent('Účet vytvořen. Pokud je zapnuté potvrzení e-mailu, klikni na odkaz v mailu.')
  )
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
