import { Parallax } from "./Parallax";

export class ParallaxService {

    ele: Parallax;

    points = new Array();
    currentPos = 0;
    pointTimer;

    speedX = 0;
    speedY = 0;
    origin;
    posX = 0;
    posY = 0;
    width;
    height;

    updater;
    control: JQuery<HTMLElement>;
    children: JQuery<HTMLElement>;
    childPos = new Array();

    constructor(ele: Parallax) {
        this.ele = ele;
    }

    normilise() {
        this.children.each((index, element) => {
            var child = $(element);
            var p = child.position();
            this.childPos.push({
                left : this.control.position().left - p.left,
                top : this.control.position().top - p.top
            });
            child.css({
                left : this.control.position().left - p.left,
                top : this.control.position().top - p.top
            });
        });
    }

    speedFromPosition(position, lastPosition?) {

        var halfWidth = this.origin.left + this.control.outerWidth() / 2;
        var halfHeight = this.origin.top + this.control.outerHeight() / 2;
        if(this.ele.control != "mouse" && this.ele.control != "auto") {
            var con = $(this.ele.control);
            halfWidth = con.position().left + con.outerWidth() / 2
            halfHeight = con.position().top + con.height() / 2;
        }

        if(!lastPosition) {
            this.speedX = position.x - halfWidth;
            this.speedX /= halfWidth;
        } else {
            this.speedX = position.x - lastPosition.x;
            this.speedX /= halfWidth;
        }

        if(!lastPosition) {
            this.speedY = position.y - halfHeight;
            this.speedY /= halfHeight;
        } else {
            this.speedY = position.y - lastPosition.y;
            this.speedY /= halfHeight;
        }
    }

    updatePosition() {
        var remPosX = this.posX;
        var remPosY = this.posY;
        this.posX += (this.speedX * this.ele.spacing);
        this.posY += (this.speedY * this.ele.spacing);

        for(let i = this.children.length - 1; i >= 0; i--) {
            if(i == this.ele.limitIndex) {
                var remXSpeed = this.speedX;
                var remYSpeed = this.speedY;

                if(this.ele.limit == "xy" || this.ele.limit == "x") {
                    if((this.posX * i) < -(this.control.outerWidth() / 2)) {
                        this.posX = remPosX;
                    } else if((this.posX * i) > (this.control.outerWidth() / 2)) {
                        this.posX = remPosX;
                    }
                }
                if(this.ele.limit == "xy" || this.ele.limit == "y") {
                    if((this.posY * i) < -(this.control.outerHeight()) / 2) {
                        this.posY = remPosY;
                    } else if((this.posY * i) > (this.control.outerHeight() / 2)) {
                        this.posY = remPosY;
                    }
                }
            }

            var child = $(this.children.get(i));
            var newX = this.childPos[i].left + (this.posX * i);
            var newY = this.childPos[i].top + (this.posY * i);

            child.css({
                left : newX,
                top : newY
            });
        }
    }

    setOrigin() {
        this.origin = this.control.position();
    }

    // TODO: Create strategies for these
    loadPattern(patsy) {
        this.points = new Array();

        if($.isArray(patsy)) {
            for(let p in patsy) {
                var pat = patsy[p];

                this.points.push({
                    x : this.origin.left + pat.X,
                    y : this.origin.top + pat.Y
                });
            }
        } else if( patsy = "bounds") {
            this.points.push({
                x : this.origin.left,
                y : this.origin.top
            });
            this.points.push({
                x : this.origin.left + this.width,
                y : this.origin.top
            });
            this.points.push({
                x : this.origin.left + this.width,
                y : this.origin.top + this.height
            });
            this.points.push({
                x : this.origin.left,
                y : this.origin.top + this.height
            });
        }
    }

    start() {
        if(!this.updater)
            this.updater = setInterval(() => this.updatePosition(), 10);

        if(this.ele.control == "auto") {
            let lastPosition = {
                x : this.origin.left + (this.width / 2),
                y : this.origin.top + (this.height / 2)
            };
            this.pointTimer = setInterval(() => {
                var lastPos = this.currentPos - 1;
                if(lastPos < 0)
                    lastPos = this.points.length - 1;
                this.speedFromPosition(
                    this.points[this.currentPos], lastPosition ||
                    this.points[lastPos]);
                if(lastPosition)
                    lastPosition = undefined;
                this.currentPos++;
                if(this.currentPos >= this.points.length)
                    this.currentPos = 0;

                if(this.ele.snap) {
                    this.posX = 0;
                    this.posY = 0;
                }
            }, this.ele.interval);
        }
    }

    stop() {
        this.speedX = 0;
        this.speedY = 0;

        if(this.updater) {
            clearInterval(this.updater);
            this.updater = undefined;
        }
        if(this.pointTimer) {
            clearInterval(this.pointTimer);
            this.pointTimer = undefined;
        }
    }

    init() {
        let $ele = $(this.ele);
        this.control = $ele;
        this.origin = $ele.position();
        this.width = $ele.width();
        this.height = $ele.height();
        this.children = $ele.children();
        console.log(this.children)
        if (!this.ele.limitIndex) {
            this.ele.limitIndex = this.children.length - 1;
        }
        this.children.css({
            position : "relative",
            width: this.ele.width,
            height: this.ele.height
        });
        

        if(this.ele.control == "mouse") {
			$ele.bind("mouseenter", () => {
                //control.Start();
                this.start();
			});
			$ele.bind("mousemove", (e) => {
				this.speedFromPosition({
					x : e.pageX,
					y : e.pageY
				});

			});
			$ele.bind('mouseleave', (e) => {
                //control.Stop();
                this.stop();
			});
		} else if(this.ele.control == "auto") {
			this.loadPattern(this.ele.patten);
            //control.Start();
            this.start();
		} else {
			$(this.ele.control).bind("mouseenter", () => {
                //control.Start();
                this.start();
			});
			$(this.ele.control).bind("mousemove", (e) => {
				this.speedFromPosition({
					x : e.pageX,
					y : e.pageY
				});
			});
			$(this.ele.control).bind('mouseleave', (e) => {
                //control.Stop();
                this.stop();
			});
		}

		$ele.bind("resize", () => {
			this.setOrigin();
			this.loadPattern(this.ele.patten);
			this.normilise();
		});
		this.normilise();
    }
}