import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./CookieConsent.less';
import { DOMStringMapConverter } from "../../_Converters/DOMStringMapConvertor";
import { CookiePreferences } from "./CookiePrefrences";
import { when } from "lit/directives/when";
import { GoogleAnalyticsConsentProvider } from "./Providers/GoogleAnalyticsConsentProvider";
import { IConsentProvider } from "./Providers/IConsentProvider";
import { MetricoolConsentProvider } from "./Providers/MetricoolConsentProvider";

const cookieName = "cookie-consent";

@customElement("juel-cookie-consent")
export class JuelCookieConsent extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property({ type: Boolean }) showConsent: boolean = true;

    @property({ type: Boolean }) full: boolean = false;
    @property({ type: Object, converter: DOMStringMapConverter }) keys: CookiePreferences;
    @property({ type: Object, converter: DOMStringMapConverter })
    cookiePreferences: CookiePreferences = {
      essential: true, // Always true; cannot be turned off
      analytics: false,
      marketing: false,
    };

    providers: { [key: string]: IConsentProvider } = {
        "gtag": new GoogleAnalyticsConsentProvider(),
        "metricool": new MetricoolConsentProvider()
    }

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
    this.appendTemplates();
  }

  // Handle "Reject All"
  private handleRejectAll(): void {
    this.showConsent = false;
  }

  // Save preferences to localStorage and hide the consent component
  private savePreferences(): void {
    localStorage.setItem(cookieName, JSON.stringify(this.cookiePreferences));
    this.showConsent = false;
  }

  // Render the component
  render() {
    if (!this.showConsent) return html``;

    return html`
      <div class="cookie-consent-overlay">
        <div class="cookie-consent-header"><slot name="title">We use cookies</slot></div>
        <slot name="content">
        ${when(this.full == true, () => html`
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
        </div>`, () => html`<p>We use cookies to enhance your experience, analyse site traffic, and personalise content.`)
    }
        </slot>
        <div class="cookie-buttons">
          <juel-button type="danger" @button-clicked=${this.handleRejectAll}>Reject</juel-button>
          <juel-button type="success" @button-clicked=${this.handleAcceptAll}>Accept</juel-button>
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
    const storedPreferences = localStorage.getItem(cookieName);
    if (storedPreferences) {
      this.cookiePreferences = JSON.parse(storedPreferences);
      this.showConsent = false; // Hide if preferences already exist
      $.ready.then(() => this.appendTemplates());
    }
  }

  appendTemplates() {
    if (this.keys) {
      for (const key in this.keys) {
        if (key in this.providers) {
          this.providers[key].loadScript(this.keys[key]);
        }
      }
    }

    const templates = this.querySelectorAll("template");
    templates.forEach((template) => {
      const clone = document.importNode(template.content, true);
      if (template.hasAttribute("role")) {
        const slot = template.getAttribute("role");
        document.querySelector(slot)?.append(clone);
      }
      document.head.append(clone);
    });
  }
  
}