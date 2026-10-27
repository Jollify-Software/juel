import "./Chart/Chart";
import "./Chart/ChartSeries";
import "./Timeline/Timeline";
import './Progress/Progress';
import './Progress/ProgressCircle';
import './Map/Map';
import './Map/MapMarker';
import './Map/MapJson';
import './Map/MapCircle';
import './Map/MapPoint';
import './Map/MapPolygon';
import './WordCloud/WordCloud';
import './Diagram/Diagram';

// The diagram model and layout on `window.juel.diagram`, for apps on the CDN build (the
// Jollify editor parses, validates and lays out diagram assets with the same code the
// element draws with).
import { diagramText, parseDiagram, starterDiagram } from './Diagram/diagramModel';
import { layoutDiagram } from './Diagram/diagramLayout';
const g = globalThis as any;
g.juel ??= {};
g.juel.diagram = { parseDiagram, diagramText, starterDiagram, layoutDiagram };
