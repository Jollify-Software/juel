/**
 * Checks if the input string is a single emoji character.
 * Handles most common emojis, including some multi-codepoint ones.
 */
export function isEmoji(str: string): boolean {
    // Regex for most emoji characters, including some multi-codepoint sequences
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)$/u;
    return emojiRegex.test(str);
  }