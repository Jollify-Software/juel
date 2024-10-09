import { JuelShape } from "../Shape";

export class ShapeTemplateService {

    mainTemplateReady = new Promise<SVGSVGElement>((resolve, reject) => {
        this.mainTemplateResolver = resolve;
    });
    mainTemplateResolver: (value: SVGSVGElement) => void;

    /**
     *
     */
    constructor(private element: JuelShape, private templates: HTMLTemplateElement[]) {
        this.initTemplates();
    }

    initTemplates() {
        for (let template of this.templates) {
            if (template.hasAttribute("name")) {
                // Named template to add to the main template
                this.mainTemplateReady.then(svg => {
                    let name = template.getAttribute("name");
                    if (name) {
                    let $svg = $(svg);
                    var slot = $svg.find(`.${name}`);
                    if (slot.length > 0) {
                        let namedNode = template.content.cloneNode(true);
                        let children = $(namedNode).find("svg").children();
                        let bbox = (slot[0] as any as SVGGElement).getBBox()
                        let w = bbox.width;
                        let h = bbox.height;

                        slot.empty();
                        for (let el of children) {
                            slot[0].append(el);
                        }
                        let newBbox = (slot[0] as any as SVGGElement).getBBox()
                        let newClientBbox = (slot[0] as any as SVGGElement).getBoundingClientRect()
                        let wScale = w / newBbox.width;
                        let hScale = h / newBbox.height;
                        let scale = Math.min(wScale, hScale);

                        console.log("New width " + (bbox.width * scale))
                        console.log(bbox);
                        console.log(newBbox);
                        console.log(newClientBbox);

                        let svgBB = svg.getBBox();

                        var x = ((svgBB.width / 2) - ((bbox.width) /2));
                        var y = bbox.y;// (bbox.height) /2

                        // TODO: Aspect ratio
                        slot.attr({
                            'transform': `translate(${x}, ${y}) scale(${scale}, ${scale})`
                        });
                    }
                    }
                });
            } else { // Main template
                let node = template.content.cloneNode(true);
            let $node = $(node);
            let textEl = $node.find('.text');
            // If the element has textContent and the main template has a text placeholder
            if ((this.element.textContent.trim()) && textEl.length > 0) {
                let parts = textEl.children();
                let partCount = parts.length;
                console.log(this.element.textContent.trim())
                let splity = this.element.textContent.trim().split(' ');
                console.log(splity)
                for (let part of parts) {
                    let textSplity = part.textContent.split(' ');
                    console.log(textSplity)
                    // Text splitty length is the required number of words.
                    // If we have enough words available in splitty
                    if (textSplity.length <= splity.length) {
                        let words = splity.splice(0, textSplity.length);
                        console.log("Putting down the word: " + words.join(' '))
                        part.textContent = words.join(' ');
                    } else { // Not enough words available
                        // Put down all the remaining word
                        console.log("Putting down the word: " + splity.join(' '))
                        part.textContent = splity.join(' ');
                    }
                }
                    this.element.textContent = '';
            }
            this.element.prepend(node);
            this.mainTemplateResolver(this.element.querySelector("svg"));
            }
        }
    }
}