import { getDegreePos, numberToString, pointToString } from "../_Core/MathUtils";
import { MenuItem } from "../_Core/MenuItem";
import { RadialMenuArgs } from "./RadialMenuArgs";

export class RadialMenuService {

    DEFAULT_SIZE = 100;
    MIN_SECTORS = 6;

    parent: HTMLElement;

    size: number = this.DEFAULT_SIZE;
    onClick: (item: MenuItem) => void = null;
    menuItems: MenuItem[];

    radius: number = 50;
    innerRadius: number = this.radius * 0.4;
    sectorSpace: number = this.radius * 0.06;
    sectorCount: number;// = Math.max(this.menuItems.length, this.MIN_SECTORS);
    closeOnClick: boolean = false;

    scale: number = 1;
    holder: HTMLElement = null;
    parentMenu = [];
    parentItems = [];
    levelItems = null;

    currentMenu;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    constructor(args: RadialMenuArgs) {
        var self = this;

        if (args.onClick) {
            let click = args.onClick;
            args.onClick = (item) => {
                if (item.action) {
                    item.action();
                }
                click(item);
            }
        }
        self.parent = args.parent || null;

        self.size = args.size || this.DEFAULT_SIZE;
        self.onClick = args.onClick || null;
        self.menuItems = args.menuItems ? args.menuItems : null;

        self.radius = 50;
        self.innerRadius = self.radius * 0.4;
        self.sectorSpace = self.radius * 0.06;
        self.sectorCount = Math.max(self.menuItems.length, this.MIN_SECTORS);
        self.closeOnClick = args.closeOnClick !== undefined ? !!args.closeOnClick : false;

        self.scale = 1;
        self.holder = null;
        self.parentMenu = [];
        self.parentItems = [];
        self.levelItems = null;

        self.createHolder();
        self.addIconSymbols();

        self.currentMenu = null;
        document.addEventListener('wheel', self.onMouseWheel.bind(self));
        document.addEventListener('keydown', self.onKeyDown.bind(self));

        console.log(args);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    open(ele?: HTMLElement) {
        this.parent.style.display = "block";
        var self = this;
        
        if (!self.currentMenu) {
            let items = self.menuItems;

            if (ele) {
                items = items.filter(i => i.selector ? ele.matches(i.selector) : true);
            } else {
                items = items.filter(i => !i.selector)
            }
            self.currentMenu = self.createMenu('menu inner', items);
            console.log(self.currentMenu)
            self.holder.appendChild(self.currentMenu);

            // wait DOM commands to apply and then set class to allow transition to take effect
            this.nextTick(function () {
                self.currentMenu.setAttribute('class', 'menu');
            });
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    close() {
        var self = this;

        if (self.currentMenu) {
            var parentMenu;
            while (parentMenu = self.parentMenu.pop()) {
                parentMenu.remove();
            }
            self.parentItems = [];

            this.setClassAndWaitForTransition(self.currentMenu, 'menu inner').then(function () {
                self.currentMenu.remove();
                self.currentMenu = null;
                self.parent.style.display = "none";
            });
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    getParentMenu() {
        var self = this;
        if (self.parentMenu.length > 0) {
            return self.parentMenu[self.parentMenu.length - 1];
        } else {
            return null;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    createHolder() {
        var self = this;

        self.holder = document.createElement('div');
        self.holder.className = 'menuHolder';
        self.holder.style.width = self.size + 'px';
        self.holder.style.height = self.size + 'px';

        self.parent.shadowRoot.appendChild(self.holder);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    showNestedMenu(item) {
        var self = this;
        self.parentMenu.push(self.currentMenu);
        self.parentItems.push(self.levelItems);
        self.currentMenu = self.createMenu('menu inner', item.items, true);
        self.holder.appendChild(self.currentMenu);

        // wait DOM commands to apply and then set class to allow transition to take effect
        this.nextTick(function () {
            self.getParentMenu().setAttribute('class', 'menu outer');
            self.currentMenu.setAttribute('class', 'menu');
        });
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    returnToParentMenu() {
        var self = this;
        self.getParentMenu().setAttribute('class', 'menu');
        this.setClassAndWaitForTransition(self.currentMenu, 'menu inner').then(function () {
            self.currentMenu.remove();
            self.currentMenu = self.parentMenu.pop();
            self.levelItems = self.parentItems.pop();
        });
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    handleClick() {
        var self = this;

        var selectedIndex = self.getSelectedIndex();
        if (selectedIndex >= 0) {
            var item = self.levelItems[selectedIndex];
            if (item.items) {
                self.showNestedMenu(item);
            } else {
                if (self.onClick) {
                    self.onClick(item);
                    if (self.closeOnClick) {
                        self.close();
                    }
                }
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    handleCenterClick() {
        var self = this;
        if (self.parentItems.length > 0) {
            self.returnToParentMenu();
        } else {
            self.close();
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    createCenter = function (svg, title, icon, size) {
        var self = this;
        size = size || 8;
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'center');

        var centerCircle = self.createCircle(0, 0, self.innerRadius - self.sectorSpace / 3);
        g.appendChild(centerCircle);
        if (text) {
            var text = self.createText(0, 0, title);
            g.appendChild(text);
        }

        if (icon) {
            var use = self.createUseTag(0, 0, icon);
            use.setAttribute('width', size);
            use.setAttribute('height', size);
            use.setAttribute('transform', 'translate(-' + numberToString(size / 2) + ',-' + numberToString(size / 2) + ')');
            g.appendChild(use);
        }

        svg.appendChild(g);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    getIndexOffset(): number {
        var self = this;
        if (self.levelItems.length < self.sectorCount) {
            switch (self.levelItems.length) {
                case 1:
                    return -2;
                case 2:
                    return -2;
                case 3:
                    return -2;
                default:
                    return -1;
            }
        } else {
            return -1;
        }

    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    createMenu(classValue, levelItems, nested?) {
        var self = this;

        self.levelItems = levelItems;

        self.sectorCount = Math.max(self.levelItems.length, this.MIN_SECTORS);
        self.scale = self.calcScale();

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', classValue);
        svg.setAttribute('viewBox', '-50 -50 100 100');
        svg.setAttribute('width', self.size.toString());
        svg.setAttribute('height', self.size.toString());

        var angleStep = 360 / self.sectorCount;
        var angleShift = angleStep / 2 + 270;

        var indexOffset = self.getIndexOffset();

        for (var i = 0; i < self.sectorCount; ++i) {
            var startAngle = angleShift + angleStep * i;
            var endAngle = angleShift + angleStep * (i + 1);

            var itemIndex = this.resolveLoopIndex(self.sectorCount - i + indexOffset, self.sectorCount);
            var item;
            if (itemIndex >= 0 && itemIndex < self.levelItems.length) {
                item = self.levelItems[itemIndex];
            } else {
                item = null;
            }

            self.appendSectorPath(startAngle, endAngle, svg, item, itemIndex);
        }

        if (nested) {
            self.createCenter(svg, 'Close', '#return', 8);
        } else {
            self.createCenter(svg, 'Close', '#close', 7);
        }

        svg.addEventListener('mousedown', function (event: MouseEvent) {
            let target = event.target as HTMLElement;
            var className = target.parentElement.getAttribute('class').split(' ')[0];
            switch (className) {
                case 'sector':
                    var index = parseInt(target.parentElement.getAttribute('data-index'));
                    if (!isNaN(index)) {
                        self.setSelectedIndex(index);
                    }
                    break;
                default:
            }
        });

        svg.addEventListener('click', function (event: MouseEvent) {
            let target = event.target as HTMLElement;
            var className = target.parentElement.getAttribute('class').split(' ')[0];
            switch (className) {
                case 'sector':
                    self.handleClick();
                    break;
                case 'center':
                    self.handleCenterClick();
                    break;
                default:
            }
        });
        return svg;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    selectDelta = function (indexDelta: number) {
        var self = this;
        var selectedIndex = self.getSelectedIndex();
        if (selectedIndex < 0) {
            selectedIndex = 0;
        }
        selectedIndex += indexDelta;

        if (selectedIndex < 0) {
            selectedIndex = self.levelItems.length + selectedIndex;
        } else if (selectedIndex >= self.levelItems.length) {
            selectedIndex -= self.levelItems.length;
        }
        self.setSelectedIndex(selectedIndex);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    onKeyDown(event: KeyboardEvent) {
        var self = this;
        if (self.currentMenu) {
            switch (event.key) {
                case 'Escape':
                case 'Backspace':
                    self.handleCenterClick();
                    event.preventDefault();
                    break;
                case 'Enter':
                    self.handleClick();
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                case 'ArrowUp':
                    self.selectDelta(1);
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'ArrowDown':
                    self.selectDelta(-1);
                    event.preventDefault();
                    break;
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    onMouseWheel(event: WheelEvent) {
        var self = this;
        if (self.currentMenu) {
            var delta = -event.deltaY;

            if (delta > 0) {
                self.selectDelta(1)
            } else {
                self.selectDelta(-1)
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    getSelectedNode() {
        var self = this;
        var items = self.currentMenu.getElementsByClassName('selected');
        if (items.length > 0) {
            return items[0];
        } else {
            return null;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    getSelectedIndex(): number {
        var self = this;
        var selectedNode = self.getSelectedNode();
        if (selectedNode) {
            return parseInt(selectedNode.getAttribute('data-index'));
        } else {
            return -1;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    setSelectedIndex(index: number) {
        var self = this;
        if (index >= 0 && index < self.levelItems.length) {
            var items = self.currentMenu.querySelectorAll('g[data-index="' + index + '"]');
            if (items.length > 0) {
                var itemToSelect = items[0];
                var selectedNode = self.getSelectedNode();
                if (selectedNode) {
                    selectedNode.setAttribute('class', 'sector');
                }
                itemToSelect.setAttribute('class', 'sector selected');
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    createUseTag(x: number, y: number, link: string) {
        var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('x', numberToString(x));
        use.setAttribute('y', numberToString(y));
        use.setAttribute('width', '10');
        use.setAttribute('height', '10');
        use.setAttribute('fill', 'white');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', link);
        return use;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    appendSectorPath(startAngleDeg: number, endAngleDeg: number, svg: SVGElement, item: MenuItem, index: number) {
        var self = this;

        var centerPoint = self.getSectorCenter(startAngleDeg, endAngleDeg);
        var translate = {
            x: numberToString((1 - self.scale) * centerPoint.x),
            y: numberToString((1 - self.scale) * centerPoint.y)
        };

        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', 'translate(' + translate.x + ' ,' + translate.y + ') scale(' + self.scale + ')');

        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', self.createSectorCmds(startAngleDeg, endAngleDeg));
        g.appendChild(path);

        if (item) {
            g.setAttribute('class', 'sector');
            if (index == 0) {
                g.setAttribute('class', 'sector selected');
            }
            g.setAttribute('data-id', item.id);
            g.setAttribute('data-index', index.toString());

            if (item.name) {
                var text = self.createText(centerPoint.x, centerPoint.y, item.name);
                if (item.icon) {
                    text.setAttribute('transform', 'translate(0,8)');
                } else {
                    text.setAttribute('transform', 'translate(0,2)');
                }

                g.appendChild(text);
            }

            if (item.icon) {
                var use = self.createUseTag(centerPoint.x, centerPoint.y, item.icon);
                if (item.name) {
                    use.setAttribute('transform', 'translate(-5,-8)');
                } else {
                    use.setAttribute('transform', 'translate(-5,-5)');
                }

                g.appendChild(use);
            }

        } else {
            g.setAttribute('class', 'dummy');
        }

        svg.appendChild(g);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    createSectorCmds(startAngleDeg: number, endAngleDeg: number) {
        var self = this;

        var initPoint = getDegreePos(startAngleDeg, self.radius);
        var path = 'M' + pointToString(initPoint);

        var radiusAfterScale = self.radius * (1 / self.scale);
        path += `A${radiusAfterScale} ${radiusAfterScale} 0 0 0${pointToString(getDegreePos(endAngleDeg, self.radius))}`;
        path += `L${pointToString(getDegreePos(endAngleDeg, self.innerRadius))}`;

        var radiusDiff = self.radius - self.innerRadius;
        var radiusDelta = (radiusDiff - (radiusDiff * self.scale)) / 2;
        var innerRadius = (self.innerRadius + radiusDelta) * (1 / self.scale);
        path += `A${innerRadius} ${innerRadius} 0 0 1 ${pointToString(getDegreePos(startAngleDeg, self.innerRadius))}`;
        path += 'Z';

        return path;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    createText = function (x: number, y: number, title: string) {
        var self = this;
        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('x', numberToString(x));
        text.setAttribute('y', numberToString(y));
        text.setAttribute('font-size', '38%');
        text.innerHTML = title;
        return text;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    createCircle(x: number, y: number, r: number) {
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', numberToString(x));
        circle.setAttribute('cy', numberToString(y));
        circle.setAttribute('r', numberToString(r));
        return circle;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    calcScale() {
        var self = this;
        var totalSpace = self.sectorSpace * self.sectorCount;
        var circleLength = Math.PI * 2 * self.radius;
        var radiusDelta = self.radius - (circleLength - totalSpace) / (Math.PI * 2);
        return (self.radius - radiusDelta) / self.radius;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    getSectorCenter(startAngleDeg: number, endAngleDeg: number) {
        var self = this;
        return getDegreePos((startAngleDeg + endAngleDeg) / 2, self.innerRadius + (self.radius - self.innerRadius) / 2);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    addIconSymbols() {
        var self = this;
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icons');

        let icons = self.parent.querySelector('svg');
        if (icons) {
            svg.innerHTML = icons.innerHTML;
        }

        // return
        var returnSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
        returnSymbol.setAttribute('id', 'return');
        returnSymbol.setAttribute('viewBox', '0 0 489.394 489.394');
        var returnPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        returnPath.setAttribute('d', "M375.789,92.867H166.864l17.507-42.795c3.724-9.132,1-19.574-6.691-25.744c-7.701-6.166-18.538-6.508-26.639-0.879" +
            "L9.574,121.71c-6.197,4.304-9.795,11.457-9.563,18.995c0.231,7.533,4.261,14.446,10.71,18.359l147.925,89.823" +
            "c8.417,5.108,19.18,4.093,26.481-2.499c7.312-6.591,9.427-17.312,5.219-26.202l-19.443-41.132h204.886" +
            "c15.119,0,27.418,12.536,27.418,27.654v149.852c0,15.118-12.299,27.19-27.418,27.19h-226.74c-20.226,0-36.623,16.396-36.623,36.622" +
            "v12.942c0,20.228,16.397,36.624,36.623,36.624h226.74c62.642,0,113.604-50.732,113.604-113.379V206.709" +
            "C489.395,144.062,438.431,92.867,375.789,92.867z");
        returnSymbol.appendChild(returnPath);
        svg.appendChild(returnSymbol);

        var closeSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
        closeSymbol.setAttribute('id', 'close');
        closeSymbol.setAttribute('viewBox', '0 0 41.756 41.756');

        var closePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        closePath.setAttribute('d', "M27.948,20.878L40.291,8.536c1.953-1.953,1.953-5.119,0-7.071c-1.951-1.952-5.119-1.952-7.07,0L20.878,13.809L8.535,1.465" +
            "c-1.951-1.952-5.119-1.952-7.07,0c-1.953,1.953-1.953,5.119,0,7.071l12.342,12.342L1.465,33.22c-1.953,1.953-1.953,5.119,0,7.071" +
            "C2.44,41.268,3.721,41.755,5,41.755c1.278,0,2.56-0.487,3.535-1.464l12.343-12.342l12.343,12.343" +
            "c0.976,0.977,2.256,1.464,3.535,1.464s2.56-0.487,3.535-1.464c1.953-1.953,1.953-5.119,0-7.071L27.948,20.878z");
        closeSymbol.appendChild(closePath);
        svg.appendChild(closeSymbol);

        self.holder.appendChild(svg);
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    resolveLoopIndex(index, length) {
        if (index < 0) {
            index = length + index;
        }
        if (index >= length) {
            index = index - length;
        }
        if (index < length) {
            return index;
        } else {
            return null;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    setClassAndWaitForTransition(node, newClass) {
        return new Promise(function (resolve) {
            function handler(event) {
                if (event.target == node && event.propertyName == 'visibility') {
                    node.removeEventListener('transitionend', handler);
                    resolve();
                }
            }
            node.addEventListener('transitionend', handler);
            node.setAttribute('class', newClass);
        });
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    nextTick(fn) {
        setTimeout(fn, 10);
    };
}