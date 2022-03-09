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
  