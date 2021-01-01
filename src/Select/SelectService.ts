import { MenuItem } from "../_Core/MenuItem";
import { Select } from "./Select";

export class SelectService {
    data: any[];
    selectedSlot: string = null;

    createSelect() {
        let sel = document.createElement('select');

        let options = (this.data as string[]).map(item => {
            let opt = document.createElement('option');
            opt.textContent = item;
            opt.value = item;
            return opt;
        });

        for (let opt of options) {
            sel.append(opt);
        }
        return sel;
    }

    init(select: Select) {
        let service = this;

        let children = select.children;
        // If select has no data
        this.data = (Array.prototype.slice.call(children) as HTMLElement[])
            .map(el => el.textContent);

        let sel = this.createSelect()
        select.shadowRoot.prepend(sel);

        if (select.multiple) {
            select.value = [];
        }

        let firstItm = select.shadowRoot.querySelector('.item');
        let placeholder: HTMLElement = select.shadowRoot.querySelector('#selected-placeholder');
        placeholder.style.minWidth = `${firstItm.clientWidth}px`;
        placeholder.style.minHeight = `${firstItm.clientHeight}px`;
        placeholder.addEventListener('click', (event) => {
            select.shadowRoot.querySelector('#select').classList.toggle('hide');
        });

        select.shadowRoot.querySelectorAll('.item').forEach((el: HTMLElement) => {
            el.addEventListener('click', function (event) {
                service.selectedSlot = el.querySelector('slot').getAttribute('name');
                let item: HTMLElement = select.querySelector(`[slot="${service.selectedSlot}"]`);
                if (item) {
                    let placeholder = select.shadowRoot.querySelector("#selected-placeholder");
                    let value = service.data[parseInt(el.dataset.index)];

                    if (!select.multiple) {
                        placeholder.firstChild.replaceWith(
                            item.cloneNode(true) as HTMLElement
                        );
                        select.shadowRoot.querySelector('#items-container').classList.toggle('hide');
                        select.value = value;
                        sel.value = value;
                    } else {
                        if (!(select.value as any[]).some(item => item == value)) {
                            select.value.push(value);
                            if (placeholder.childElementCount < 2) {
                                select.shadowRoot.querySelector("#selected-placeholder").prepend(
                                    item.cloneNode(true) as HTMLElement
                                );
                                let badge = document.createElement('span');
                                badge.id = "badge";
                                badge.textContent = select.value.length;
                                badge.addEventListener('click', (event) => {
                                    if (select.value.length > 0) {
                                    if (select.value.length == 1) {
                                        $(placeholder).empty();
                                    }
                                    select.value.pop();
                                    badge.textContent = select.value.length;
                                    event.stopPropagation();
                                }
                                });
                                placeholder.append(badge);
                            } else {
                                placeholder.querySelector('#badge').textContent = select.value.length;
                            }
                            
                        }
                    }

                    console.log(value)
                    let event = new CustomEvent('change', {
                        detail: value
                    });
                    select.dispatchEvent(event);
                }
            });
        });

        select.shadowRoot.querySelector('#select').classList.add('hide');
    }
}