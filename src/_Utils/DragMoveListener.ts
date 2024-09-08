export function DragMoveListener (event) {
    var target = $(event.target);
    // keep the dragged position in the data-x/data-y attributes
    var x = (parseFloat(target.data('x')) || 0) + event.dx;
    var y = (parseFloat(target.data('y')) || 0) + event.dy;
  
    // translate the element
    target.css('transform', `translate(${x}px, ${y}px)`);
  
    // update the posiion attributes
    target.data('x', x);
    target.data('y', y);
  }
  export function DragMoveListener2(absolute: boolean) {
    return (event) => {
    var target = $(event.target);
    // keep the dragged position in the data-x/data-y attributes
    let x: number, y:number;
    if (absolute) {
      let leftRight = target.position();
      x = (parseFloat(target.data('x')) || leftRight.left) + event.dx;
      y = (parseFloat(target.data('y')) || leftRight.top) + event.dy;  
    } else {
    x = (parseFloat(target.data('x')) || 0) + event.dx;
    y = (parseFloat(target.data('y')) || 0) + event.dy;
    }

    if (absolute) {
      target.css('left', `${x}px`);
      target.css('top', `${y}px`);
    } else {
    // translate the element
    target.css('transform', `translate(${x}px, ${y}px)`);
    }
  
    // update the posiion attributes
    target.data('x', x);
    target.data('y', y);
  }
}