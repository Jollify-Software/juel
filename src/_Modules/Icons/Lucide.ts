/// <reference path="../../svg.d.ts" />
// Lucide line icons (https://lucide.dev, ISC licence: icons/lucide/LICENSE),
// inlined from the lucide-static devDependency as data URLs in the script, not
// on :root, so a page pays for them only in juel.js. Only the icons named here
// are bundled; add an import and an entry to use another.
// `<juel-button glyph="lucide-bold">` shows one (InputBase.getIconStyle).
import bold from 'data-url:lucide-static/icons/bold.svg';
import italic from 'data-url:lucide-static/icons/italic.svg';
import strikethrough from 'data-url:lucide-static/icons/strikethrough.svg';
import code from 'data-url:lucide-static/icons/code.svg';
import heading from 'data-url:lucide-static/icons/heading.svg';
import list from 'data-url:lucide-static/icons/list.svg';
import listOrdered from 'data-url:lucide-static/icons/list-ordered.svg';
import quote from 'data-url:lucide-static/icons/quote.svg';
import link from 'data-url:lucide-static/icons/link.svg';
import image from 'data-url:lucide-static/icons/image.svg';
import smile from 'data-url:lucide-static/icons/smile.svg';
import sparkles from 'data-url:lucide-static/icons/sparkles.svg';
import chevronDown from 'data-url:lucide-static/icons/chevron-down.svg';
import chevronRight from 'data-url:lucide-static/icons/chevron-right.svg';
import chevronLeft from 'data-url:lucide-static/icons/chevron-left.svg';
import move from 'data-url:lucide-static/icons/move.svg';
import locateFixed from 'data-url:lucide-static/icons/locate-fixed.svg';
import undo2 from 'data-url:lucide-static/icons/undo-2.svg';
import redo2 from 'data-url:lucide-static/icons/redo-2.svg';
import fileCode from 'data-url:lucide-static/icons/file-code.svg';
import type from 'data-url:lucide-static/icons/type.svg';
import zap from 'data-url:lucide-static/icons/zap.svg';
import palette from 'data-url:lucide-static/icons/palette.svg';
import arrowRightLeft from 'data-url:lucide-static/icons/arrow-right-left.svg';
import play from 'data-url:lucide-static/icons/play.svg';
import square from 'data-url:lucide-static/icons/square.svg';
import circle from 'data-url:lucide-static/icons/circle.svg';
import x from 'data-url:lucide-static/icons/x.svg';
import check from 'data-url:lucide-static/icons/check.svg';
import plus from 'data-url:lucide-static/icons/plus.svg';
import download from 'data-url:lucide-static/icons/download.svg';
import presentation from 'data-url:lucide-static/icons/presentation.svg';
import monitor from 'data-url:lucide-static/icons/monitor.svg';
import sun from 'data-url:lucide-static/icons/sun.svg';
import moon from 'data-url:lucide-static/icons/moon.svg';
import sunMoon from 'data-url:lucide-static/icons/sun-moon.svg';
import panelLeft from 'data-url:lucide-static/icons/panel-left.svg';
import panelRight from 'data-url:lucide-static/icons/panel-right.svg';
import settings from 'data-url:lucide-static/icons/settings.svg';
import folderOpen from 'data-url:lucide-static/icons/folder-open.svg';
import eyeOff from 'data-url:lucide-static/icons/eye-off.svg';
import copy from 'data-url:lucide-static/icons/copy.svg';
import trash2 from 'data-url:lucide-static/icons/trash-2.svg';
import gripVertical from 'data-url:lucide-static/icons/grip-vertical.svg';
import zoomIn from 'data-url:lucide-static/icons/zoom-in.svg';
import keyboard from 'data-url:lucide-static/icons/keyboard.svg';
import layoutTemplate from 'data-url:lucide-static/icons/layout-template.svg';
import ellipsis from 'data-url:lucide-static/icons/ellipsis.svg';
import textAlignStart from 'data-url:lucide-static/icons/text-align-start.svg';
import textAlignCenter from 'data-url:lucide-static/icons/text-align-center.svg';
import textAlignEnd from 'data-url:lucide-static/icons/text-align-end.svg';
import textAlignJustify from 'data-url:lucide-static/icons/text-align-justify.svg';
import caseUpper from 'data-url:lucide-static/icons/case-upper.svg';
import caseLower from 'data-url:lucide-static/icons/case-lower.svg';
import caseSensitive from 'data-url:lucide-static/icons/case-sensitive.svg';
import calculator from 'data-url:lucide-static/icons/calculator.svg';

export const LucideIcons: Record<string, string> = {
    'bold': bold,
    'italic': italic,
    'strikethrough': strikethrough,
    'code': code,
    'heading': heading,
    'list': list,
    'list-ordered': listOrdered,
    'quote': quote,
    'link': link,
    'image': image,
    'smile': smile,
    'sparkles': sparkles,
    'chevron-down': chevronDown,
    'chevron-right': chevronRight,
    'chevron-left': chevronLeft,
    'move': move,
    'locate-fixed': locateFixed,
    'undo-2': undo2,
    'redo-2': redo2,
    'file-code': fileCode,
    'type': type,
    'zap': zap,
    'palette': palette,
    'arrow-right-left': arrowRightLeft,
    'play': play,
    'square': square,
    'circle': circle,
    'x': x,
    'check': check,
    'plus': plus,
    'download': download,
    'presentation': presentation,
    'monitor': monitor,
    'sun': sun,
    'moon': moon,
    'sun-moon': sunMoon,
    'panel-left': panelLeft,
    'panel-right': panelRight,
    'settings': settings,
    'folder-open': folderOpen,
    'eye-off': eyeOff,
    'copy': copy,
    'trash-2': trash2,
    'grip-vertical': gripVertical,
    'zoom-in': zoomIn,
    'keyboard': keyboard,
    'layout-template': layoutTemplate,
    'ellipsis': ellipsis,
    'text-align-start': textAlignStart,
    'text-align-center': textAlignCenter,
    'text-align-end': textAlignEnd,
    'text-align-justify': textAlignJustify,
    'case-upper': caseUpper,
    'case-lower': caseLower,
    'case-sensitive': caseSensitive,
    'calculator': calculator,
};

/** The data URL of the Lucide icon for a `lucide-<name>` glyph, if bundled. */
export function lucideIcon(glyph: string): string | undefined {
    return glyph.startsWith('lucide-') ? LucideIcons[glyph.slice(7)] : undefined;
}
