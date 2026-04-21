/**
 * compat.js
 * Compatibility profile controls for behavior-preserving rollouts.
 *
 * Profiles:
 * - legacy: preserves original behavior quirks
 * - strict (default): enables corrected behavior paths
 */

const LensMapCompat = (() => {
  const STORAGE_KEY = 'lens_map_profile';
  const PROFILES = ['legacy', 'strict'];

  function getQueryProfile() {
    try {
      const profile = new URLSearchParams(window.location.search).get('profile');
      return PROFILES.includes(profile) ? profile : null;
    } catch (err) {
      return null;
    }
  }

  function getStoredProfile() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return PROFILES.includes(stored) ? stored : null;
    } catch (err) {
      return null;
    }
  }

  function resolveProfile() {
    const queryProfile = getQueryProfile();
    if (queryProfile) {
      try {
        localStorage.setItem(STORAGE_KEY, queryProfile);
      } catch (err) {
        // Ignore storage failures; fall through with in-memory profile.
      }
      return queryProfile;
    }

    return getStoredProfile() || 'strict';
  }

  let profile = resolveProfile();

  function flagsFor(profileName) {
    const strict = profileName === 'strict';
    return {
      treeOrderFallback: strict,
      breadcrumbInit: strict,
      hashRoutingPath: strict,
      markdownSanitize: strict,
      cosmosNullGuard: strict
    };
  }

  let flags = flagsFor(profile);

  function setProfile(nextProfile) {
    if (!PROFILES.includes(nextProfile)) return false;

    profile = nextProfile;
    flags = flagsFor(profile);
    try {
      localStorage.setItem(STORAGE_KEY, profile);
    } catch (err) {
      // Non-fatal.
    }
    return true;
  }

  return {
    getProfile: () => profile,
    isStrict: () => profile === 'strict',
    isLegacy: () => profile === 'legacy',
    flag: name => Boolean(flags[name]),
    getFlags: () => ({ ...flags }),
    setProfile
  };
})();

window.LensMapCompat = LensMapCompat;
