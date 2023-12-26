import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt } from 'azle';
import { v4 as uuidv4, validate as isValidUUID } from 'uuid';

type UserProfile = Record<{
    id: string;
    username: string;
    bio: string;
    followers: Vec<string>;
    following: Vec<string>;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type UserProfilePayload = Record<{
    username: string;
    bio: string;
}>

const userProfileStorage = new StableBTreeMap<string, UserProfile>(0, 44, 1024);

// Function to check if a string is a valid UUID
function isValidUUIDString(str: string): boolean {
    return isValidUUID(str);
}

// Function to get all user profiles
$query;
export function getUserProfiles(): Result<Vec<UserProfile>, string> {
    try {
        const profiles = userProfileStorage.values();
        return Result.Ok(profiles);
    } catch (error) {
        return Result.Err(`Failed to retrieve user profiles: ${error}`);
    }
}

// Function to get a user profile by ID
$query;
export function getUserProfile(id: string): Result<UserProfile, string> {
    try {
        // ID Validation
        if (!id) {
            throw new Error(`Invalid ID: ${id}`);
        }

        const profile = match(userProfileStorage.get(id), {
            Some: (p: any) => Result.Ok<UserProfile, string>(p),
            None: () => Result.Err<UserProfile, string>(`A user profile with id=${id} not found`),
        });

        return profile;
    } catch (error) {
        return Result.Err(`Error retrieving user profile: ${error}`);
    }
}

// Function to create a new user profile
$update;
export function createUserProfile(payload: UserProfilePayload): Result<UserProfile, string> {
    try {
        // Payload Validation
        if (!payload.username || !payload.bio) {
            throw new Error("Invalid payload");
        }

        const id = uuidv4();

      
        const userProfile: UserProfile = {
            id: id,
            createdAt: ic.time(),
            updatedAt: Opt.None,
            followers: [],
            following: [],
            username: payload.username,
            bio: payload.bio,
        };

        userProfileStorage.insert(userProfile.id, userProfile);

        return Result.Ok(userProfile);
    } catch (error) {
        return Result.Err(`Failed to create user profile: ${error}`);
    }
}

// Function to update a user profile
$update;
export function updateUserProfile(id: string, payload: UserProfilePayload): Result<UserProfile, string> {
    try {
        // ID Validation
        if (!id) {
            throw new Error(`Invalid ID: ${id}`);
        }

        // Payload Validation
        if (!payload.username || !payload.bio) {
            throw new Error("Invalid payload");
        }

        const profile = match(userProfileStorage.get(id), {
            Some: (p: any) => {
                const updatedProfile: UserProfile = {
                    ...p,
                    username: payload.username,
                    bio: payload.bio,
                    updatedAt: Opt.Some(ic.time()),
                };
                userProfileStorage.insert(p.id, updatedProfile);
                return Result.Ok<UserProfile, string>(updatedProfile);
            },
            None: () => Result.Err<UserProfile, string>(`Couldn't update user profile with id=${id}. Profile not found`),
        });

        return profile;
    } catch (error) {
        return Result.Err(`Error updating user profile: ${error}`);
    }
}

// Function to delete a user profile by ID
$update;
export function deleteUserProfile(id: string): Result<UserProfile, string> {
    try {
        // ID Validation
        if (!id) {
            throw new Error(`Invalid ID: ${id}`);
        }

        const profile = match(userProfileStorage.remove(id), {
            Some: (deletedProfile: any) => Result.Ok<UserProfile, string>(deletedProfile),
            None: () => Result.Err<UserProfile, string>(`Couldn't delete user profile with id=${id}. Profile not found.`),
        });

        return profile;
    } catch (error) {
        return Result.Err(`Error deleting user profile: ${error}`);
    }
}

// Function to follow a user profile
$update;
export function followProfile(userId: string, profileId: string): Result<UserProfile, string> {
    try {
        // ID Validation
        if (!userId || !profileId) {
            throw new Error(`Invalid user or profile ID`);
        }

        const user1Following = match(userProfileStorage.get(userId), {
            Some: (user) => {
                if (user.following.includes(profileId)) {
                    return Result.Ok<UserProfile, string>(user);
                } else {
                    const userFollowing: Vec<string> = user.following;
                    userFollowing.push(profileId);
                    const user1Profile: UserProfile = {
                        ...user,
                        following: userFollowing,
                    };
                    userProfileStorage.insert(user.id, user1Profile);
                    return Result.Ok<UserProfile, string>(user1Profile);
                }
            },
            None: () => Result.Err<UserProfile, string>("Unable to carry out the following function"),
        });

        match(userProfileStorage.get(profileId), {
            Some: (user) => {
                if (user.followers.includes(userId)) {
                    return Result.Ok<UserProfile, string>(user);
                } else {
                    const userFollowers: Vec<string> = user.followers;
                    userFollowers.push(userId);
                    const user2Profile: UserProfile = {
                        ...user,
                        followers: userFollowers,
                    };
                    userProfileStorage.insert(user.id, user2Profile);
                    return Result.Ok<UserProfile, string>(user2Profile);
                }
            },
            None: () => Result.Err<UserProfile, string>("Unable to carry out the following function"),
        });

        return user1Following;
    } catch (error) {
        return Result.Err(`Error following user profile: ${error}`);
    }
}

// Function to unfollow a user profile
$update;
export function unfollowProfile(userId: string, profileId: string): Result<UserProfile, string> {
    try {
        // ID Validation
        if (!userId || !profileId) {
            throw new Error(`Invalid user or profile ID`);
        }

        const user1Unfollowing = match(userProfileStorage.get(userId), {
            Some: (user) => {
                if (user.following.includes(profileId)) {
                    const unfollowedUserIndex = user.following.indexOf(profileId);
                    user.following.splice(unfollowedUserIndex, 1);
                    const user1Profile: UserProfile = {
                        ...user,
                        following: user.following,
                    };
                    userProfileStorage.insert(user.id, user1Profile);
                    return Result.Ok<UserProfile, string>(user1Profile);
                } else {
                    return Result.Ok<UserProfile, string>(user);
                }
            },
            None: () => Result.Err<UserProfile, string>("Unable to carry out the unfollowing function"),
        });

        match(userProfileStorage.get(profileId), {
            Some: (user) => {
                if (user.followers.includes(userId)) {
                    const unfollowingUserIndex = user.followers.indexOf(userId);
                    user.followers.splice(unfollowingUserIndex, 1);
                    const user1Profile: UserProfile = {
                        ...user,
                        followers: user.followers,
                    };
                    userProfileStorage.insert(user.id, user1Profile);
                    return Result.Ok<UserProfile, string>(user1Profile);
                } else {
                    return Result.Ok<UserProfile, string>(user);
                }
            },
            None: () => Result.Err<UserProfile, string>(`Unable to remove the follower with the id=${userId}`),
        });

        return user1Unfollowing;
    } catch (error) {
        return Result.Err(`Error unfollowing user profile: ${error}`);
    }
}

// Cryptographic utility for generating random values
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
      let array = new Uint8Array(32);
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
  
  
