import './Text/Text';
import './Email/Email';
import './Number/Number';
import './Check/Check';
import './Date/Date';

import './Select/Select';
import './CheckSelect/CheckSelect';

import './Colour/Colour';
import './Upload/Upload';

import './Form/Form';

import './PointSelector/PointSelector';

import './Style/Import';

import "./HtmlEditor/HtmlEditor";

import "./MarkdownEditor/MarkdownEditor";

import "./PlanEditor/PlanEditor";

import "./ShapeEditor/ShapeEditor";

import "./Handles/MoveHandle";
import "./Handles/RotateHandle";

import "./Theme/ThemeToggle";
import "./Theme/ThemeSelect";
import './IconPicker/IconPicker';

// The shape editor's reader and writer on `window.juel.shape`, for apps on the CDN build (the Jollify
// editor checks a file with the same code the element opens it with).
import { parseShapeSvg, sanitiseSvg } from './ShapeEditor/shapeSvg';
import { shapeToSvg } from './ShapeEditor/shapeModel';
const g = globalThis as any;
g.juel ??= {};
g.juel.shape = { parseShapeSvg, sanitiseSvg, shapeToSvg };
