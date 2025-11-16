/// <reference path="model/model.ts" />
/// <reference path="floorplanner/floorplanner.ts" />
/// <reference path="three/main.ts" />

module BP3D {
  /** Startup options. */
  export interface Options {
    /** Run in widget mode (no floorplanner) */
    widget?: boolean;

    /** Selector or element for Three.js canvas container */
    threeElement?: string;

    /** Selector or element for Three.js canvas */
    threeCanvasElement?: string;

    /** Selector or element for floorplanner canvas */
    floorplannerElement?: string;

    /** The texture directory. */
    textureDir?: string;
  }

  /** Blueprint3D core application. */
  export class Blueprint3d {
    private model: Model.Model;
    private three: Three.Main;
    private floorplanner?: Floorplanner.Floorplanner; // Optional: only created if not in widget mode

    /** Creates an instance.
     * @param options The initialization options.
     */
    constructor(private options: Options = {}) {
      // Default options
      const opts = {
        widget: false,
        threeElement: '#three',
        threeCanvasElement: '#three-canvas',
        floorplannerElement: '#floorplanner-canvas',
        textureDir: '',
        ...options
      };

      // Initialize model
      this.model = new Model.Model(opts.textureDir ?? '');

      // Initialize Three.js controller
      this.three = new Three.Main(
        this.model,
        opts.threeElement ?? '',
        opts.threeCanvasElement ?? '',
        {}
      );

      // Initialize floorplanner only if not in widget mode
      if (!opts.widget) {
        if (!opts.floorplannerElement) {
          throw new Error("floorplannerElement is required when widget mode is disabled.");
        }
        this.floorplanner = new Floorplanner.Floorplanner(
          opts.floorplannerElement,
          this.model.floorplan
        );
      } else {
        // Disable controls in widget mode
        this.three.getController().enabled = false;
      }
    }
  }
}