import { JuelDockContainer } from "./DockContainer";
import Styles from "bundle-text:./DockContainer.less";
import interact from "@interactjs/interactjs";

//import interact from "interactjs";

export class DockContainerService {

    constructor(private element: JuelDockContainer) {
        if (!('interact' in window)) {
            window['interact'] = interact;
            }
    }

    appendStyles() {
      let s = document.createElement('style');
      s.id = "dock-styles";
      s.textContent = Styles;
      document.head.append(s);
    }

    createDropZone() {
      let dz = $('<div id="droppable-container"/>').append(
        $('<div class="north"></div>'),
        $('<div class="south"></div>'),
        $('<div class="east"></div>'),
        $('<div class="west"></div>')
      );
      document.body.append(dz[0]);
      return dz;
    }

    init() {
      this.appendStyles();
        let draggableContainer = $(this.element);
        console.log(draggableContainer[0].children)
        let droppableContainer = this.createDropZone();
        var startPos = null;
        
        interact(draggableContainer[0]).draggable({
            allowFrom: '.handle',
            restrict: {
              restriction: 'parent'
            },
            snap: {
              targets: [startPos],
              range: Infinity,
              relativePoints: [{ x: 0.5, y: 0.5 }],
              endOnly: true
            },
            onstart: function (event) {
              droppableContainer.css('display', 'block');
              var rect = interact.getElementRect(event.target);
      
              // record center point when starting the very first a drag
              startPos = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
              }
              draggableContainer[0].dataset.x = rect.left;
              draggableContainer[0].dataset.y = rect.top;

              event.interactable.draggable({
                snap: {
                  targets: [startPos]
                }
              });
            },
            // call this function on every dragmove event
            onmove: function (event) {
              var target = event.target,
                // keep the dragged position in the data-x/data-y attributes
                x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
      
              // translate the element
              target.style.top = `${y}px`;
                target.style.left =`${x}px`;
      
              // update the posiion attributes
              target.setAttribute('data-x', x);
              target.setAttribute('data-y', y);
              target.classList.add('getting--dragged');
            },
            onend: function (event) {
              droppableContainer.css('display', 'none');
              event.target.classList.remove('getting--dragged')
            }
          });
      
          interact("#droppable-container div").dropzone({
            accept: 'juel-dock-container',
            overlap: 0.1,

            ondropactivate: function (event) {
              event.target.classList.add('can--drop');
            },
            ondragenter: function (event) {
                
              var draggableElement = event.relatedTarget as HTMLElement;
              let dropzoneElement = event.target as HTMLElement;
              draggableElement.className = "";
              console.log(dropzoneElement.className)
              console.log(dropzoneElement.classList[0])
              draggableElement.classList.add(dropzoneElement.classList[0])
              let dropRect = interact.getElementRect(dropzoneElement);
              if (!dropRect) {
                return;
              }
              let dropCenter = {
                x: dropRect.left + dropRect.width / 2,
                y: dropRect.top + dropRect.height / 2
              };
      
              event.draggable.draggable({
                snap: {
                  targets: [dropCenter]
                }
              });
      
              //dropzoneElement.classList.add('can--catch');
              //draggableElement.classList.add('drop--me');
              
            },
            ondragleave: function (event) {
              event.target.classList.remove('can--catch', 'caught--it');
              event.relatedTarget.classList.remove('drop--me');
            },
            ondrop: function (event) {
              event.target.classList.add('caught--it');
            },
            ondropdeactivate: function (event) {
              event.target.classList.remove('can--drop');
              event.target.classList.remove('can--catch');
            }
          });
    }
}