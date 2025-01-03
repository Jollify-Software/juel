import Quill from 'quill';
import { bind } from '../../_Utils/Bind';

interface EditorConfig {
  theme: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelectionChange: (element: HTMLElement | null) => void;
}

export class HtmlEditorService {
  quill: Quill;
  selectedElement: HTMLElement | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isDragging: boolean = false;
  private isRotating: boolean = false;
  private initialRotation: number = 0;
  private rotationButton: HTMLButtonElement | null = null;

  initializeQuill(
    container: HTMLDivElement,
    config: EditorConfig
  ): Quill {
    this.quill = new Quill(container, {
      theme: config.theme,
      modules: {
        toolbar: {
          container: [
            [{ 'drag-button': 'drag' }, { 'rotate-button': 'rotate' }], // Add custom drag and rotate buttons
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['link', 'image'],
            [{ list: 'ordered' }, { list: 'bullet' }]
          ]
        },
      },
    });

    container.querySelector('button.ql-drag-button')?.addEventListener('mousedown', this.prepareDrag);
    this.rotationButton = container.querySelector('button.ql-rotate-button');
    this.rotationButton.addEventListener('mousedown', this.prepareRotate);

    this.quill.root.innerHTML = config.value;

    this.quill.on('text-change', () => {
      config.onValueChange(this.quill.root.innerHTML);
    });

    this.quill.on('selection-change', (range) => {
      if (range && range.length > 0) {
        const [leaf] = this.quill.getLeaf(range.index);
        console.log(leaf);
        const domNode = leaf && leaf.domNode;
        if (domNode instanceof HTMLElement) {
          this.selectedElement = domNode;
        } else if (domNode && domNode.parentElement) {
          this.selectedElement = domNode.parentElement;
        } else {
          this.selectedElement = null;
        }
      } else {
        this.selectedElement = null;
      }
      config.onSelectionChange(this.selectedElement);
    });

    // Add global listeners for drag and rotate events
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.endInteractions);

    return this.quill;
  }

  @bind
  prepareDrag(event: MouseEvent): void {
    if (!this.selectedElement || !(this.selectedElement instanceof HTMLElement)) {
      console.warn('Selected element is not valid.');
      return;
    }

    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    if (!this.selectedElement.dataset.x) {
      this.selectedElement.dataset.x = '0';
    }
    if (!this.selectedElement.dataset.y) {
      this.selectedElement.dataset.y = '0';
    }
    this.isDragging = true;
  }

  @bind
  prepareRotate(event: MouseEvent): void {
    if (!this.selectedElement || !(this.selectedElement instanceof HTMLElement)) {
      console.warn('Selected element is not valid.');
      return;
    }

    if (!this.selectedElement.dataset.x) {
      this.selectedElement.dataset.x = '0';
    }
    if (!this.selectedElement.dataset.y) {
      this.selectedElement.dataset.y = '0';
    }

    const style = window.getComputedStyle(this.selectedElement);
    const matrix = new DOMMatrix(style.transform);
    this.initialRotation = Math.atan2(matrix.m21, matrix.m11) * (180 / Math.PI);

    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    this.isRotating = true;
  }

  @bind
  handleMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.selectedElement) {
      let x = parseFloat(this.selectedElement.dataset.x || '0');
      let y = parseFloat(this.selectedElement.dataset.y || '0');

      const dx = event.clientX - this.mouseX;
      const dy = event.clientY - this.mouseY;

      x += dx;
      y += dy;

      this.mouseX = event.clientX;
      this.mouseY = event.clientY;

      this.selectedElement.dataset.x = x.toString();
      this.selectedElement.dataset.y = y.toString();

      const rotation = parseFloat(this.selectedElement.dataset.rotation || '0');
      this.selectedElement.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    } else if (this.isRotating && this.selectedElement) {
      const x = parseFloat(this.selectedElement.dataset.x || '0');
      const y = parseFloat(this.selectedElement.dataset.y || '0');

      const bb = this.rotationButton.getBoundingClientRect();
      const centerX = this.rotationButton.offsetLeft + this.rotationButton.offsetWidth / 2;
      const centerY = this.rotationButton.offsetTop + this.rotationButton.offsetHeight / 2;

      const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
      console.log(this.initialRotation);
      const rotation = (angle - 90) + this.initialRotation;

      this.selectedElement.dataset.rotation = rotation.toString();
      this.selectedElement.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    }
  }

  @bind
  endInteractions(): void {
    this.isDragging = false;
    this.isRotating = false;
  }

  cleanupQuill(quill: Quill) {
    if (quill) {
      quill.off('text-change');
      quill.off('selection-change');
    }
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.endInteractions);
  }
}
