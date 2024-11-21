import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./CookieConsent.less';
import { DOMStringMapConverter } from "../../_Converters/DOMStringMapConvertor";
import { CookiePreferences } from "./CookiePrefrences";

@customElement("juel-cookie-consent")
export class JuelCookieConsent extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property({ type: Boolean }) showConsent: boolean = true;

    @property({ type: Object, converter: DOMStringMapConverter })
    cookiePreferences: CookiePreferences = {
      essential: true, // Always true; cannot be turned off
      analytics: false,
      marketing: false,
    };

    // Handle toggling cookie categories
  private handleToggle(category: keyof typeof this.cookiePreferences): void {
    if (category === "essential") return; // Essential cookies cannot be disabled
    this.cookiePreferences = {
      ...this.cookiePreferences,
      [category]: !this.cookiePreferences[category],
    };
  }

  // Handle "Accept All"
  private handleAcceptAll(): void {
    this.cookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    this.savePreferences();
  }

  // Handle "Reject All"
  private handleRejectAll(): void {
    this.cookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    this.savePreferences();
  }

  // Save preferences to localStorage and hide the consent component
  private savePreferences(): void {
    localStorage.setItem("cookiePreferences", JSON.stringify(this.cookiePreferences));
    this.showConsent = false;
  }

  // Render the component
  render() {
    if (!this.showConsent) return html``;

    return html`
      <div class="cookie-consent-overlay">
        <div class="cookie-consent-header">We use cookies</div>
        <p>We use cookies to enhance your experience. You can manage your preferences below:</p>
        <div class="cookie-options">
          ${Object.entries(this.cookiePreferences).map(
            ([category, enabled]) => html`
              <div class="cookie-option">
                <label>${this.capitalize(category)} Cookies</label>
                <input
                  type="checkbox"
                  .checked=${enabled}
                  @change=${() => this.handleToggle(category as keyof typeof this.cookiePreferences)}
                  ?disabled=${category === "essential"}
                />
              </div>
            `
          )}
        </div>
        <div class="cookie-buttons">
          <button class="btn-reject" @click=${this.handleRejectAll}>Reject All</button>
          <button class="btn-accept" @click=${this.handleAcceptAll}>Accept All</button>
        </div>
      </div>
    `;
  }

  // Utility to capitalize category names
  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Lifecycle: Load preferences from localStorage if available
  connectedCallback() {
    super.connectedCallback();
    const storedPreferences = localStorage.getItem("cookiePreferences");
    if (storedPreferences) {
      this.cookiePreferences = JSON.parse(storedPreferences);
      this.showConsent = false; // Hide if preferences already exist
    }
  }
  
}