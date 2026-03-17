import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME || 'Platform Admin';
const kvTable = process.env.KV_TABLE || 'kv_store_824d015e';

const missingVars = [
  ['SUPABASE_URL', supabaseUrl],
  ['SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
  ['ADMIN_EMAIL', adminEmail],
  ['ADMIN_PASSWORD', adminPassword],
].filter(([, value]) => !value);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.map(([name]) => name).join(', ')}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getOrCreateAdminUser() {
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    throw new Error(`Failed to list users: ${usersError.message}`);
  }

  const existingUser = usersData.users.find((user) => user.email?.toLowerCase() === adminEmail.toLowerCase());

  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata || {}),
        name: adminName,
        role: 'admin',
      },
    });

    if (updateError) {
      throw new Error(`Failed to update existing admin user: ${updateError.message}`);
    }

    return updatedUser.user;
  }

  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      name: adminName,
      role: 'admin',
    },
  });

  if (createError) {
    throw new Error(`Failed to create admin user: ${createError.message}`);
  }

  return createdUser.user;
}

async function upsertAdminProfile(userId) {
  const profile = {
    id: userId,
    email: adminEmail,
    name: adminName,
    role: 'admin',
    phone: '',
    bio: '',
    approved: true,
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(kvTable)
    .upsert({
      key: `profile:${userId}`,
      value: profile,
    });

  if (error) {
    throw new Error(`Failed to upsert admin profile in ${kvTable}: ${error.message}`);
  }

  return profile;
}

async function main() {
  const user = await getOrCreateAdminUser();
  const profile = await upsertAdminProfile(user.id);

  console.log('Admin bootstrap complete.');
  console.log(`Email: ${profile.email}`);
  console.log(`Name: ${profile.name}`);
  console.log(`User ID: ${profile.id}`);
  console.log(`KV table: ${kvTable}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});