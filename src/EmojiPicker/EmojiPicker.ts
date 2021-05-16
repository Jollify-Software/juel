import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import { EmojiCategory } from "../_Core/Emoji/EmojiCategory";
import Styles from "bundle-text:./EmojiPicker.less"

@customElement("juel-emoji-picker")
export class JuelEmojiPicker extends LitElement {

    //static styles = unsafeCSS(Styles);

    @property() endpoint = "https://jollify.azurewebsites.net/emoji";

    emojis: EmojiCategory[] = [];

    selectEmoji(emoji: string) {
        let evt = new CustomEvent("emojiSelected", {
            detail: emoji
        });
        this.dispatchEvent(evt);
    }

    firstUpdated() {
        if (this.endpoint) {
            fetch(this.endpoint).then((response) => {
                response.json().then((data: EmojiCategory[]) => {
                    this.emojis = data;
                    //console.log(this.emojis)
                    this.requestUpdate();
                    setTimeout(() => {
                        (<any>this.querySelector("#emoji-editor")).requestUpdate();
                    })
                })
            })
        }
    }
    
    createRenderRoot() {
        return this;
    }

    render() {
        return html`
        <style>
            ${Styles}
        </style>
        ${this.emojis ? html`
        <juel-tabs id="emoji-editor">
            ${this.emojis.map(category => {
            return html`
                <div class="emoji-container">
                    <juel-tooltip slot="title" text="${category.name}">
                        <span class="emoji">${category.emoji[0].char}</span>
                    </juel-tooltip>
                    ${category.emoji.map(emoji => {
                return html`
                            <div class="emoji">
                                ${emoji.variations ?
                        html`<juel-tooltip>
                                            <span>${emoji.char}</span>
                                            <div slot="content" class="emoji-variations-panel">
                                                ${emoji.variations.map(variation => {
                            return html`
                                                    <span class="emoji variation" @click="${() => this.selectEmoji(variation)}">
                                                        ${variation}
                                                    </span>`;
                        })}
                                            </div>
                                        </juel-tooltip>`
                        :
                        html`<span @click="${() => this.selectEmoji(emoji.char)}">${emoji.char}</span>`
                    }
                            </div>`;
            })}
                </div>`;
        })}
        </juel-tabs>` : html``}`;
    }
}