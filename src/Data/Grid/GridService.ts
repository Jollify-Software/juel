import { Dispatch } from "../../../juel/src/_Core/DispatchFunction";
import { ChangedEventArgs } from "../../../juel/src/_Core/Events/ChangedEventArgs";
import { EventNames } from "../../../juel/src/_Core/Events/EventNames";
import { JuelGrid } from "./Grid";

export class GridService {

  init(list: JuelGrid) {

    let children = list.children;

    // If select has no data
    if (!list.data) {
      list.data = (Array.prototype.slice.call(children) as HTMLElement[]).filter(el => el.classList.contains("juel-item"))
        .map(el => el.textContent.trim());
    }
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
        let index = parseInt(el.dataset.index);
        if (el.classList.contains("selected")) {
          $(el).find(".juel-appear").hide("slow");
          let value: any;
          if (list.data && list.data.length >= index) {
            value = list.data[index];
          }
          let args: ChangedEventArgs = {
            index: index,
            value: value
          };
          Dispatch(list, EventNames.Deselected, args);
        } else {

          // $(el).siblings().each(function (index, ele) {
          //   ele.classList.remove("selected");
          //   let slEl = ele.querySelector('slot')
          //   if (slEl) {
          //     let sl = slEl.getAttribute('name');
          //   let itm: HTMLElement = list.querySelector(`[slot="${sl}"]`);
          //   $(itm).find(".juel-appear").hide("slow");
          //   }
          // })

          let value: any;
          if (list.data && list.data.length >= index) {
            value = list.data[index];
          }
          $(el).find(".juel-appear").show("slow");
          let args: ChangedEventArgs = {
            index: index,
            value: value
          };
          Dispatch(list, EventNames.Selected, args);
        }
        el.classList.toggle('selected');
      });
    });
  }
}