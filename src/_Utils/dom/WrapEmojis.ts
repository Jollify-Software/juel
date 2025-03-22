import { emojiRegex } from "../EmojiRegex";

export function wrapEmojis(element: HTMLElement): void {
    function processNode(node: Node): void {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue || "";
            if (emojiRegex.test(text)) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                text.replace(emojiRegex, (match, offset) => {
                    // Append text before emoji
                    if (offset > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
                    }
                    // Create div for emoji
                    const emojiDiv = document.createElement("div");
                    emojiDiv.textContent = match;
                    emojiDiv.classList.add("emoji-wrapper"); // Optional styling class
                    fragment.appendChild(emojiDiv);
                    lastIndex = offset + match.length;
                    return match;
                });
                // Append remaining text
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                }
                node.parentNode?.replaceChild(fragment, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const children = Array.from(node.childNodes);
            if (children.length === 0) {
                return;
            }
            for (const child of children) {
                processNode(child);
            }
        }
    }
    
    processNode(element);
}