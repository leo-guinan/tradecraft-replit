import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';
import type { BurnerProfile } from '@shared/schema';

const supabaseUrl = 'https://fabxmporizzqflnftavs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getAccountId(username: string): Promise<string | null> {
  try {
    console.log(`Fetching account ID for username: ${username}`);
    const { data, error } = await supabase
      .from('account')
      .select('account_id')
      .eq('username', username.toLowerCase())
      .single();

    if (error) {
      console.error("Error fetching account:", error);
      return null;
    }

    console.log(`Found account ID: ${data?.account_id}`);
    return data?.account_id;
  } catch (error) {
    console.error("Error in getAccountId:", error);
    return null;
  }
}

export async function getTweetsPaginated(accountId: string) {
  let allTweets: any[] = [];
  let batchSize = 1000;
  let offset = 0;
  let done = false;

  console.log(`Starting tweet fetch for account ID: ${accountId}`);

  while (!done) {
    try {
      const { data, error } = await supabase
        .from('tweets')
        .select('*')
        .eq('account_id', accountId)
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error("Error fetching tweets:", error);
        return { error };
      }

      if (!data || data.length === 0) {
        done = true;
      } else {
        console.log(`Got ${data.length} tweets, fetching another page...`);
        allTweets = allTweets.concat(data);
        offset += batchSize;
      }
    } catch (error) {
      console.error("Error in getTweetsPaginated:", error);
      return { error };
    }
  }

  console.log(`Total tweets fetched: ${allTweets.length}`);
  return allTweets;
}

export async function getProfileInfo(accountId: string) {
  try {
    console.log(`Fetching profile info for account ID: ${accountId}`);
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getProfileInfo:", error);
    return null;
  }
}

export async function createBurnerFromArchive(userId: number, username: string): Promise<{
  burnerProfile?: BurnerProfile;
  error?: string;
}> {
  try {
    // First get account ID
    const accountId = await getAccountId(username);
    if (!accountId) {
      return { error: "Account not found" };
    }

    // Get profile info using account ID
    const profile = await getProfileInfo(accountId);
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
  } catch (error: any) {
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
      const tweetText = tweet.full_text || tweet.text;
      if (!tweetText) {
        console.log("Skipping tweet with no content:", tweet.id);
        continue;
      }

      await storage.createPost({
        burnerId,
        originalContent: tweetText,
        transformedContent: tweetText, // No transformation for archive posts
      });
      importedCount++;
    }

    console.log(`Successfully imported ${importedCount} tweets for burner ID: ${burnerId}`);
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error("Error importing tweets:", error);
    return { error: error.message };
  }
}