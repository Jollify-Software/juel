import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { JuelList } from "./List";

export class ListService {
  
  init(list: JuelList) {

    let children = list.children;

    // If select has no data
    if (!list.data) {
    list.data = (Array.prototype.slice.call(children) as HTMLElement[]).filter(el => el.classList.contains("juel-item"))
      .map(el => el.textContent.trim());
    }
    console.log(list.data)
    list.selected = [];

    /*
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById('myInput');
    filter = input.value.toUpperCase();
    ul = document.getElementById("myUL");
    li = ul.getElementsByTagName('li');

    // Loop through all list items, and hide those who don't match the search query
    for (i = 0; i < li.length; i++) {
      a = li[i].getElementsByTagName("a")[0];
      txtValue = a.textContent || a.innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        li[i].style.display = "";
      } else {
        li[i].style.display = "none";
      }
    }
    */

    list.shadowRoot.querySelectorAll('.item').forEach((el: HTMLElement) => {
      $(el).off("click").on('click', function (event) {
        let slot = el.querySelector('slot').getAttribute('name');
        let item: HTMLElement = list.querySelector(`[slot="${slot}"]`);
        if (item) {
          let value = list.data[parseInt(el.dataset.index)];
          if (el.classList.contains("selected")) {
            
              list.selected = list.selected.filter(val => val != value);

              let evt = new CustomEvent<ChangedEventArgs>('deselected', {
                detail: {
                  index: parseInt(el.dataset.index),
                  value: value
                }
              });
              list.dispatchEvent(evt);
            // TODO: Throw event deselect
          } else {
            if (list.multi) {
              list.selected.push(value);
            } else {
              list.selected = [ value ];
              $(el).siblings().each(function(index, ele) {
                ele.classList.remove("selected");
              })
            }
            let evt = new CustomEvent<ChangedEventArgs>('selected', {
              detail: {
                index: parseInt(el.dataset.index),
                value: value
              }
            });
            list.dispatchEvent(evt);
            // TODO: Throw event select
          }
          el.classList.toggle('selected');
        }
      });
    });
  }
}