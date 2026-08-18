import { getRandomInt } from "../../_Utils/RandomInt";
import { JuelScrollPane } from "./ScrollPane";
import { ScrollPaneEvents } from "./ScrollPaneEvents";

export class ScrollPaneService {
    
    indexHistory: number[] = [];
    container: HTMLElement;
    children: JQuery<Element>;
	childCount: number;
	randNumbers: number[];

    constructor(private sp: JuelScrollPane) {

    }

    init() {
        this.container = this.sp.shadowRoot.getElementById('container');
		let first = this.container.querySelector('.item') as HTMLElement;
		let w = $(first).outerWidth();
		let h = $(first).outerHeight();
		if (w > 0) {
			this.sp.style.width = `${w}px`;
			this.container.style.width = `${w}px`;
		} else if (this.sp.width) {
			this.sp.style.width = `${this.sp.width}px`;
			this.container.style.width = `${this.sp.width}px`;
		}
		if (window['isMobile'] == false && h > 0) {
			this.sp.style.height = `${h}px`;
			this.container.style.height = `${h}px`;
		}
		this.children = $(this.container.querySelectorAll('.item'));
		
		this.randNumbers = [ this.sp.index ];
			this.scrollTo(this.sp.index);

        if (this.sp.tabs) {
            $(this.sp.tabs as any).each((index, el) => {
                $(el).on('click', () => this.scrollTo(index));
            })
		}
		
		if (this.sp.next) {
			$(this.sp.next as any).on('click', () => this.next());
		}
		if (this.sp.previous) {
			$(this.sp.previous as any).on('click', () => this.previous());
		}

		if (this.sp.random) {
			$(this.sp.random).on('click', () => this.random());
		}

		$(this.sp).children().each((index, el) => {
			if (el.hasAttribute('data-toggle')) {
				let sel = el.dataset['toggle'];
				$(sel).on('click', () => {
					if (this.sp.index != index) {
						this.scrollTo(index);
					} else {
						this.scrollTo(this.sp.master);
					}
				})
			}
		})
    }

    scrollTo(index: number) {
        let el = $(this.children[index]);
        let margin: number = 0;
        let prev = el.prevAll();
        if (prev.length > 0) {
			prev.each((i, sib) => {
				margin+= (!this.sp.width) ? $(sib).outerWidth() : this.sp.width;
			});
		}
		let w = el.outerWidth();
		let h = el.outerHeight();
		if (w > 0) {
			this.sp.style.width = `${w}px`;
		}
		if (window['isMobile'] == false && h > 0) {
			this.sp.style.height = `${h}px`;
		}
		this.container.style.marginLeft = `-${margin}px`;

		let previousIndex = this.sp.index;
		this.sp.index = index;

		this.indexHistory.push(this.sp.index);
		if (this.indexHistory.length == this.children.length) {
			this.indexHistory = [];
		}

		if (previousIndex !== index) {
			let evt = new CustomEvent(ScrollPaneEvents.IndexChanged, {
				detail: {
					index: index,
					previousIndex: previousIndex,
					element: el
				}
			});
			this.sp.dispatchEvent(evt);
		}
	}

	next() {
		// Compute into a local var rather than writing this.sp.index directly —
		// scrollTo() is the single place that assigns it and detects the change.
		let index = this.sp.index + 1;
		if (index >= this.sp.children.length) {
			index = 0;
		}
		while (this.sp.children[index].classList.contains("hidden")) {
			index ++;
			if (index >= this.children.length) {
				index = 0;
			}
		}
		this.scrollTo(index);
	}

	previous() {
		let index = this.sp.index - 1;
		if (index < 0) {
			index = this.children.length - 1;
		}
		while (this.sp.children[index].classList.contains("hidden")) {
			index --;
			if (index < 0) {
				index = this.children.length - 1;
			}
		}
		this.scrollTo(index);
	}
	
	random() {
		let index = getRandomInt(this.children.length);
		while (index == this.sp.index || this.indexHistory.some(n => n == index)) {
			index = getRandomInt(this.children.length);
		}
		this.scrollTo(index);
		this.randNumbers.push(index);
		if (this.randNumbers.length == this.children.length) {
			this.randNumbers = [ index ];
		}
	}
}
