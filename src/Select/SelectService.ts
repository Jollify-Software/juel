import { MenuItem } from "../_Core/MenuItem";
import { Select } from "./Select";

export class SelectService {
    selectedSlot: string = null;

    createSelect(select: Select) {
        let sel = document.createElement('select');

        let options = (select.data as string[]).map(item => {
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
        if (!select.data) {
            select.data = (Array.prototype.slice.call(children) as HTMLElement[])
                .map(el => 'value' in el.dataset ? el.dataset.value : el.textContent);
        }

        if (select.multiple) {
            select.value = [];
        }

        let firstItm = $(select.shadowRoot.querySelector('.item'));
        let placeholder: HTMLElement = select.shadowRoot.querySelector('#selected-placeholder');
        //if (placeholder) {
            placeholder.style.minWidth = `${firstItm.outerWidth()}px`;
            placeholder.style.minHeight = `${firstItm.outerHeight()}px`;

            select.shadowRoot.querySelectorAll('.item').forEach((el: HTMLElement) => {
                el.addEventListener('click', function (event) {
                    service.selectedSlot = el.querySelector('slot').getAttribute('name');
                    let item: HTMLElement = select.querySelector(`[slot="${service.selectedSlot}"]`);
                    if (item) {
                        let index = parseInt(el.dataset.index);
                        let value = select.data[index];

                        if (!select.multiple) {
                            select.value = [value];
                        } else {
                            if (!(select.value as any[]).some(item => item == value)) {
                                select.value.push(value);
                            } else {
                                select.value = select.value.filter(item => item != value);
                                if (select.placeholderIndex == index && select.value.length > 0) {
                                    select.placeholderIndex = select.data.indexOf(select.value[0]);
                                }
                                if (select.value.length == 0) {
                                    select.placeholderIndex = null;
                                }
                            }
                        }
                        if (select.value.length == 1) {
                            select.placeholderIndex = index;
                        }
                        console.log(select.placeholderIndex)
                        select.requestUpdate();
                        let event = new CustomEvent('change', {
                            detail: select.value
                        });
                        select.dispatchEvent(event);
                    }
                });
            });
      //  }
    }
}