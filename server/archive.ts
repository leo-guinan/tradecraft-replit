import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';
import type { BurnerProfile } from '@shared/schema';

const supabaseUrl = 'https://fabxmporizzqflnftavs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getAccountId(username: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('account')
    .select('account_id')
    .eq('username', username.toLowerCase())
    .single();

  if (error) {
    console.error("Error fetching account:", error);
    return null;
  }

  return data?.account_id;
}

export async function getTweetsPaginated(accountId: string) {
  let allTweets = [];
  let batchSize = 1000;
  let offset = 0;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .schema('public')
      .from('tweets')
      .select('*')
      .eq('account_id', accountId)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error("Error fetching tweets:", error);
      return { error };
    }

    if (data.length === 0) {
      done = true;
    } else {
      console.log(`Got ${data.length} tweets, fetching another page...`);
      allTweets = allTweets.concat(data);
      offset += batchSize;
    }
  }

  return allTweets;
}

export async function getProfileInfo(username: string) {
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export async function createBurnerFromArchive(userId: number, username: string): Promise<{
  burnerProfile?: BurnerProfile;
  error?: string;
}> {
  try {
    // Get profile info
    const profile = await getProfileInfo(username);
    if (!profile) {
      return { error: "Profile not found" };
    }

    // Create burner profile
    const burnerProfile = await storage.createBurnerProfile({
      userId,
      codename: `ARCHIVE_${username.toUpperCase()}`,
      personality: `Archive of ${username}'s posts`,
      avatar: profile.profile_image_url || "default_avatar.png",
      background: "Imported from Community Archive",
      isAI: false,
      isActive: true,
    });

    return { burnerProfile };
  } catch (error) {
    console.error("Error creating burner profile:", error);
    return { error: error.message };
  }
}

export async function importTweetsForBurner(burnerId: number, accountId: string) {
  try {
    const tweets = await getTweetsPaginated(accountId);
    if ('error' in tweets) {
      return { error: tweets.error };
    }

    let importedCount = 0;
    for (const tweet of tweets) {
      await storage.createPost({
        burnerId,
        originalContent: tweet.text,
        transformedContent: tweet.text, // No transformation for archive posts
      });
      importedCount++;
    }

    return { success: true, count: importedCount };
  } catch (error) {
    console.error("Error importing tweets:", error);
    return { error: error.message };
  }
}
