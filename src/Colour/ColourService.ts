import Pickr from '@simonwep/pickr';

export class ColourService {

  pickr: Pickr;

    init(parent: ShadowRoot, value: string, onChange: (colour: Pickr.HSVaColor, instance: Pickr) => void) {
        let ele = parent.querySelector('#pickr') as HTMLElement;

        //
        this.pickr = new Pickr({
          el: ele,
          container: parent.firstElementChild as HTMLElement,
          theme: "nano",
          swatches: null,
          defaultRepresentation: "HEXA",
          default: value,
          comparison: false,
          components: {
            preview: true,
            opacity: true,
            hue: true,
            interaction: {
              hex: true,
              rgba: true,
              hsva: false,
              input: true,
              clear: false
            }
          }
        });
        this.pickr.on('change', onChange);
        /*
        pickr
          .on("clear", function(instance) {
            //console.log("clear");
            //$input.val("").trigger("change");
            // TODO: Remeve the css property
          })
          .on("cancel", function(instance) {
            current_color = instance
              .getSelectedColor()
              .toHEXA()
              .toString();
            //console.log("cancel", current_color);
            $input.val(current_color).trigger("change");
          })
          .on("change", function(color,instance) {
            current_color = color
              .toHEXA()
              .toString();
            //console.log("change", current_color);
            $input.val(current_color).trigger("change");
          });*/
    }
}