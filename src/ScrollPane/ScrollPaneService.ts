import { JuelToggle } from "../Toggle/Toggle";
import { getRandomInt } from "../_Utils/RandomInt";
import { JuelScrollPane } from "./ScrollPane";

export class ScrollPaneService {
    
    positionHistory: number[] = [];
    container: HTMLElement;
    children: JQuery<Element>;
	childCount: number;
	randNumbers: number[];

	startPosition: number;

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
		if (this.sp.fullHeight) {
			this.sp.style.height = "100%";
			this.container.style.height = "100%";
		} else if (window['isMobile'] == false && h > 0) {
			this.sp.style.height = `${h}px`;
			this.container.style.height = `${h}px`;
		}
		this.children = $(this.container.querySelectorAll('.item'));
		
		this.randNumbers = [ this.sp.position ];
			this.scrollTo(this.sp.position);
		this.startPosition = this.sp.position;

        if (this.sp.tabs) {
            $(this.sp.tabs as any).each((index, el) => {
                $(el).off("click").on('click', () => this.scrollTo(index));
            })
		}
		
		if (this.sp.next) {
			$(this.sp.next as any).off("click").on('click', () => this.next());
		}
		if (this.sp.previous) {
			$(this.sp.previous as any).off("click").on('click', () => this.previous());
		}

		if (this.sp.random) {
			$(this.sp.random).off("click").on('click', () => this.random());
		}

		$(this.sp).children().each((index, el) => {
			if (el.hasAttribute('data-toggle')) {
				let sel = el.dataset['toggle'];
				$(sel).off("click").on('click', () => {
					console.log(this.sp.position + ' ' + index)
					if (this.sp.position != index) {
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
		console.log(prev)
        if (prev.length > 0) {
			prev.each((i, sib) => {	
				margin+= (!this.sp.width) ? $(sib).outerWidth() : this.sp.width;
			});
		}
		if (!this.sp.fullHeight) {
			let w = el.outerWidth();
			let h = el.outerHeight();
			if (w > 0) {
				this.sp.style.width = `${w}px`;
			}
			if (window['isMobile'] == false && h > 0) {
				this.sp.style.height = `${h}px`;
			}
		}
		this.container.style.marginLeft = `-${margin}px`;
	
		this.sp.position = index;

		let evt = new CustomEvent(JuelScrollPane.SCROLL, {
			detail: {
				index: index,
				element: el
			}
		});
		this.positionHistory.push(this.sp.position);
		if (this.positionHistory.length == this.children.length) {
			this.positionHistory = [];
		}
		this.sp.dispatchEvent(evt);
	}

	next() {
		this.sp.position ++;
		if (this.sp.position >= this.sp.children.length) {
			this.sp.position = 0;
		}
		while (this.sp.children[this.sp.position].classList.contains("hidden")) {
			this.sp.position ++;
			if (this.sp.position >= this.children.length) {
				this.sp.position = 0;
			}
		}
		this.scrollTo(this.sp.position);
	}

	previous() {
		this.sp.position --;
		if (this.sp.position < 0) {
			this.sp.position = this.children.length - 1;
		}
		while (this.sp.children[this.sp.position].classList.contains("hidden")) {
			this.sp.position --;
			if (this.sp.position < 0) {
				this.sp.position = this.children.length - 1;
			}
		}
		this.scrollTo(this.sp.position);
	}
	
	random() {
		let index = getRandomInt(this.children.length);
		while (index == this.sp.position || this.positionHistory.some(n => n == index)) {
			index = getRandomInt(this.children.length);
		}
		this.scrollTo(index);
		this.sp.position = index;
		this.randNumbers.push(index);
		if (this.randNumbers.length == this.children.length) {
			this.randNumbers = [ index ];
		}
	}

	reset(resetChildren: boolean = false) {
		this.scrollTo(this.startPosition);
		if (resetChildren == true) {
			let toggles = this.sp.querySelectorAll<JuelToggle>("juel-toggle");
			for (let toggle of toggles) {
				toggle.reset();
			}
		}
	}
}