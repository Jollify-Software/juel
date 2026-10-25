// <juel-guide> / <juel-guide-step>: the declarative form of juel.guide (DOCS-PLAN H3).
//
//   <juel-guide id="tour" storage-key="home-tour">
//     <juel-guide-step target="#new" title="New">Starts a <b>new</b> document.</juel-guide-step>
//     <juel-guide-step target="my-panel >>> .save" title="Save" placement="left" wait="500">…</juel-guide-step>
//   </juel-guide>
//   document.getElementById("tour").start();
//
// Each step's body is its HTML content; the steps themselves never show.
// Fires `guide-step` ({ index, step, target }) and `guide-end` ({ finished }).
import { GuideModule } from "../../_Modules/Guide/GuideModule";
import { GuideStepInput, isSeen, resetSeen } from "../../_Modules/Guide/GuideStep";
import { VisualGuide } from "../../_Modules/Guide/Guide";

/** One step of a `<juel-guide>`: `target`, `title`, `placement`, `wait`; its content is the body. */
export class JuelGuideStep extends HTMLElement {
    connectedCallback() {
        this.hidden = true;
    }

    /** This step as juel.guide takes it. */
    toStep(): GuideStepInput {
        return {
            target: this.getAttribute("target") ?? "",
            title: this.getAttribute("title") ?? "",
            html: this.innerHTML.trim(),
            placement: (this.getAttribute("placement") ?? "auto") as GuideStepInput["placement"],
            wait: Number(this.getAttribute("wait")) || 0,
        };
    }
}

/** A guide written as markup: `start()` shows its `<juel-guide-step>` children in order. */
export class JuelGuide extends HTMLElement {
    private guide: VisualGuide | null = null;

    connectedCallback() {
        this.hidden = true;
    }

    /** The key "seen" is remembered under, from `storage-key`. */
    get storageKey(): string {
        return this.getAttribute("storage-key") ?? "";
    }

    /** Whether this guide has been seen (finished or skipped) on this browser; false with no `storage-key`. */
    get seen(): boolean {
        return isSeen(this.storageKey);
    }

    /** The steps, read from the children each time the guide starts. */
    get steps(): GuideStepInput[] {
        return Array.from(this.children)
            .filter((c): c is JuelGuideStep => c instanceof JuelGuideStep)
            .map(s => s.toStep());
    }

    /** Starts the guide (ending any juel.guide still showing). */
    start(): void {
        this.guide = GuideModule.start(this.steps, { host: this, storageKey: this.storageKey || undefined });
    }

    /** Ends the guide, as skipped. */
    end(): void {
        if (this.guide?.active) this.guide.end(false);
    }

    /** Forgets that this guide was seen, so the page offers it again. */
    resetSeen(): void {
        resetSeen(this.storageKey);
    }
}

if (!customElements.get("juel-guide-step")) customElements.define("juel-guide-step", JuelGuideStep);
if (!customElements.get("juel-guide")) customElements.define("juel-guide", JuelGuide);

declare global {
    interface HTMLElementTagNameMap {
        "juel-guide": JuelGuide;
        "juel-guide-step": JuelGuideStep;
    }
}
