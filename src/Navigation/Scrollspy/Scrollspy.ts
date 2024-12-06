import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Scrollspy.less';

@customElement('juel-scroll')
export class ScrollSpy extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

  @property({ type: String }) target: string = ''; // Selector for the scrollable container
  @property({ type: Array }) sections: string[] = []; // Array of section IDs to track
  @property({ type: String }) activeClass: string = 'active'; // Class name for active state

  private observer!: IntersectionObserver;

  connectedCallback() {
    super.connectedCallback();
    this.initializeObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
  }

  initializeObserver() {
    const options = {
      root: document.querySelector(this.target),
      rootMargin: '0px',
      threshold: 0.6, // Trigger when 60% of the section is visible
    };

    this.observer = new IntersectionObserver(this.handleIntersect.bind(this), options);

    this.sections.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) {
        this.observer.observe(section);
      }
    });
  }

  handleIntersect(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      const navLink = this.shadowRoot?.querySelector(
        `nav a[href="#${entry.target.id}"]`
      );

      if (entry.isIntersecting) {
        navLink?.classList.add(this.activeClass);
      } else {
        navLink?.classList.remove(this.activeClass);
      }
    });
  }

  render() {
    return html`
      <nav>
        ${this.sections.map(
          (section) =>
            html`<a href="#${section}">${section.replace(/-/g, ' ')}</a>`
        )}
      </nav>
    `;
  }
}